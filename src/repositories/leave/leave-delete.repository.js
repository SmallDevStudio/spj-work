import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ROLES } from "@/constants/roles";
import { canAccessCompany, resolveCompanyAccess } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

export async function deleteLeaveRequest({
  organizationId,
  requestId,
  actor,
  reason,
}) {
  const organizationRef = adminFirestore.collection("organizations").doc(organizationId);
  const requestRef = organizationRef.collection("leaveRequests").doc(requestId);
  const actorRef = organizationRef.collection("memberships").doc(actor.uid);

  return adminFirestore.runTransaction(async (transaction) => {
    const [requestSnapshot, actorSnapshot] = await Promise.all([
      transaction.get(requestRef),
      transaction.get(actorRef),
    ]);

    const request = requestSnapshot.data();
    const membership = actorSnapshot.data();

    if (!requestSnapshot.exists || request?.organizationId !== organizationId || request.isDeleted === true) {
      fail("LEAVE_REQUEST_NOT_FOUND", "ไม่พบใบลาที่ต้องการลบ", 404);
    }

    if (
      !actorSnapshot.exists ||
      membership?.isDeleted === true ||
      membership.status !== "ACTIVE" ||
      ![ROLES.SUPERADMIN, ROLES.ADMIN].includes(membership.role)
    ) {
      fail("LEAVE_DELETE_DENIED", "เฉพาะ SUPERADMIN หรือ ADMIN ที่ลบใบลาได้", 403);
    }

    let companyAccess;

    try {
      companyAccess = resolveCompanyAccess({
        role: membership.role,
        companyAccess: membership.companyAccess,
      });
    } catch {
      fail("LEAVE_DELETE_COMPANY_DENIED", "สิทธิ์บริษัทไม่ถูกต้อง", 403);
    }

    if (!canAccessCompany(companyAccess, request.companyId)) {
      fail("LEAVE_DELETE_COMPANY_DENIED", "ไม่มีสิทธิ์ลบใบลาของบริษัทนี้", 403);
    }

    const restoredDays =
      request.status === "APPROVED" && typeof request.requestedDays === "number"
        ? request.requestedDays
        : 0;
    const releasedPendingDays =
      request.status === "PENDING_APPROVAL" && typeof request.requestedDays === "number"
        ? request.requestedDays
        : 0;

    const auditRef = organizationRef.collection("auditLogs").doc();
    const outboxRef = organizationRef.collection("notificationOutbox").doc();

    transaction.update(requestRef, {
      isDeleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: actor.uid,
      deletedReason: reason,
      revision: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: membership.role,
      },
      action: "LEAVE_REQUEST_DELETE",
      entityType: "LEAVE_REQUEST",
      entityId: requestId,
      source: "WEB",
      summary: `Soft-deleted leave request ${requestId}.`,
      before: {
        status: request.status,
        isDeleted: false,
        requestedDays: request.requestedDays ?? null,
      },
      after: {
        isDeleted: true,
        restoredDays,
        releasedPendingDays,
      },
      metadata: {
        companyId: request.companyId,
        employeeId: request.employeeId,
        leaveTypeCode: request.leaveTypeCode,
        reason,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(outboxRef, {
      organizationId,
      companyId: request.companyId,
      type: "LEAVE_REQUEST_DELETED",
      status: "PENDING",
      leaveRequestId: requestId,
      requesterEmployeeId: request.employeeId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // ยอดวันลาคำนวณจากใบลาที่ไม่ถูกลบ จึงคืนวันทันทีที่ commit สำเร็จ
    // ไม่เขียน opening balance หรือ entitlement ซ้ำ
    return {
      id: requestId,
      isDeleted: true,
      restoredDays,
      releasedPendingDays,
    };
  });
}
