import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function organizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function requireCentralAdmin(actor) {
  if (actor.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "LEAVE_POLICY_CENTRAL_ADMIN_REQUIRED",
      message: "เฉพาะผู้ดูแลนโยบายส่วนกลางเท่านั้นที่แก้ประเภทลาได้",
      status: 403,
    });
  }
}

export async function listLeaveTypeConfigs({ organizationId, companyId }) {
  const orgRef = organizationRef(organizationId);
  const companyRef = orgRef.collection("companies").doc(companyId);
  const companySnapshot = await companyRef.get();

  if (
    !companySnapshot.exists ||
    companySnapshot.data()?.isDeleted === true ||
    companySnapshot.data()?.status !== "ACTIVE"
  ) {
    throw new ApplicationError({
      code: "COMPANY_NOT_ACTIVE",
      message: "ไม่พบบริษัทที่เปิดใช้งาน",
      status: 404,
    });
  }

  const shared = await orgRef.collection("leaveTypes").limit(201).get();

  if (shared.size > 200) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_LIST_LIMIT",
      message: "ประเภทลามากเกินขนาดที่รองรับ",
      status: 409,
    });
  }

  // ระหว่างย้ายระบบ ให้หน้าเดิมยังอ่านประเภทลาของบริษัทได้
  const snapshot = shared.empty
    ? await companyRef.collection("leaveTypes").limit(201).get()
    : shared;

  if (snapshot.size > 200) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_LIST_LIMIT",
      message: "ประเภทลามากเกินขนาดที่รองรับ",
      status: 409,
    });
  }

  return snapshot.docs
    .map((document) => ({
      id: document.id,
      ...document.data(),
    }))
    .filter((item) => item.isDeleted !== true)
    .sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th"));
}

export async function createCustomLeaveTypeConfig({
  organizationId,
  data,
  actor,
}) {
  requireCentralAdmin(actor);

  const orgRef = organizationRef(organizationId);
  const companyRef = orgRef.collection("companies").doc(data.companyId);
  const sharedTypesRef = orgRef.collection("leaveTypes");
  const baselineRef = sharedTypesRef.doc("ANNUAL");
  const typeRef = sharedTypesRef.doc(data.code);
  const versionRef = typeRef.collection("versions").doc();
  const auditRef = orgRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, baselineSnapshot, existingType] = await Promise.all(
      [
        transaction.get(companyRef),
        transaction.get(baselineRef),
        transaction.get(typeRef),
      ],
    );

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทที่เลือกไม่พร้อมใช้งาน",
        status: 400,
      });
    }

    if (!baselineSnapshot.exists) {
      throw new ApplicationError({
        code: "LEAVE_POLICY_MIGRATION_REQUIRED",
        message: "ต้องย้ายประเภทลาเดิมขึ้นส่วนกลางก่อนเพิ่มประเภทใหม่",
        status: 409,
      });
    }

    if (existingType.exists) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_CODE_EXISTS",
        message: "รหัสประเภทการลานี้ถูกใช้แล้วในองค์กร",
        status: 409,
      });
    }

    const snapshot = {
      storageScope: "ORGANIZATION",
      code: data.code,
      nameTh: data.nameTh,
      description: data.description,
      countingBasis: data.countingBasis,
      payTreatment: data.payTreatment,
      entitlementDays: data.entitlementDays,
      paidDaysCap: data.paidDaysCap,
      reasonRequired: data.reasonRequired,
      effectiveFrom: data.effectiveFrom,
      status: data.status,
      source: "CUSTOM",
      revision: 1,
      isDeleted: false,
    };

    transaction.create(typeRef, {
      ...snapshot,
      currentVersionId: versionRef.id,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.create(versionRef, {
      ...snapshot,
      versionId: versionRef.id,
      recordedAt: FieldValue.serverTimestamp(),
      recordedBy: actor.uid,
    });

    transaction.create(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_TYPE_CREATE",
      entityType: "LEAVE_TYPE",
      entityId: data.code,
      source: "WEB",
      summary: `Created shared leave type ${data.code}.`,
      before: null,
      after: snapshot,
      metadata: {
        storageScope: "ORGANIZATION",
        versionId: versionRef.id,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    id: data.code,
    code: data.code,
    nameTh: data.nameTh,
    description: data.description,
    countingBasis: data.countingBasis,
    payTreatment: data.payTreatment,
    entitlementDays: data.entitlementDays,
    paidDaysCap: data.paidDaysCap,
    reasonRequired: data.reasonRequired,
    effectiveFrom: data.effectiveFrom,
    status: data.status,
    source: "CUSTOM",
    storageScope: "ORGANIZATION",
    revision: 1,
    currentVersionId: versionRef.id,
  };
}
