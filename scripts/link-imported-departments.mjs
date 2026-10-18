import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [organizationId, importId] = process.argv
  .slice(2)
  .filter((value) => !value.startsWith("--"));

const apply = process.argv.includes("--apply");

if (
  !organizationId ||
  !importId ||
  organizationId.includes("/") ||
  !/^[0-9a-f]{24}$/.test(importId)
) {
  throw new Error(
    "ใช้: node --env-file=.env.local scripts/link-imported-departments.mjs ORGANIZATION_ID IMPORT_ID [--apply]",
  );
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("ไม่พบ Firebase Admin credentials ใน .env.local");
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();
const orgRef = db.collection("organizations").doc(organizationId);

const hash = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const normalize = (value) =>
  value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("th") ?? "";

const [orgSnapshot, employeeSnapshot, departmentSnapshot] = await Promise.all([
  orgRef.get(),
  orgRef.collection("employees").where("importId", "==", importId).get(),
  orgRef.collection("departments").get(),
]);

if (!orgSnapshot.exists || orgSnapshot.data()?.status !== "ACTIVE") {
  throw new Error("ไม่พบองค์กร ACTIVE");
}

if (employeeSnapshot.empty) {
  throw new Error("ไม่พบพนักงานจาก importId นี้");
}

const existingDepartments = new Map();
const occupiedCodes = new Map();

for (const doc of departmentSnapshot.docs) {
  const data = doc.data();

  if (data.isDeleted === true || data.status !== "ACTIVE") {
    continue;
  }

  if (data.code) {
    occupiedCodes.set(data.code, doc.id);
  }

  for (const name of [data.nameTh, data.nameEn]) {
    const key = normalize(name);
    if (!key) continue;

    const previous = existingDepartments.get(key);

    if (previous && previous !== doc.id) {
      throw new Error(`พบแผนก ACTIVE ชื่อซ้ำ: ${name}`);
    }

    existingDepartments.set(key, doc.id);
  }
}

const groups = new Map();
let alreadyLinked = 0;

for (const doc of employeeSnapshot.docs) {
  const employee = doc.data();
  const name = employee.importedDepartmentName?.trim();

  if (!name) continue;

  if (employee.departmentId) {
    alreadyLinked += 1;
    continue;
  }

  const key = normalize(name);
  const group = groups.get(key) ?? {
    name,
    employeeRefs: [],
  };

  group.employeeRefs.push(doc.ref);
  groups.set(key, group);
}

const plans = [...groups.entries()].map(([key, group]) => {
  const existingId = existingDepartments.get(key);

  const id =
    existingId ?? hash(`spj-department:${organizationId}:${key}`).slice(0, 32);

  const code = `DEP-${id.slice(0, 8).toUpperCase()}`;

  if (
    !existingId &&
    occupiedCodes.has(code) &&
    occupiedCodes.get(code) !== id
  ) {
    throw new Error(`รหัสแผนก ${code} ชนกับข้อมูลเดิม`);
  }

  return {
    ...group,
    key,
    id,
    code,
    create: !existingId,
  };
});

const summary = {
  importId,
  importedEmployees: employeeSnapshot.size,

  employeesToLink: plans.reduce(
    (sum, group) => sum + group.employeeRefs.length,
    0,
  ),

  alreadyLinked,

  departmentsToCreate: plans
    .filter((group) => group.create)
    .map((group) => group.name),

  existingDepartmentsToUse: plans
    .filter((group) => !group.create)
    .map((group) => group.name),
};

console.log(JSON.stringify(summary, null, 2));

if (!apply) {
  console.log("DRY RUN: ยังไม่มีการเขียน Firestore");
  process.exit(0);
}

let departmentsCreated = 0;
let employeesLinked = 0;

for (const group of plans) {
  const deptRef = orgRef.collection("departments").doc(group.id);

  if (group.create) {
    const auditRef = orgRef.collection("auditLogs").doc();

    const wasCreated = await db.runTransaction(async (tx) => {
      const doc = await tx.get(deptRef);

      if (doc.exists) {
        if (
          normalize(doc.data()?.nameTh) !== group.key ||
          doc.data()?.isDeleted === true ||
          doc.data()?.status !== "ACTIVE"
        ) {
          throw new Error(`แผนก ${group.name} มีข้อมูลชนกัน`);
        }

        return false;
      }

      tx.set(deptRef, {
        organizationId,
        code: group.code,
        normalizedCode: group.code,
        nameTh: group.name,
        nameEn: null,
        description: null,
        managerEmployeeId: null,
        status: "ACTIVE",
        sortOrder: 0,
        source: "EXCEL_IMPORT",
        importId,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,

        createdAt: FieldValue.serverTimestamp(),
        createdBy: "SYSTEM_EMPLOYEE_IMPORT",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "SYSTEM_EMPLOYEE_IMPORT",
      });

      tx.set(auditRef, {
        organizationId,

        actor: {
          uid: "SYSTEM_EMPLOYEE_IMPORT",
          email: clientEmail,
          role: "SYSTEM",
        },

        action: "DEPARTMENT_IMPORT_CREATE",
        entityType: "DEPARTMENT",
        entityId: deptRef.id,
        source: "SCRIPT",

        summary: `Imported department ${group.name}.`,

        before: null,

        after: {
          code: group.code,
          nameTh: group.name,
          status: "ACTIVE",
        },

        metadata: { importId },

        createdAt: FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (wasCreated) {
      departmentsCreated += 1;
    }
  }

  for (const employeeRef of group.employeeRefs) {
    const auditRef = orgRef.collection("auditLogs").doc();

    const wasLinked = await db.runTransaction(async (tx) => {
      const [employeeDoc, deptDoc] = await Promise.all([
        tx.get(employeeRef),
        tx.get(deptRef),
      ]);

      if (
        !deptDoc.exists ||
        deptDoc.data()?.isDeleted === true ||
        deptDoc.data()?.status !== "ACTIVE"
      ) {
        throw new Error(`แผนก ${group.name} ไม่พร้อมใช้งาน`);
      }

      if (
        !employeeDoc.exists ||
        employeeDoc.data()?.isDeleted === true ||
        employeeDoc.data()?.importId !== importId
      ) {
        throw new Error(`ข้อมูลพนักงาน ${employeeRef.id} เปลี่ยนไป`);
      }

      if (employeeDoc.data()?.departmentId === deptRef.id) {
        return false;
      }

      if (
        employeeDoc.data()?.departmentId ||
        normalize(employeeDoc.data()?.importedDepartmentName) !== group.key
      ) {
        throw new Error(`ข้อมูลแผนกพนักงาน ${employeeRef.id} เปลี่ยนไป`);
      }

      tx.update(employeeRef, {
        departmentId: deptRef.id,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "SYSTEM_EMPLOYEE_IMPORT",
      });

      tx.set(auditRef, {
        organizationId,

        actor: {
          uid: "SYSTEM_EMPLOYEE_IMPORT",
          email: clientEmail,
          role: "SYSTEM",
        },

        action: "EMPLOYEE_IMPORT_DEPARTMENT_LINK",

        entityType: "EMPLOYEE",
        entityId: employeeRef.id,
        source: "SCRIPT",

        summary: `Linked department for employee ${employeeDoc.data().employeeCode}.`,

        before: {
          departmentId: null,
        },

        after: {
          departmentId: deptRef.id,
        },

        metadata: { importId },

        createdAt: FieldValue.serverTimestamp(),
      });

      return true;
    });

    if (wasLinked) {
      employeesLinked += 1;
    }
  }
}

console.log(
  JSON.stringify(
    {
      departmentsCreated,
      employeesLinked,
    },
    null,
    2,
  ),
);
