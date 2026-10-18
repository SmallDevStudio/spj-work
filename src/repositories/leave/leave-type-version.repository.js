import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

async function resolveLeaveTypeRef({ organizationId, companyId, code }) {
  const organizationRef = getOrganizationRef(organizationId);

  // โครงสร้างใหม่: ประเภทลาใช้ร่วมกันทั้งองค์กร
  const sharedRef = organizationRef.collection("leaveTypes").doc(code);
  const sharedSnapshot = await sharedRef.get();

  if (sharedSnapshot.exists) {
    return { ref: sharedRef, snapshot: sharedSnapshot };
  }

  // ช่วงเปลี่ยนผ่านเท่านั้น: อ่านข้อมูลเดิมที่เคยแยกตามบริษัท
  if (companyId) {
    const legacyRef = organizationRef
      .collection("companies")
      .doc(companyId)
      .collection("leaveTypes")
      .doc(code);

    const legacySnapshot = await legacyRef.get();

    if (legacySnapshot.exists) {
      return { ref: legacyRef, snapshot: legacySnapshot };
    }
  }

  throw new ApplicationError({
    code: "LEAVE_TYPE_NOT_FOUND",
    message: `ไม่พบประเภทการลา ${code}`,
    status: 404,
  });
}

export async function getEffectiveLeaveTypeVersion({
  organizationId,
  companyId,
  code,
  onDate,
}) {
  const { ref: typeRef, snapshot: typeSnapshot } = await resolveLeaveTypeRef({
    organizationId,
    companyId,
    code,
  });

  if (typeSnapshot.data()?.isDeleted === true) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_NOT_FOUND",
      message: `ไม่พบประเภทการลา ${code}`,
      status: 404,
    });
  }

  const versions = [];
  let cursor = null;

  while (true) {
    let query = typeRef.collection("versions").orderBy("__name__").limit(100);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();

    versions.push(
      ...page.docs.map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      })),
    );

    if (versions.length > 1000) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_VERSION_LIMIT",
        message: "จำนวน revision ของประเภทการลาเกินขนาดที่รองรับ",
        status: 409,
      });
    }

    cursor = page.docs.at(-1) ?? null;

    if (page.size < 100) {
      break;
    }
  }

  const applicable = versions
    .filter((version) => version.effectiveFrom <= onDate)
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        (b.revision ?? 0) - (a.revision ?? 0),
    );

  const effectiveVersion = applicable[0];

  if (!effectiveVersion) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_NOT_EFFECTIVE",
      message: `ประเภทการลา ${code} ยังไม่มี revision ที่มีผลในวันที่ ${onDate}`,
      status: 409,
    });
  }

  if (effectiveVersion.status !== "ACTIVE") {
    throw new ApplicationError({
      code: "LEAVE_TYPE_INACTIVE",
      message: `ประเภทการลา ${code} ไม่เปิดใช้งานในวันที่ ${onDate}`,
      status: 409,
    });
  }

  return {
    ...effectiveVersion,
    versionPath: typeRef.collection("versions").doc(effectiveVersion.id).path,
  };
}
