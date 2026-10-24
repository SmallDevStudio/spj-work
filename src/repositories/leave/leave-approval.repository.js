import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { decideLeaveApproval } from "@/modules/leave/leave-approval-transition";
import { decideParallelLeaveApproval } from "@/modules/leave/leave-parallel-approval-transition";
import { ROLES } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { listActiveLeaveHrDelegations } from "@/repositories/access/leave-approval-delegation.repository";

function fail(code, message, status) {
  throw new ApplicationError({ code, message, status });
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !value.includes("/")
  );
}

function decideWithExpectedErrorMapping(input, isParallel) {
  try {
    return isParallel
      ? decideParallelLeaveApproval(input)
      : decideLeaveApproval(input);
  } catch (error) {
    if (
      error?.code &&
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status < 500
    ) {
      throw new ApplicationError({
        code: error.code,
        message: error.message,
        status: error.status,
        details: error.details ?? null,
      });
    }

    throw error;
  }
}

/**
 * actor ต้องมาจาก session ที่ผ่านการตรวจ LEAVE_APPROVE
 * การอ่านสถานะและบันทึกผลอยู่ใน transaction เดียวกัน
 */
export async function decideLeaveRequest({
  organizationId,
  leaveRequestId,
  actor,
  decision,
  comment,
  financialDisposition = null,
  financialReason = null,
}) {
  if (!validId(organizationId) || !validId(leaveRequestId)) {
    fail("INVALID_LEAVE_REQUEST_ID", "รหัสใบลาไม่ถูกต้อง", 400);
  }

  if (!actor?.uid || !validId(actor.employeeId)) {
    fail(
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
      fail("LEAVE_REQUEST_NOT_FOUND", "ไม่พบใบลา", 404);
    }

    const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;

    const membership = membershipSnapshot.exists
      ? membershipSnapshot.data()
      : null;

    if (
      !employee ||
      employee.isDeleted === true ||
      employee.employmentStatus !== "ACTIVE" ||
      employee.accessStatus !== "ACTIVE" ||
      employee.userId !== actor.uid ||
      !membership ||
      membership.status !== "ACTIVE" ||
      membership.employeeId !== actor.employeeId
    ) {
      fail(
        "LEAVE_APPROVER_ACCOUNT_INVALID",
        "บัญชีผู้อนุมัติไม่พร้อมใช้งาน",
        403,
      );
    }

    const before = leaveSnapshot.data();
    const isParallel = before.approval?.mode === "PARALLEL_ALL";
    const pendingHrStep = isParallel
      ? before.approval.steps?.find(
          (step) =>
            step.key === "HR" &&
            step.status === "PENDING" &&
            step.approverEmployeeIds?.includes(actor.employeeId),
        )
      : null;

    if (pendingHrStep) {
      let normalHrAccess = false;

      if ([ROLES.HR_ADMIN, ROLES.HR_OFFICER].includes(membership.role)) {
        try {
          normalHrAccess = canAccessCompany(
            resolveCompanyAccess({
              role: membership.role,
              companyAccess: membership.companyAccess,
            }),
            before.companyId,
          );
        } catch {
          normalHrAccess = false;
        }
      }

      const activeDelegations = await listActiveLeaveHrDelegations({
        organizationId,
        employeeId: actor.employeeId,
        companyId: before.companyId,
        transaction,
      });

      const delegatedAccess = activeDelegations.some(
        (item) => item.delegateUid === actor.uid,
      );

      if (!normalHrAccess && !delegatedAccess) {
        throw new ApplicationError({
          code: "LEAVE_HR_APPROVER_ACCESS_REVOKED",
          message:
            "สิทธิ์ HR สำหรับบริษัทนี้หมดอายุหรือถูกยกเลิกแล้ว กรุณาให้ผู้ดูแลมอบหมายใหม่",
          status: 403,
        });
      }
    }

    const result = decideWithExpectedErrorMapping(
      {
        request: before,
        actorEmployeeId: actor.employeeId,
        actorUid: actor.uid,
        decision,
        comment,
        financialDisposition,
        financialReason,
        decidedAt: Timestamp.now().toDate(),
      },
      isParallel,
    );

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
        approvalMode: before.approval?.mode ?? "SEQUENTIAL",
        currentStepIndex: before.approval?.currentStepIndex ?? null,
      },
      after: {
        status: result.status,
        decision,
        track: result.event.track ?? null,
        step: result.event.step ?? null,
        decidedByEmployeeId: actor.employeeId,
        currentStepIndex: result.approval.currentStepIndex ?? null,
      },
      metadata: {
        companyId: before.companyId ?? null,
        financialDisposition:
          result.event.track === "HR" && decision === "APPROVE"
            ? financialDisposition
            : null,
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
      track: result.event.track ?? null,
      currentStepIndex: result.approval.currentStepIndex ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      leaveRequestId,
      status: result.status,
      track: result.event.track ?? null,
      currentStepIndex: result.approval.currentStepIndex ?? null,
      decisionByEmployeeId: actor.employeeId,
      decidedAt: result.event.decidedAt,
    };
  });
}
