import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  EMPLOYEE_ACCESS_STATUS,
  EMPLOYEE_SOURCE,
  MANAGER_ASSIGNMENT_TYPE,
} from "@/constants/employees";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function normalizeEmployeeCode(value) {
  return value.trim().toUpperCase();
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function createEmailKey(email) {
  return createHash("sha256")
    .update(normalizeEmail(email), "utf8")
    .digest("hex");
}

function mapEmployeeDocument(snapshot) {
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function resolveEffectiveManager({ employee, departmentManagerEmployeeId }) {
  if (employee.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL) {
    return {
      effectiveManagerEmployeeId: employee.managerEmployeeId ?? null,
      effectiveManagerSource: MANAGER_ASSIGNMENT_TYPE.MANUAL,
    };
  }

  if (employee.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.NONE) {
    return {
      effectiveManagerEmployeeId: null,
      effectiveManagerSource: MANAGER_ASSIGNMENT_TYPE.NONE,
    };
  }

  return {
    effectiveManagerEmployeeId: departmentManagerEmployeeId ?? null,
    effectiveManagerSource: MANAGER_ASSIGNMENT_TYPE.DEPARTMENT,
  };
}

async function enrichEmployeesWithEffectiveManagers({
  organizationId,
  employees,
}) {
  const departmentIds = [
    ...new Set(
      employees.map((employee) => employee.departmentId).filter(Boolean),
    ),
  ];

  const departmentSnapshots = await Promise.all(
    departmentIds.map((departmentId) =>
      getOrganizationRef(organizationId)
        .collection("departments")
        .doc(departmentId)
        .get(),
    ),
  );

  const departmentManagerMap = new Map(
    departmentSnapshots
      .filter(
        (snapshot) => snapshot.exists && snapshot.data()?.isDeleted !== true,
      )
      .map((snapshot) => [
        snapshot.id,
        snapshot.data()?.managerEmployeeId ?? null,
      ]),
  );

  return employees.map((employee) => ({
    ...employee,
    ...resolveEffectiveManager({
      employee,
      departmentManagerEmployeeId: employee.departmentId
        ? (departmentManagerMap.get(employee.departmentId) ?? null)
        : null,
    }),
  }));
}

export async function getEmployeeById({ organizationId, employeeId }) {
  const employeeSnapshot = await getOrganizationRef(organizationId)
    .collection("employees")
    .doc(employeeId)
    .get();

  const employee = mapEmployeeDocument(employeeSnapshot);

  if (!employee) {
    return null;
  }

  const [enrichedEmployee] = await enrichEmployeesWithEffectiveManagers({
    organizationId,
    employees: [employee],
  });

  return enrichedEmployee;
}

export async function getEmployeeByWorkEmail({ organizationId, workEmail }) {
  const normalizedEmail = normalizeEmail(workEmail);

  const employeeSnapshots = await getOrganizationRef(organizationId)
    .collection("employees")
    .where("workEmail", "==", normalizedEmail)
    .where("isDeleted", "==", false)
    .limit(2)
    .get();

  if (employeeSnapshots.empty) {
    return null;
  }

  if (employeeSnapshots.size > 1) {
    throw new ApplicationError({
      code: "EMPLOYEE_EMAIL_CONFLICT",
      message: "พบอีเมลนี้ในข้อมูลพนักงานมากกว่าหนึ่งรายการ",
      status: 409,
    });
  }

  const employee = mapEmployeeDocument(employeeSnapshots.docs[0]);

  const [enrichedEmployee] = await enrichEmployeesWithEffectiveManagers({
    organizationId,
    employees: [employee],
  });

  return enrichedEmployee;
}

export async function getEmployeeEmailDirectory(workEmail) {
  const normalizedEmail = normalizeEmail(workEmail);
  const emailKey = createEmailKey(normalizedEmail);

  const emailKeySnapshot = await adminFirestore
    .collection("employeeEmailKeys")
    .doc(emailKey)
    .get();

  if (!emailKeySnapshot.exists) {
    return null;
  }

  return {
    id: emailKeySnapshot.id,
    ...emailKeySnapshot.data(),
  };
}

export async function listEmployees({ organizationId, limit = 100 }) {
  const employeeSnapshots = await getOrganizationRef(organizationId)
    .collection("employees")
    .where("isDeleted", "==", false)
    .limit(limit)
    .get();

  const employees = employeeSnapshots.docs.map(mapEmployeeDocument);

  return enrichEmployeesWithEffectiveManagers({
    organizationId,
    employees,
  });
}

export async function createEmployee({ organizationId, employeeInput, actor }) {
  const organizationRef = getOrganizationRef(organizationId);
  const employeeRef = organizationRef.collection("employees").doc();

  const normalizedEmployeeCode = normalizeEmployeeCode(
    employeeInput.employeeCode,
  );

  const normalizedEmail = normalizeEmail(employeeInput.workEmail);

  const normalizedPrinterCode = employeeInput.printerCode?.trim() || null;

  const employeeCodeKeyRef = organizationRef
    .collection("employeeCodeKeys")
    .doc(normalizedEmployeeCode);

  const printerCodeKeyRef = normalizedPrinterCode
    ? organizationRef.collection("printerCodeKeys").doc(normalizedPrinterCode)
    : null;

  const emailKeyRef = adminFirestore
    .collection("employeeEmailKeys")
    .doc(createEmailKey(normalizedEmail));

  const departmentRef = employeeInput.departmentId
    ? organizationRef.collection("departments").doc(employeeInput.departmentId)
    : null;

  const manualManagerRef =
    employeeInput.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL &&
    employeeInput.managerEmployeeId
      ? organizationRef
          .collection("employees")
          .doc(employeeInput.managerEmployeeId)
      : null;

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const [
      employeeCodeKeySnapshot,
      printerCodeKeySnapshot,
      emailKeySnapshot,
      departmentSnapshot,
      manualManagerSnapshot,
    ] = await Promise.all([
      transaction.get(employeeCodeKeyRef),
      printerCodeKeyRef
        ? transaction.get(printerCodeKeyRef)
        : Promise.resolve(null),
      transaction.get(emailKeyRef),
      departmentRef ? transaction.get(departmentRef) : Promise.resolve(null),
      manualManagerRef
        ? transaction.get(manualManagerRef)
        : Promise.resolve(null),
    ]);

    if (employeeCodeKeySnapshot.exists) {
      throw new ApplicationError({
        code: "EMPLOYEE_CODE_ALREADY_EXISTS",
        message: "รหัสพนักงานนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (printerCodeKeySnapshot?.exists) {
      throw new ApplicationError({
        code: "PRINTER_CODE_ALREADY_EXISTS",
        message: "รหัส Printer นี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (emailKeySnapshot.exists) {
      throw new ApplicationError({
        code: "EMPLOYEE_EMAIL_ALREADY_EXISTS",
        message: "อีเมลบริษัทนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (
      departmentSnapshot &&
      (!departmentSnapshot.exists ||
        departmentSnapshot.data()?.isDeleted === true ||
        departmentSnapshot.data()?.status !== "ACTIVE")
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_NOT_AVAILABLE",
        message: "ไม่พบแผนกหรือแผนกนี้ไม่พร้อมใช้งาน",
        status: 400,
      });
    }

    if (
      manualManagerSnapshot &&
      (!manualManagerSnapshot.exists ||
        manualManagerSnapshot.data()?.isDeleted === true)
    ) {
      throw new ApplicationError({
        code: "MANAGER_NOT_AVAILABLE",
        message: "ไม่พบข้อมูลหัวหน้างานที่เลือก",
        status: 400,
      });
    }

    const displayName = [employeeInput.firstName, employeeInput.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const storedManagerEmployeeId =
      employeeInput.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL
        ? employeeInput.managerEmployeeId
        : null;

    transaction.set(employeeRef, {
      organizationId,
      employeeCode: normalizedEmployeeCode,
      firstName: employeeInput.firstName,
      lastName: employeeInput.lastName,
      displayName,
      workEmail: normalizedEmail,

      gender: employeeInput.gender,
      birthDate: employeeInput.birthDate,
      phoneNumber: employeeInput.phoneNumber,
      positionTitle: employeeInput.positionTitle,
      departmentId: employeeInput.departmentId,

      managerAssignmentType: employeeInput.managerAssignmentType,
      managerEmployeeId: storedManagerEmployeeId,

      printerCode: normalizedPrinterCode,
      notes: employeeInput.notes,
      employmentType: employeeInput.employmentType,
      employmentStatus: employeeInput.employmentStatus,
      effectiveDate: employeeInput.effectiveDate,
      role: employeeInput.role,

      accessStatus: EMPLOYEE_ACCESS_STATUS.ACTIVE,
      userId: null,
      source: EMPLOYEE_SOURCE.MANUAL,
      isDeleted: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(employeeCodeKeyRef, {
      organizationId,
      employeeId: employeeRef.id,
      employeeCode: normalizedEmployeeCode,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });

    if (printerCodeKeyRef) {
      transaction.set(printerCodeKeyRef, {
        organizationId,
        employeeId: employeeRef.id,
        printerCode: normalizedPrinterCode,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
      });
    }

    transaction.set(emailKeyRef, {
      organizationId,
      employeeId: employeeRef.id,
      workEmail: normalizedEmail,
      status: EMPLOYEE_ACCESS_STATUS.ACTIVE,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditLogRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },
      action: "EMPLOYEE_CREATE",
      entityType: "EMPLOYEE",
      entityId: employeeRef.id,
      source: "WEB",
      summary: `Created employee ${normalizedEmployeeCode}.`,
      before: null,
      after: {
        employeeCode: normalizedEmployeeCode,
        displayName,
        workEmail: normalizedEmail,
        positionTitle: employeeInput.positionTitle,
        departmentId: employeeInput.departmentId,
        managerAssignmentType: employeeInput.managerAssignmentType,
        managerEmployeeId: storedManagerEmployeeId,
        employmentType: employeeInput.employmentType,
        employmentStatus: employeeInput.employmentStatus,
        effectiveDate: employeeInput.effectiveDate,
        accessStatus: EMPLOYEE_ACCESS_STATUS.ACTIVE,
      },
      metadata: {
        hasPrinterCode: Boolean(normalizedPrinterCode),
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getEmployeeById({
    organizationId,
    employeeId: employeeRef.id,
  });
}

export async function updateEmployee({
  organizationId,
  employeeId,
  employeeInput,
  actor,
}) {
  const organizationRef = getOrganizationRef(organizationId);
  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const normalizedEmployeeCode = normalizeEmployeeCode(
    employeeInput.employeeCode,
  );

  const normalizedEmail = normalizeEmail(employeeInput.workEmail);

  const normalizedPrinterCode = employeeInput.printerCode?.trim() || null;

  const newEmployeeCodeKeyRef = organizationRef
    .collection("employeeCodeKeys")
    .doc(normalizedEmployeeCode);

  const newEmailKeyRef = adminFirestore
    .collection("employeeEmailKeys")
    .doc(createEmailKey(normalizedEmail));

  const newPrinterCodeKeyRef = normalizedPrinterCode
    ? organizationRef.collection("printerCodeKeys").doc(normalizedPrinterCode)
    : null;

  const departmentRef = employeeInput.departmentId
    ? organizationRef.collection("departments").doc(employeeInput.departmentId)
    : null;

  const manualManagerRef =
    employeeInput.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL &&
    employeeInput.managerEmployeeId
      ? organizationRef
          .collection("employees")
          .doc(employeeInput.managerEmployeeId)
      : null;

  if (manualManagerRef?.id === employeeId) {
    throw new ApplicationError({
      code: "EMPLOYEE_CANNOT_MANAGE_SELF",
      message: "ไม่สามารถกำหนดพนักงานเป็นหัวหน้าของตนเองได้",
      status: 400,
    });
  }

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const employeeSnapshot = await transaction.get(employeeRef);

    if (
      !employeeSnapshot.exists ||
      employeeSnapshot.data()?.isDeleted === true
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_NOT_FOUND",
        message: "ไม่พบข้อมูลพนักงาน",
        status: 404,
      });
    }

    const currentEmployee = employeeSnapshot.data();

    const oldEmployeeCode = normalizeEmployeeCode(currentEmployee.employeeCode);

    const oldEmail = normalizeEmail(currentEmployee.workEmail);

    const oldPrinterCode = currentEmployee.printerCode?.trim() || null;

    if (currentEmployee.userId && oldEmail !== normalizedEmail) {
      throw new ApplicationError({
        code: "EMPLOYEE_EMAIL_LINKED",
        message:
          "ไม่สามารถเปลี่ยนอีเมลได้หลังจากเชื่อมบัญชี Google แล้ว กรุณาดำเนินการย้ายบัญชีผู้ใช้ก่อน",
        status: 409,
      });
    }

    const oldEmployeeCodeKeyRef = organizationRef
      .collection("employeeCodeKeys")
      .doc(oldEmployeeCode);

    const oldEmailKeyRef = adminFirestore
      .collection("employeeEmailKeys")
      .doc(createEmailKey(oldEmail));

    const oldPrinterCodeKeyRef = oldPrinterCode
      ? organizationRef.collection("printerCodeKeys").doc(oldPrinterCode)
      : null;

    const [
      newEmployeeCodeKeySnapshot,
      newEmailKeySnapshot,
      newPrinterCodeKeySnapshot,
      departmentSnapshot,
      manualManagerSnapshot,
    ] = await Promise.all([
      transaction.get(newEmployeeCodeKeyRef),
      transaction.get(newEmailKeyRef),
      newPrinterCodeKeyRef
        ? transaction.get(newPrinterCodeKeyRef)
        : Promise.resolve(null),
      departmentRef ? transaction.get(departmentRef) : Promise.resolve(null),
      manualManagerRef
        ? transaction.get(manualManagerRef)
        : Promise.resolve(null),
    ]);

    if (
      newEmployeeCodeKeySnapshot.exists &&
      newEmployeeCodeKeySnapshot.data()?.employeeId !== employeeId
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_CODE_ALREADY_EXISTS",
        message: "รหัสพนักงานนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (
      newEmailKeySnapshot.exists &&
      newEmailKeySnapshot.data()?.employeeId !== employeeId
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_EMAIL_ALREADY_EXISTS",
        message: "อีเมลบริษัทนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (
      newPrinterCodeKeySnapshot?.exists &&
      newPrinterCodeKeySnapshot.data()?.employeeId !== employeeId
    ) {
      throw new ApplicationError({
        code: "PRINTER_CODE_ALREADY_EXISTS",
        message: "รหัส Printer นี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    if (
      departmentSnapshot &&
      (!departmentSnapshot.exists ||
        departmentSnapshot.data()?.isDeleted === true ||
        departmentSnapshot.data()?.status !== "ACTIVE")
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_NOT_AVAILABLE",
        message: "ไม่พบแผนกหรือแผนกนี้ไม่พร้อมใช้งาน",
        status: 400,
      });
    }

    if (
      manualManagerSnapshot &&
      (!manualManagerSnapshot.exists ||
        manualManagerSnapshot.data()?.isDeleted === true)
    ) {
      throw new ApplicationError({
        code: "MANAGER_NOT_AVAILABLE",
        message: "ไม่พบข้อมูลหัวหน้างานที่เลือก",
        status: 400,
      });
    }

    const displayName = [employeeInput.firstName, employeeInput.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const storedManagerEmployeeId =
      employeeInput.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL
        ? employeeInput.managerEmployeeId
        : null;

    transaction.update(employeeRef, {
      employeeCode: normalizedEmployeeCode,
      firstName: employeeInput.firstName,
      lastName: employeeInput.lastName,
      displayName,
      workEmail: normalizedEmail,

      gender: employeeInput.gender,
      birthDate: employeeInput.birthDate,
      phoneNumber: employeeInput.phoneNumber,
      positionTitle: employeeInput.positionTitle,
      departmentId: employeeInput.departmentId,

      managerAssignmentType: employeeInput.managerAssignmentType,
      managerEmployeeId: storedManagerEmployeeId,

      printerCode: normalizedPrinterCode,
      notes: employeeInput.notes,
      employmentType: employeeInput.employmentType,
      employmentStatus: employeeInput.employmentStatus,
      effectiveDate: employeeInput.effectiveDate,
      role: employeeInput.role,

      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    if (oldEmployeeCode !== normalizedEmployeeCode) {
      transaction.delete(oldEmployeeCodeKeyRef);
    }

    transaction.set(newEmployeeCodeKeyRef, {
      organizationId,
      employeeId,
      employeeCode: normalizedEmployeeCode,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    if (oldEmail !== normalizedEmail) {
      transaction.delete(oldEmailKeyRef);
    }

    transaction.set(
      newEmailKeyRef,
      {
        organizationId,
        employeeId,
        workEmail: normalizedEmail,
        status: currentEmployee.accessStatus ?? EMPLOYEE_ACCESS_STATUS.ACTIVE,
        uid: currentEmployee.userId ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      },
      {
        merge: true,
      },
    );

    if (
      oldPrinterCode &&
      oldPrinterCode !== normalizedPrinterCode &&
      oldPrinterCodeKeyRef
    ) {
      transaction.delete(oldPrinterCodeKeyRef);
    }

    if (newPrinterCodeKeyRef) {
      transaction.set(
        newPrinterCodeKeyRef,
        {
          organizationId,
          employeeId,
          printerCode: normalizedPrinterCode,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: actor.uid,
        },
        {
          merge: true,
        },
      );
    }

    transaction.set(auditLogRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },
      action: "EMPLOYEE_UPDATE",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      source: "WEB",
      summary: `Updated employee ${normalizedEmployeeCode}.`,
      before: {
        employeeCode: currentEmployee.employeeCode,
        displayName: currentEmployee.displayName,
        workEmail: currentEmployee.workEmail,
        positionTitle: currentEmployee.positionTitle ?? null,
        departmentId: currentEmployee.departmentId ?? null,
        managerAssignmentType: currentEmployee.managerAssignmentType ?? null,
        managerEmployeeId: currentEmployee.managerEmployeeId ?? null,
        employmentType: currentEmployee.employmentType,
        employmentStatus: currentEmployee.employmentStatus,
        effectiveDate: currentEmployee.effectiveDate ?? null,
      },
      after: {
        employeeCode: normalizedEmployeeCode,
        displayName,
        workEmail: normalizedEmail,
        positionTitle: employeeInput.positionTitle,
        departmentId: employeeInput.departmentId,
        managerAssignmentType: employeeInput.managerAssignmentType,
        managerEmployeeId: storedManagerEmployeeId,
        employmentType: employeeInput.employmentType,
        employmentStatus: employeeInput.employmentStatus,
        effectiveDate: employeeInput.effectiveDate,
      },
      metadata: {
        hadPrinterCode: Boolean(oldPrinterCode),
        hasPrinterCode: Boolean(normalizedPrinterCode),
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getEmployeeById({
    organizationId,
    employeeId,
  });
}
