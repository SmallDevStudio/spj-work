import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

import {
  HEADERS,
  normalizeDate,
  parseCsv,
  previewEmployeesCsv,
} from "./preview-employees-csv.mjs";

const csvPath = process.argv[2];
const organizationId = process.argv[3];
const apply = process.argv.includes("--apply");
const allowCrossCompany = process.argv.includes("--allow-cross-company");

if (!csvPath || !organizationId || organizationId.includes("/")) {
  throw new Error(
    "ใช้: node --env-file=.env.local scripts/import-employees.mjs employee.csv ORGANIZATION_ID [--allow-cross-company] [--apply]",
  );
}

const content = await fs.readFile(csvPath, "utf8");
const preview = previewEmployeesCsv(content);

if (preview.errors.length) {
  console.log(JSON.stringify(preview, null, 2));
  throw new Error("แก้ errors ใน CSV ก่อนนำเข้า");
}

if (preview.warnings.length && !allowCrossCompany) {
  console.log(JSON.stringify(preview.warnings, null, 2));
  throw new Error("ตรวจหัวหน้าข้ามบริษัทก่อน แล้วใส่ --allow-cross-company");
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "ไม่พบ FIREBASE_ADMIN_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY ใน .env.local",
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const db = getFirestore();
const organizationRef = db.collection("organizations").doc(organizationId);
const organization = await organizationRef.get();

if (!organization.exists || organization.data()?.status !== "ACTIVE") {
  throw new Error("ไม่พบองค์กร ACTIVE ตาม ORGANIZATION_ID");
}

const digest = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");

const importId = digest(content.replace(/^\uFEFF/, "")).slice(0, 24);

const dataRows = parseCsv(content)
  .slice(1)
  .filter((row) => row.some((cell) => cell.trim()));

const data = dataRows.map((row) =>
  Object.fromEntries(
    HEADERS.map((header, index) => [header, (row[index] ?? "").trim()]),
  ),
);

const [companiesSnapshot, departmentsSnapshot] = await Promise.all([
  organizationRef.collection("companies").get(),
  organizationRef.collection("departments").get(),
]);

const companies = new Map();

for (const doc of companiesSnapshot.docs) {
  if (doc.data().isDeleted !== true && doc.data().status === "ACTIVE") {
    const code = doc.data().code?.trim().toUpperCase();

    if (code && companies.has(code)) {
      throw new Error(`รหัสบริษัท ${code} ซ้ำใน Firestore`);
    }

    if (code) companies.set(code, doc.id);
  }
}

const departments = new Map();

for (const doc of departmentsSnapshot.docs) {
  if (doc.data().isDeleted === true || doc.data().status !== "ACTIVE") {
    continue;
  }

  for (const label of [doc.data().code, doc.data().nameTh, doc.data().nameEn]) {
    const key = label?.trim().toLocaleLowerCase("th");
    if (!key) continue;

    if (departments.has(key) && departments.get(key) !== doc.id) {
      departments.set(key, null);
    } else if (!departments.has(key)) {
      departments.set(key, doc.id);
    }
  }
}

const employeeByCode = new Map();
const employees = [];
const unresolvedDepartments = new Map();

for (const row of data) {
  const employeeCode = row["รหัสพนักงาน*"].toUpperCase();
  const companyCode = row["รหัสบริษัท*"].toUpperCase();
  const companyId = companies.get(companyCode);

  if (!companyId) {
    throw new Error(`ไม่พบบริษัท ACTIVE: ${companyCode}`);
  }

  if (employeeByCode.has(employeeCode)) {
    throw new Error(
      `รหัสพนักงาน ${employeeCode} ซ้ำข้ามบริษัท (ระบบปัจจุบันใช้รหัสพนักงานไม่ซ้ำทั้งองค์กร)`,
    );
  }

  const departmentText = row["รหัสแผนก"];
  const departmentId = departmentText
    ? departments.get(departmentText.toLocaleLowerCase("th"))
    : null;

  if (departmentText && !departmentId) {
    unresolvedDepartments.set(
      departmentText,
      (unresolvedDepartments.get(departmentText) ?? 0) + 1,
    );
  }

  const employeeId = digest(
    `employee-import-v1:${organizationId}:${employeeCode}`,
  ).slice(0, 32);

  const managerCodes = row["รหัสพนักงานหัวหน้า"]
    ? row["รหัสพนักงานหัวหน้า"]
        .split(",")
        .map((value) => value.trim().toUpperCase())
    : [];

  const employee = {
    row,
    employeeCode,
    companyCode,
    companyId,
    employeeId,
    departmentId: departmentId ?? null,
    departmentText: departmentText || null,
    managerCodes,
    workEmail: row["อีเมลงาน*"].toLowerCase(),
  };

  employeeByCode.set(employeeCode, employee);
  employees.push(employee);
}

for (const employee of employees) {
  for (const code of employee.managerCodes) {
    if (!employeeByCode.has(code)) {
      throw new Error(`ไม่พบหัวหน้า ${code}`);
    }
  }
}

const approverCodes = new Set(
  employees.flatMap((employee) => employee.managerCodes),
);

const conflicts = [];
const resumable = new Set();

for (const employee of employees) {
  const employeeRef = organizationRef
    .collection("employees")
    .doc(employee.employeeId);

  const codeRef = organizationRef
    .collection("employeeCodeKeys")
    .doc(employee.employeeCode);

  const emailRef = db
    .collection("employeeEmailKeys")
    .doc(digest(employee.workEmail));

  const printerCode = employee.row["รหัสเครื่องพิมพ์ 4 หลัก"];

  const printerRef = printerCode
    ? organizationRef.collection("printerCodeKeys").doc(printerCode)
    : null;

  const refs = [
    employeeRef,
    codeRef,
    emailRef,
    ...(printerRef ? [printerRef] : []),
  ];

  const snaps = await db.getAll(...refs);

  const sameImport = snaps[0].exists && snaps[0].data()?.importId === importId;

  if (
    sameImport &&
    refs
      .slice(1)
      .every(
        (_, index) =>
          snaps[index + 1].exists &&
          snaps[index + 1].data()?.employeeId === employee.employeeId,
      )
  ) {
    resumable.add(employee.employeeId);
  } else if (snaps.some((snap) => snap.exists)) {
    conflicts.push(employee.employeeCode);
  }
}

if (conflicts.length) {
  throw new Error(`ข้อมูลชนกับ Firestore: ${conflicts.join(", ")}`);
}

const plan = {
  importId,
  total: employees.length,
  alreadyImportedFromSameFile: resumable.size,
  toCreate: employees.length - resumable.size,
  multipleApproverEmployees: preview.multipleApproverEmployees,
  crossCompanyWarnings: preview.warnings,
  unmatchedDepartmentNames: [...unresolvedDepartments.entries()].map(
    ([name, count]) => ({
      name,
      count,
      action:
        "เก็บชื่อไว้ใน importedDepartmentName และรอผูก departmentId ภายหลัง",
    }),
  ),
};

console.log(JSON.stringify(plan, null, 2));

if (!apply) {
  console.log("DRY RUN: ยังไม่มีการเขียน Firestore");
  process.exit(0);
}

let created = 0;

for (const employee of employees) {
  if (resumable.has(employee.employeeId)) continue;

  const { row, employeeCode, companyId, employeeId, managerCodes, workEmail } =
    employee;

  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const codeRef = organizationRef
    .collection("employeeCodeKeys")
    .doc(employeeCode);

  const emailRef = db.collection("employeeEmailKeys").doc(digest(workEmail));

  const printerCode = row["รหัสเครื่องพิมพ์ 4 หลัก"] || null;

  const printerRef = printerCode
    ? organizationRef.collection("printerCodeKeys").doc(printerCode)
    : null;

  const auditRef = organizationRef.collection("auditLogs").doc();

  const managerEmployeeIds = managerCodes.map(
    (code) => employeeByCode.get(code).employeeId,
  );

  const status = row["สถานะ"] || "ACTIVE";
  const accessStatus = status === "ACTIVE" ? "ACTIVE" : "SUSPENDED";

  const gender =
    {
      ชาย: "MALE",
      หญิง: "FEMALE",
    }[row["เพศ"]] ?? "NOT_SPECIFIED";

  const firstName = row["ชื่อ*"];
  const lastName = row["นามสกุล*"];

  await db.runTransaction(async (tx) => {
    const refs = [
      employeeRef,
      codeRef,
      emailRef,
      ...(printerRef ? [printerRef] : []),
    ];

    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));

    if (snaps.some((snap) => snap.exists)) {
      throw new Error(`ข้อมูล ${employeeCode} ถูกสร้างระหว่างตรวจและนำเข้า`);
    }

    tx.set(employeeRef, {
      organizationId,
      companyId,
      employeeCode,
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`,
      workEmail,
      gender,

      birthDate: row["วันเกิด (YYYY-MM-DD)"]
        ? normalizeDate(row["วันเกิด (YYYY-MM-DD)"])
        : null,

      phoneNumber: row["เบอร์โทร"] || null,
      positionTitle: row["ตำแหน่ง"] || null,
      departmentId: employee.departmentId,

      importedDepartmentName: employee.departmentId
        ? null
        : employee.departmentText,

      managerAssignmentType: managerEmployeeIds.length
        ? "MANUAL"
        : "DEPARTMENT",

      managerEmployeeId: managerEmployeeIds[0] ?? null,

      defaultLeaveApproverEmployeeIds: managerEmployeeIds,

      defaultLeaveApproverMode: "ANY_ONE",

      printerCode,
      notes: row["หมายเหตุ"] || null,
      employmentType: "FULL_TIME",
      employmentStatus: status,

      effectiveDate: row["วันที่มีผล (YYYY-MM-DD)"]
        ? normalizeDate(row["วันที่มีผล (YYYY-MM-DD)"])
        : null,

      role: approverCodes.has(employeeCode) ? "APPROVER" : "EMPLOYEE",

      accessStatus,
      userId: null,
      source: "EXCEL_IMPORT",
      importId,
      isDeleted: false,

      createdAt: FieldValue.serverTimestamp(),
      createdBy: "SYSTEM_EMPLOYEE_IMPORT",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "SYSTEM_EMPLOYEE_IMPORT",
    });

    tx.set(codeRef, {
      organizationId,
      employeeId,
      employeeCode,
      importId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: "SYSTEM_EMPLOYEE_IMPORT",
    });

    tx.set(emailRef, {
      organizationId,
      employeeId,
      workEmail,
      status: accessStatus,
      importId,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: "SYSTEM_EMPLOYEE_IMPORT",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "SYSTEM_EMPLOYEE_IMPORT",
    });

    if (printerRef) {
      tx.set(printerRef, {
        organizationId,
        employeeId,
        printerCode,
        importId,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: "SYSTEM_EMPLOYEE_IMPORT",
      });
    }

    tx.set(auditRef, {
      organizationId,

      actor: {
        uid: "SYSTEM_EMPLOYEE_IMPORT",
        email: clientEmail,
        role: "SYSTEM",
      },

      action: "EMPLOYEE_IMPORT_CREATE",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      source: "SCRIPT",
      summary: `Imported employee ${employeeCode}.`,
      before: null,

      after: {
        employeeCode,
        companyId,
        workEmail,
        managerEmployeeIds,
      },

      metadata: {
        importId,
        hasPrinterCode: Boolean(printerCode),
      },

      createdAt: FieldValue.serverTimestamp(),
    });
  });

  created += 1;

  if (created % 10 === 0 || created === plan.toCreate) {
    console.log(`นำเข้าสำเร็จ ${created}/${plan.toCreate}`);
  }
}

console.log(
  JSON.stringify(
    {
      importId,
      created,
      alreadyImported: resumable.size,
    },
    null,
    2,
  ),
);
