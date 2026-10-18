import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

export async function listLeaveTemplates({ organizationId, companyId }) {
  const organizationRef = getOrganizationRef(organizationId);
  const companyRef = organizationRef.collection("companies").doc(companyId);

  const companySnapshot = await companyRef.get();

  if (
    !companySnapshot.exists ||
    companySnapshot.data()?.isDeleted === true ||
    companySnapshot.data()?.status !== "ACTIVE"
  ) {
    throw new ApplicationError({
      code: "COMPANY_NOT_ACTIVE",
      message: "บริษัทไม่ได้เปิดใช้งาน",
      status: 404,
    });
  }

  const sharedSnapshot = await organizationRef
    .collection("leaveTemplates")
    .limit(201)
    .get();

  if (sharedSnapshot.size > 200) {
    throw new ApplicationError({
      code: "LEAVE_TEMPLATE_LIST_TOO_LARGE",
      message: "มี Leave Template เกินขนาดที่หน้ารายการรองรับ",
      status: 409,
    });
  }

  // ระหว่างย้ายระบบ ให้อ่านข้อมูลเดิมจนกว่าจะมี Template ส่วนกลาง
  const snapshot = sharedSnapshot.empty
    ? await companyRef.collection("leaveTemplates").limit(201).get()
    : sharedSnapshot;

  if (snapshot.size > 200) {
    throw new ApplicationError({
      code: "LEAVE_TEMPLATE_LIST_TOO_LARGE",
      message: "มี Leave Template เกินขนาดที่หน้ารายการรองรับ",
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

export async function createLeaveTemplate({
  organizationId,
  data,
  entries,
  actor,
}) {
  if (actor.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "LEAVE_TEMPLATE_CENTRAL_ADMIN_REQUIRED",
      message: "เฉพาะผู้ดูแลนโยบายส่วนกลางเท่านั้นที่เพิ่ม Leave Template ได้",
      status: 403,
    });
  }

  const organizationRef = getOrganizationRef(organizationId);
  const companyRef = organizationRef
    .collection("companies")
    .doc(data.companyId);

  const sharedCollection = organizationRef.collection("leaveTemplates");
  const baselineRef = sharedCollection.doc("STAFF01");
  const templateRef = sharedCollection.doc(data.code);
  const versionRef = templateRef.collection("versions").doc();
  const auditRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, baselineSnapshot, existingTemplate] =
      await Promise.all([
        transaction.get(companyRef),
        transaction.get(baselineRef),
        transaction.get(templateRef),
      ]);

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
        code: "LEAVE_TEMPLATE_MIGRATION_REQUIRED",
        message: "ต้องย้าย Leave Template เดิมขึ้นส่วนกลางก่อนเพิ่มรายการใหม่",
        status: 409,
      });
    }

    if (existingTemplate.exists) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_CODE_EXISTS",
        message: "รหัส Leave Template นี้ถูกใช้แล้วในองค์กร",
        status: 409,
      });
    }

    const snapshot = {
      storageScope: "ORGANIZATION",
      code: data.code,
      nameTh: data.nameTh,
      description: data.description,
      effectiveFrom: data.effectiveFrom,
      status: data.status,
      revision: 1,
      entries,
      isDeleted: false,
    };

    transaction.create(templateRef, {
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
      action: "LEAVE_TEMPLATE_CREATE",
      entityType: "LEAVE_TEMPLATE",
      entityId: data.code,
      source: "WEB",
      summary: `Created shared leave template ${data.code}.`,
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
    effectiveFrom: data.effectiveFrom,
    status: data.status,
    storageScope: "ORGANIZATION",
    revision: 1,
    currentVersionId: versionRef.id,
    entries,
  };
}
