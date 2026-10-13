import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";
import { ApplicationError } from "@/lib/errors/application-error";

function createStableKey(value) {
  return createHash("sha256").update(value).digest("hex");
}

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

  const normalizedCode = data.code.trim().toUpperCase();
  const codeKey = createStableKey(normalizedCode);

  const codeKeyRef = organizationRef
    .collection("departmentCodeKeys")
    .doc(codeKey);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const codeKeySnapshot = await transaction.get(codeKeyRef);

    if (codeKeySnapshot.exists) {
      throw new ApplicationError({
        code: "DEPARTMENT_CODE_ALREADY_EXISTS",
        message: `รหัสแผนก ${normalizedCode} ถูกใช้งานแล้ว`,
        status: 409,
      });
    }

    const departmentData = {
      organizationId,
      code: normalizedCode,
      normalizedCode,
      nameTh: data.nameTh,
      nameEn: data.nameEn,
      description: data.description,
      managerEmployeeId: data.managerEmployeeId,
      status: data.status,
      sortOrder: data.sortOrder,
      source: data.source,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    };

    transaction.set(departmentRef, departmentData);

    transaction.set(codeKeyRef, {
      organizationId,
      entityType: "DEPARTMENT",
      entityId: departmentRef.id,
      normalizedCode,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
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
      summary: `Created department ${normalizedCode}.`,
      before: null,
      after: {
        code: normalizedCode,
        nameTh: data.nameTh,
        nameEn: data.nameEn,
        status: data.status,
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

export async function getPositionById({ organizationId, positionId }) {
  const positionSnapshot = await getOrganizationRef(organizationId)
    .collection("positions")
    .doc(positionId)
    .get();

  return mapDocument(positionSnapshot);
}

export async function listPositions({ organizationId, limit = 100 }) {
  const positionSnapshots = await getOrganizationRef(organizationId)
    .collection("positions")
    .where("isDeleted", "==", false)
    .limit(limit)
    .get();

  return positionSnapshots.docs.map(mapDocument);
}

export async function createPosition({ organizationId, data, actor }) {
  const organizationRef = getOrganizationRef(organizationId);
  const positionRef = organizationRef.collection("positions").doc();

  const normalizedCode = data.code.trim().toUpperCase();

  const uniqueCodeValue = `${data.departmentId}:${normalizedCode}`;
  const codeKey = createStableKey(uniqueCodeValue);

  const codeKeyRef = organizationRef
    .collection("positionCodeKeys")
    .doc(codeKey);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const codeKeySnapshot = await transaction.get(codeKeyRef);

    if (codeKeySnapshot.exists) {
      throw new ApplicationError({
        code: "POSITION_CODE_ALREADY_EXISTS",
        message: `รหัสตำแหน่ง ${normalizedCode} ถูกใช้งานในแผนกนี้แล้ว`,
        status: 409,
      });
    }

    const positionData = {
      organizationId,
      departmentId: data.departmentId,
      code: normalizedCode,
      normalizedCode,
      nameTh: data.nameTh,
      nameEn: data.nameEn,
      description: data.description,
      status: data.status,
      sortOrder: data.sortOrder,
      source: data.source,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    };

    transaction.set(positionRef, positionData);

    transaction.set(codeKeyRef, {
      organizationId,
      entityType: "POSITION",
      entityId: positionRef.id,
      departmentId: data.departmentId,
      normalizedCode,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });

    transaction.set(auditLogRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },
      action: "POSITION_CREATE",
      entityType: "POSITION",
      entityId: positionRef.id,
      source: "WEB",
      summary: `Created position ${normalizedCode}.`,
      before: null,
      after: {
        departmentId: data.departmentId,
        code: normalizedCode,
        nameTh: data.nameTh,
        nameEn: data.nameEn,
        status: data.status,
      },
      metadata: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getPositionById({
    organizationId,
    positionId: positionRef.id,
  });
}
