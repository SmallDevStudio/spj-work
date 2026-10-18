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
