import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function updateLeaveTypeConfig({
  organizationId,
  companyId,
  code,
  data,
  actor,
}) {
  if (actor.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "LEAVE_POLICY_CENTRAL_ADMIN_REQUIRED",
      message: "เฉพาะผู้ดูแลนโยบายส่วนกลางเท่านั้นที่แก้ประเภทลาได้",
      status: 403,
    });
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef.collection("companies").doc(companyId);

  const typeRef = organizationRef.collection("leaveTypes").doc(code);
  const versionRef = typeRef.collection("versions").doc();
  const auditRef = organizationRef.collection("auditLogs").doc();

  let result;

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, typeSnapshot] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(typeRef),
    ]);

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทไม่ได้เปิดใช้งาน",
        status: 400,
      });
    }

    if (!typeSnapshot.exists || typeSnapshot.data()?.isDeleted === true) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_NOT_FOUND",
        message: "ไม่พบประเภทการลาส่วนกลาง กรุณาย้ายข้อมูลเดิมก่อนแก้ไข",
        status: 404,
      });
    }

    const previous = typeSnapshot.data();

    if (data.effectiveFrom <= previous.effectiveFrom) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_EFFECTIVE_DATE_CONFLICT",
        message:
          "วันที่เริ่มใช้ revision ใหม่ต้องหลังวันที่เริ่มใช้ revision ปัจจุบัน",
        status: 409,
      });
    }

    const nextRevision = (previous.revision ?? 1) + 1;

    const next = {
      storageScope: "ORGANIZATION",
      code,
      nameTh: data.nameTh,
      description: data.description,
      countingBasis: data.countingBasis,
      payTreatment: data.payTreatment,
      entitlementDays: data.entitlementDays,
      paidDaysCap: data.paidDaysCap,
      reasonRequired: data.reasonRequired,
      effectiveFrom: data.effectiveFrom,
      status: data.status,
      source: previous.source ?? "CUSTOM",
      revision: nextRevision,
      isDeleted: false,
    };

    transaction.update(typeRef, {
      ...next,
      currentVersionId: versionRef.id,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.create(versionRef, {
      ...next,
      versionId: versionRef.id,
      recordedAt: FieldValue.serverTimestamp(),
      recordedBy: actor.uid,
    });

    transaction.create(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_TYPE_UPDATE",
      entityType: "LEAVE_TYPE",
      entityId: code,
      source: "WEB",
      summary:
        `Updated shared leave type ${code} ` + `to revision ${nextRevision}.`,
      before: {
        revision: previous.revision,
        versionId: previous.currentVersionId,
        effectiveFrom: previous.effectiveFrom,
        nameTh: previous.nameTh,
        entitlementDays: previous.entitlementDays,
        paidDaysCap: previous.paidDaysCap,
        payTreatment: previous.payTreatment,
        status: previous.status,
      },
      after: {
        ...next,
        versionId: versionRef.id,
      },
      metadata: {
        storageScope: "ORGANIZATION",
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    result = {
      id: code,
      ...next,
      currentVersionId: versionRef.id,
    };
  });

  return result;
}
