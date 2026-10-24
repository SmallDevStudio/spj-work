import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function normalizeCode(code) {
  return code.trim().toUpperCase();
}

function mapCompany(snapshot) {
  if (!snapshot.exists || snapshot.data()?.isDeleted === true) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function getCompanyById({ organizationId, companyId }) {
  const snapshot = await getOrganizationRef(organizationId)
    .collection("companies")
    .doc(companyId)
    .get();

  return mapCompany(snapshot);
}

export async function listCompanies({ organizationId, limit = 100 }) {
  const snapshot = await getOrganizationRef(organizationId)
    .collection("companies")
    .where("isDeleted", "==", false)
    .limit(limit)
    .get();

  return snapshot.docs
    .map(mapCompany)
    .filter(Boolean)
    .sort((first, second) => first.nameTh.localeCompare(second.nameTh, "th"));
}

export async function createCompany({ organizationId, data, actor }) {
  const organizationRef = getOrganizationRef(organizationId);
  const code = normalizeCode(data.code);

  const companyRef = organizationRef.collection("companies").doc();
  const codeKeyRef = organizationRef.collection("companyCodeKeys").doc(code);
  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const codeKeySnapshot = await transaction.get(codeKeyRef);

    if (codeKeySnapshot.exists) {
      throw new ApplicationError({
        code: "COMPANY_CODE_ALREADY_EXISTS",
        message: "รหัสบริษัทนี้ถูกใช้งานแล้ว",
        status: 409,
      });
    }

    transaction.set(companyRef, {
      organizationId,
      code,
      nameTh: data.nameTh,
      description: data.description,
      address: data.address,
      phoneNumber: data.phoneNumber,
      email: data.email,
      logoUrl: data.logoUrl,
      workSchedule: null,
      status: data.status,
      isDeleted: false,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(codeKeyRef, {
      organizationId,
      companyId: companyRef.id,
      code,
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
      action: "COMPANY_CREATE",
      entityType: "COMPANY",
      entityId: companyRef.id,
      source: "WEB",
      summary: `Created company ${code}.`,
      before: null,
      after: {
        code,
        nameTh: data.nameTh,
        description: data.description,
        address: data.address,
        phoneNumber: data.phoneNumber,
        email: data.email,
        logoUrl: data.logoUrl,
        status: data.status,
      },
      metadata: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return getCompanyById({
    organizationId,
    companyId: companyRef.id,
  });
}

export async function updateCompany({ organizationId, companyId, data, actor }) {
  const root = getOrganizationRef(organizationId);
  const ref = root.collection("companies").doc(companyId);
  await adminFirestore.runTransaction(async (transaction) => {
    const [snapshot, schedules] = await Promise.all([
      transaction.get(ref),
      transaction.get(ref.collection("workScheduleVersions").limit(101)),
    ]);
    const before = snapshot.data();
    if (!snapshot.exists || before?.isDeleted === true) throw new ApplicationError({
      code: "COMPANY_NOT_FOUND", message: "ไม่พบบริษัท", status: 404,
    });
    const latest = schedules.docs.reduce((item, doc) => !item || doc.id > item.id ? doc : item, null);
    transaction.update(ref, {
      ...data,
      ...(before.workSchedule == null && latest ? { workSchedule: {
        effectiveFrom: latest.id, workingWeekdays: latest.data().workingWeekdays,
      } } : {}),
      updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    transaction.set(root.collection("auditLogs").doc(), {
      organizationId, actor, action: "COMPANY_UPDATE", entityType: "COMPANY",
      entityId: companyId, source: "WEB", summary: `Updated company ${before.code}.`,
      before: Object.fromEntries(Object.keys(data).map((key) => [key, before[key] ?? null])),
      after: data, metadata: null, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return getCompanyById({ organizationId, companyId });
}

export async function softDeleteCompany({ organizationId, companyId, actor }) {
  const root = getOrganizationRef(organizationId);
  const ref = root.collection("companies").doc(companyId);
  await adminFirestore.runTransaction(async (transaction) => {
    const [snapshot, employees, requests] = await Promise.all([
      transaction.get(ref),
      transaction.get(root.collection("employees").where("companyId", "==", companyId).limit(1)),
      transaction.get(root.collection("leaveRequests").where("companyId", "==", companyId).limit(1)),
    ]);
    const company = snapshot.data();
    if (!snapshot.exists || company?.isDeleted === true) throw new ApplicationError({
      code: "COMPANY_NOT_FOUND", message: "ไม่พบบริษัท", status: 404,
    });
    if (!employees.empty || !requests.empty) throw new ApplicationError({
      code: "COMPANY_HAS_REFERENCES", message: "บริษัทนี้มีข้อมูลพนักงานหรือใบลาอ้างอิงอยู่ ไม่สามารถลบได้", status: 409,
    });
    transaction.update(ref, {
      isDeleted: true, deletedAt: FieldValue.serverTimestamp(), deletedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    transaction.set(root.collection("auditLogs").doc(), {
      organizationId, actor, action: "COMPANY_DELETE", entityType: "COMPANY",
      entityId: companyId, source: "WEB", summary: `Soft-deleted company ${company.code}.`,
      before: { code: company.code, nameTh: company.nameTh, isDeleted: false },
      after: { isDeleted: true }, metadata: null, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: companyId, isDeleted: true };
}
