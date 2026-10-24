import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions, ROLES } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const HR_ROLES = new Set([ROLES.HR_ADMIN, ROLES.HR_OFFICER]);

function fail(code, message, status = 409) {
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

function hasPermission(membership, permission) {
  const direct = Array.isArray(membership.permissions)
    ? membership.permissions
    : [];

  const denied = Array.isArray(membership.deniedPermissions)
    ? membership.deniedPermissions
    : [];

  return (
    !denied.includes(permission) &&
    (getRolePermissions(membership.role).includes(permission) ||
      direct.includes(permission))
  );
}

function hasCompanyAccess(membership, companyId) {
  try {
    return canAccessCompany(
      resolveCompanyAccess({
        role: membership.role,
        companyAccess: membership.companyAccess,
      }),
      companyId,
    );
  } catch {
    return false;
  }
}

export async function reassignPendingLeaveHrApprover({
  organizationId,
  leaveRequestId,
  targetEmployeeId,
  actor,
}) {
  if (!validId(leaveRequestId) || !validId(targetEmployeeId)) {
    fail("LEAVE_APPROVER_ID_INVALID", "รหัสใบลาหรือ HR ไม่ถูกต้อง", 400);
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const leaveRef = organizationRef
    .collection("leaveRequests")
    .doc(leaveRequestId);

  const targetEmployeeRef = organizationRef
    .collection("employees")
    .doc(targetEmployeeId);

  const actorMembershipRef = organizationRef
    .collection("memberships")
    .doc(actor.uid);

  return adminFirestore.runTransaction(async (transaction) => {
    const [leaveSnapshot, targetEmployeeSnapshot, actorMembershipSnapshot] =
      await Promise.all([
        transaction.get(leaveRef),
        transaction.get(targetEmployeeRef),
        transaction.get(actorMembershipRef),
      ]);

    const leave = leaveSnapshot.data();
    const targetEmployee = targetEmployeeSnapshot.data();
    const actorMembership = actorMembershipSnapshot.data();

    if (
      !leaveSnapshot.exists ||
      leave?.isDeleted === true ||
      leave?.organizationId !== organizationId
    ) {
      fail("LEAVE_REQUEST_NOT_FOUND", "ไม่พบใบลา", 404);
    }

    if (
      !actorMembershipSnapshot.exists ||
      actorMembership?.isDeleted === true ||
      actorMembership.status !== "ACTIVE" ||
      !hasPermission(actorMembership, PERMISSIONS.LEAVE_WORKFLOW_MANAGE) ||
      !hasCompanyAccess(actorMembership, leave.companyId)
    ) {
      fail(
        "LEAVE_WORKFLOW_ACCESS_DENIED",
        "ไม่มีสิทธิ์จัดผู้อนุมัติของบริษัทนี้",
        403,
      );
    }

    if (
      leave.status !== "PENDING_APPROVAL" ||
      leave.approval?.mode !== "PARALLEL_ALL" ||
      !Array.isArray(leave.approval.steps)
    ) {
      fail(
        "LEAVE_HR_REASSIGNMENT_NOT_ALLOWED",
        "ใบลานี้ไม่ได้อยู่ระหว่างรออนุมัติสองฝ่าย",
      );
    }

    const hrIndex = leave.approval.steps.findIndex((step) => step.key === "HR");

    const managerStep = leave.approval.steps.find(
      (step) => step.key === "MANAGER",
    );

    const currentHrStep = leave.approval.steps[hrIndex];

    if (hrIndex < 0 || !managerStep || currentHrStep.status !== "PENDING") {
      fail(
        "LEAVE_HR_STEP_ALREADY_DECIDED",
        "งาน HR มีผลการตัดสินใจแล้วหรือถูกปิด กรุณาโหลดข้อมูลใหม่",
      );
    }

    if (
      targetEmployeeId === leave.employeeId ||
      managerStep.approverEmployeeIds?.includes(targetEmployeeId)
    ) {
      fail(
        "LEAVE_HR_APPROVER_CONFLICT",
        "HR คนใหม่ต้องไม่ใช่ผู้ขอลาหรือผู้อนุมัติฝั่งหัวหน้า",
        400,
      );
    }

    if (
      !targetEmployeeSnapshot.exists ||
      targetEmployee?.isDeleted === true ||
      targetEmployee.employmentStatus !== "ACTIVE" ||
      targetEmployee.accessStatus !== "ACTIVE" ||
      !validId(targetEmployee.userId)
    ) {
      fail(
        "LEAVE_HR_APPROVER_INACTIVE",
        "บัญชีพนักงาน HR คนใหม่ไม่พร้อมใช้งาน",
        400,
      );
    }

    const targetMembershipRef = organizationRef
      .collection("memberships")
      .doc(targetEmployee.userId);

    // ยังไม่มี write จึงอ่าน membership เพิ่มใน transaction ได้
    const targetMembershipSnapshot = await transaction.get(targetMembershipRef);

    const targetMembership = targetMembershipSnapshot.data();

    if (
      !targetMembershipSnapshot.exists ||
      targetMembership?.isDeleted === true ||
      targetMembership.status !== "ACTIVE" ||
      targetMembership.employeeId !== targetEmployeeId ||
      !HR_ROLES.has(targetMembership.role) ||
      !hasPermission(targetMembership, PERMISSIONS.LEAVE_APPROVE) ||
      !hasCompanyAccess(targetMembership, leave.companyId)
    ) {
      fail(
        "LEAVE_HR_APPROVER_ACCESS_DENIED",
        "HR คนใหม่ไม่มีสิทธิ์อนุมัติใบลาของบริษัทนี้",
        400,
      );
    }

    const previousIds = currentHrStep.approverEmployeeIds ?? [];

    if (previousIds.length === 1 && previousIds[0] === targetEmployeeId) {
      fail("LEAVE_HR_APPROVER_UNCHANGED", "HR คนนี้เป็นผู้รับงานอยู่แล้ว");
    }

    const steps = leave.approval.steps.map((step, index) =>
      index === hrIndex
        ? {
            ...step,
            approverEmployeeIds: [targetEmployeeId],
          }
        : step,
    );

    const auditRef = organizationRef.collection("auditLogs").doc();

    const outboxRef = organizationRef.collection("notificationOutbox").doc();

    transaction.update(leaveRef, {
      approval: {
        ...leave.approval,
        steps,
      },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
      revision: FieldValue.increment(1),
    });

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: actorMembership.role,
      },
      action: "LEAVE_HR_APPROVER_REASSIGN",
      entityType: "LEAVE_REQUEST",
      entityId: leaveRequestId,
      source: "WEB",
      summary: `Reassigned pending HR approval for leave ${leaveRequestId}.`,
      before: {
        hrApproverEmployeeIds: previousIds,
      },
      after: {
        hrApproverEmployeeIds: [targetEmployeeId],
      },
      metadata: {
        companyId: leave.companyId,
        requesterEmployeeId: leave.employeeId,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(outboxRef, {
      organizationId,
      companyId: leave.companyId,
      type: "LEAVE_HR_APPROVER_REASSIGNED",
      status: "PENDING",
      leaveRequestId,
      previousApproverEmployeeIds: previousIds,
      newApproverEmployeeId: targetEmployeeId,
      actorUid: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      leaveRequestId,
      status: leave.status,
      hrApproverEmployeeId: targetEmployeeId,
    };
  });
}
