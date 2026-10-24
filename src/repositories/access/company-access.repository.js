import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function getMembershipCompanyAccess({ organizationId, uid }) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("memberships")
    .doc(uid)
    .get();

  if (!snapshot.exists || snapshot.data()?.isDeleted === true) {
    throw new ApplicationError({
      code: "MEMBERSHIP_NOT_FOUND",
      message: "ไม่พบผู้ใช้งานในองค์กรนี้",
      status: 404,
    });
  }

  return {
    uid: snapshot.id,
    role: snapshot.data().role,
    companyAccess: snapshot.data().companyAccess ?? null,
  };
}

export async function saveMembershipCompanyAccess({
  organizationId,
  targetUid,
  companyAccess,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const membershipRef = organizationRef
    .collection("memberships")
    .doc(targetUid);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const companyRefs = companyAccess.companyIds.map((companyId) =>
      organizationRef.collection("companies").doc(companyId),
    );

    // Firestore ต้องอ่านทุก document ก่อนเริ่มเขียนใน transaction
    const [membershipSnapshot, ...companySnapshots] = await Promise.all([
      transaction.get(membershipRef),
      ...companyRefs.map((ref) => transaction.get(ref)),
    ]);

    if (
      !membershipSnapshot.exists ||
      membershipSnapshot.data()?.isDeleted === true ||
      membershipSnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "MEMBERSHIP_NOT_ACTIVE",
        message: "ไม่พบบัญชีที่เปิดใช้งานในองค์กรนี้",
        status: 404,
      });
    }

    if (
      companySnapshots.some(
        (snapshot) =>
          !snapshot.exists ||
          snapshot.data()?.isDeleted === true ||
          snapshot.data()?.status !== "ACTIVE",
      )
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทที่เลือกไม่มีอยู่หรือไม่ได้เปิดใช้งาน",
        status: 400,
      });
    }

    const previousAccess = membershipSnapshot.data().companyAccess ?? null;

    transaction.update(membershipRef, {
      companyAccess,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditLogRef, {
      organizationId,
      actor,
      action: "USER_COMPANY_ACCESS_UPDATE",
      entityType: "MEMBERSHIP",
      entityId: targetUid,
      source: "WEB",
      summary: `Updated company access for user ${targetUid}.`,
      before: { companyAccess: previousAccess },
      after: { companyAccess },
      metadata: { targetUid },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    uid: targetUid,
    companyAccess,
  };
}

export async function listMembershipsForCompanyAccess({ organizationId }) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const memberships = [];
  let cursor = null;

  while (true) {
    let query = organizationRef
      .collection("memberships")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();

    memberships.push(...page.docs);
    cursor = page.docs.at(-1) ?? null;

    if (memberships.length > 1000) {
      throw new ApplicationError({
        code: "MEMBERSHIP_LIST_TOO_LARGE",
        message: "จำนวนผู้ใช้เกินขนาดที่หน้าจอนี้รองรับ",
        status: 409,
      });
    }

    if (page.size < 100) break;
  }

  const activeMemberships = memberships.filter(
    (snapshot) =>
      snapshot.data()?.isDeleted !== true &&
      snapshot.data()?.status === "ACTIVE",
  );

  const userSnapshots = await Promise.all(
    activeMemberships.map((snapshot) =>
      adminFirestore.collection("users").doc(snapshot.id).get(),
    ),
  );

  return activeMemberships
    .map((snapshot, index) => {
      const membership = snapshot.data();
      const user = userSnapshots[index].data() ?? {};

      return {
        uid: snapshot.id,
        email: user.email ?? membership.email ?? "",
        displayName: user.displayName ?? user.name ?? "",
        role: membership.role,
        companyAccess: membership.companyAccess ?? null,
      };
    })
    .sort((a, b) =>
      (a.email || a.displayName || a.uid).localeCompare(
        b.email || b.displayName || b.uid,
        "th",
      ),
    );
}
