import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { decideLeaveApproval } from "@/modules/leave/leave-approval-transition";
import { adminFirestore } from "@/lib/firebase/admin";

function createError(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !value.includes("/")
  );
}

/**
 * actor ต้องมาจาก server session ที่ตรวจ LEAVE_APPROVE แล้ว
 * transaction จะตรวจบัญชีพนักงานและรายชื่อผู้อนุมัติซ้ำ
 */
export async function decideLeaveRequest({
  organizationId,
  leaveRequestId,
  actor,
  decision,
  comment,
}) {
  if (!validId(organizationId) || !validId(leaveRequestId)) {
    throw createError("INVALID_LEAVE_REQUEST_ID", "รหัสใบลาไม่ถูกต้อง", 400);
  }

  if (!actor?.uid || !validId(actor.employeeId)) {
    throw createError(
      "LEAVE_APPROVER_IDENTITY_REQUIRED",
      "ไม่พบข้อมูลพนักงานของผู้อนุมัติ",
      403,
    );
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const leaveRef = organizationRef
    .collection("leaveRequests")
    .doc(leaveRequestId);

  const employeeRef = organizationRef
    .collection("employees")
    .doc(actor.employeeId);

  const membershipRef = organizationRef
    .collection("memberships")
    .doc(actor.uid);

  return adminFirestore.runTransaction(async (transaction) => {
    const [leaveSnapshot, employeeSnapshot, membershipSnapshot] =
      await Promise.all([
        transaction.get(leaveRef),
        transaction.get(employeeRef),
        transaction.get(membershipRef),
      ]);

    if (
      !leaveSnapshot.exists ||
      leaveSnapshot.data()?.isDeleted === true ||
      leaveSnapshot.data()?.organizationId !== organizationId
    ) {
      throw createError("LEAVE_REQUEST_NOT_FOUND", "ไม่พบใบลา", 404);
    }

    const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;

    const membership = membershipSnapshot.exists
      ? membershipSnapshot.data()
      : null;

    if (
      !employee ||
      employee.isDeleted === true ||
      employee.employmentStatus !== "ACTIVE" ||
      employee.userId !== actor.uid ||
      !membership ||
      membership.status !== "ACTIVE" ||
      membership.employeeId !== actor.employeeId
    ) {
      throw createError(
        "LEAVE_APPROVER_ACCOUNT_INVALID",
        "บัญชีผู้อนุมัติไม่พร้อมใช้งาน",
        403,
      );
    }

    const before = leaveSnapshot.data();

    const result = decideLeaveApproval({
      request: before,
      actorEmployeeId: actor.employeeId,
      actorUid: actor.uid,
      decision,
      comment,
      decidedAt: Timestamp.now().toDate(),
    });

    const auditRef = organizationRef.collection("auditLogs").doc();

    const outboxRef = organizationRef.collection("notificationOutbox").doc();

    transaction.update(leaveRef, {
      status: result.status,
      approval: result.approval,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
      revision: FieldValue.increment(1),
    });

    transaction.set(auditRef, {
      organizationId,

      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: actor.role ?? null,
      },

      action: decision === "APPROVE" ? "LEAVE_APPROVE" : "LEAVE_REJECT",

      entityType: "LEAVE_REQUEST",
      entityId: leaveRequestId,
      source: "WEB",

      summary: `Leave decision ${decision} by employee ${actor.employeeId}.`,

      before: {
        status: before.status,

        currentStepIndex: before.approval?.currentStepIndex ?? null,
      },

      after: {
        status: result.status,

        currentStepIndex: result.approval.currentStepIndex,

        decision,

        decidedByEmployeeId: actor.employeeId,
      },

      metadata: {
        companyId: before.companyId ?? null,
        step: result.event.step,
      },

      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(outboxRef, {
      organizationId,

      companyId: before.companyId ?? null,

      type: "LEAVE_DECISION_RECORDED",

      status: "PENDING",
      leaveRequestId,

      requesterEmployeeId: before.employeeId,

      actorEmployeeId: actor.employeeId,

      decision,
      resultStatus: result.status,

      currentStepIndex: result.approval.currentStepIndex,

      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      leaveRequestId,
      status: result.status,

      currentStepIndex: result.approval.currentStepIndex,

      decisionByEmployeeId: actor.employeeId,

      decidedAt: result.event.decidedAt,
    };
  });
}
