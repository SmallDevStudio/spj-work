import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function mapDocument(snapshot) {
  if (!snapshot.exists) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

function createInternalDepartmentCode(departmentId) {
  return `DEP-${departmentId.slice(0, 8).toUpperCase()}`;
}

export async function getDepartmentById({ organizationId, departmentId }) {
  const departmentSnapshot = await getOrganizationRef(organizationId)
    .collection("departments")
    .doc(departmentId)
    .get();

  return mapDocument(departmentSnapshot);
}

export async function listDepartments({ organizationId, limit = 100 }) {
  const departmentSnapshots = await getOrganizationRef(organizationId)
    .collection("departments")
    .where("isDeleted", "==", false)
    .limit(limit)
    .get();

  return departmentSnapshots.docs.map(mapDocument);
}

export async function createDepartment({ organizationId, data, actor }) {
  const organizationRef = getOrganizationRef(organizationId);
  const departmentRef = organizationRef.collection("departments").doc();
  const auditLogRef = organizationRef.collection("auditLogs").doc();

  const internalCode = createInternalDepartmentCode(departmentRef.id);

  const managerRef = data.managerEmployeeId
    ? organizationRef.collection("employees").doc(data.managerEmployeeId)
    : null;

  await adminFirestore.runTransaction(async (transaction) => {
    const managerSnapshot = managerRef
      ? await transaction.get(managerRef)
      : null;

    if (
      managerSnapshot &&
      (!managerSnapshot.exists || managerSnapshot.data()?.isDeleted === true)
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_MANAGER_NOT_AVAILABLE",
        message: "ไม่พบข้อมูลพนักงานที่เลือกเป็นหัวหน้าแผนก",
        status: 400,
      });
    }

    transaction.set(departmentRef, {
      organizationId,
      code: internalCode,
      normalizedCode: internalCode,
      nameTh: data.nameTh,
      nameEn: null,
      description: data.description,
      managerEmployeeId: data.managerEmployeeId,
      status: "ACTIVE",
      sortOrder: 0,
      source: data.source,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
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
      action: "DEPARTMENT_CREATE",
      entityType: "DEPARTMENT",
      entityId: departmentRef.id,
      source: "WEB",
      summary: `Created department ${data.nameTh}.`,
      before: null,
      after: {
        code: internalCode,
        nameTh: data.nameTh,
        description: data.description,
        managerEmployeeId: data.managerEmployeeId,
        status: "ACTIVE",
      },
      metadata: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getDepartmentById({
    organizationId,
    departmentId: departmentRef.id,
  });
}

export async function updateDepartment({
  organizationId,
  departmentId,
  data,
  actor,
}) {
  const organizationRef = getOrganizationRef(organizationId);

  const departmentRef = organizationRef
    .collection("departments")
    .doc(departmentId);

  const managerRef = data.managerEmployeeId
    ? organizationRef.collection("employees").doc(data.managerEmployeeId)
    : null;

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const departmentSnapshot = await transaction.get(departmentRef);

    if (
      !departmentSnapshot.exists ||
      departmentSnapshot.data()?.isDeleted === true
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_NOT_FOUND",
        message: "ไม่พบข้อมูลแผนก",
        status: 404,
      });
    }

    const currentDepartment = departmentSnapshot.data();

    const managerSnapshot = managerRef
      ? await transaction.get(managerRef)
      : null;

    if (
      managerSnapshot &&
      (!managerSnapshot.exists || managerSnapshot.data()?.isDeleted === true)
    ) {
      throw new ApplicationError({
        code: "DEPARTMENT_MANAGER_NOT_AVAILABLE",
        message: "ไม่พบข้อมูลพนักงานที่เลือกเป็นหัวหน้าแผนก",
        status: 400,
      });
    }

    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    };

    if (data.nameTh !== undefined) {
      updateData.nameTh = data.nameTh;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.managerEmployeeId !== undefined) {
      updateData.managerEmployeeId = data.managerEmployeeId;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    transaction.update(departmentRef, updateData);

    transaction.set(auditLogRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },
      action: "DEPARTMENT_UPDATE",
      entityType: "DEPARTMENT",
      entityId: departmentId,
      source: "WEB",
      summary: `Updated department ${data.nameTh ?? currentDepartment.nameTh}.`,
      before: {
        nameTh: currentDepartment.nameTh,
        description: currentDepartment.description ?? null,
        managerEmployeeId: currentDepartment.managerEmployeeId ?? null,
        status: currentDepartment.status,
      },
      after: {
        nameTh: data.nameTh ?? currentDepartment.nameTh,
        description:
          data.description !== undefined
            ? data.description
            : (currentDepartment.description ?? null),
        managerEmployeeId:
          data.managerEmployeeId !== undefined
            ? data.managerEmployeeId
            : (currentDepartment.managerEmployeeId ?? null),
        status: data.status ?? currentDepartment.status,
      },
      metadata: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getDepartmentById({
    organizationId,
    departmentId,
  });
}
