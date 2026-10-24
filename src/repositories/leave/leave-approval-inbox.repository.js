import "server-only";

import { ROLES } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { listActiveLeaveHrDelegations } from "@/repositories/leave/leave-hr-delegation.repository";

const MAX_PENDING_REQUESTS = 1000;
const HR_ROLES = new Set([ROLES.HR_ADMIN, ROLES.HR_OFFICER]);

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

function toIsoDateTime(value) {
  if (typeof value?.toDate !== "function") {
    return null;
  }

  return value.toDate().toISOString();
}

function getAssignedStep(approval, employeeId) {
  if (!Array.isArray(approval?.steps)) {
    return null;
  }

  if (approval.mode === "PARALLEL_ALL") {
    return (
      approval.steps.find(
        (step) =>
          step.status === "PENDING" &&
          step.approverEmployeeIds?.includes(employeeId),
      ) ?? null
    );
  }

  const index = approval.currentStepIndex;

  if (!Number.isInteger(index)) {
    return null;
  }

  const step = approval.steps[index];

  if (
    step?.status !== "PENDING" ||
    !step.approverEmployeeIds?.includes(employeeId) ||
    step.approvals?.some((entry) => entry.actorEmployeeId === employeeId)
  ) {
    return null;
  }

  return step;
}

export async function listMyPendingLeaveApprovals({
  organizationId,
  uid,
  employeeId,
}) {
  if (!organizationId || !uid || !employeeId) {
    fail(
      "LEAVE_APPROVER_EMPLOYEE_REQUIRED",
      "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงานผู้อนุมัติ",
      403,
    );
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const [membershipSnapshot, employeeSnapshot, pendingSnapshot] =
    await Promise.all([
      organizationRef.collection("memberships").doc(uid).get(),
      organizationRef.collection("employees").doc(employeeId).get(),
      organizationRef
        .collection("leaveRequests")
        .where("status", "==", "PENDING_APPROVAL")
        .limit(MAX_PENDING_REQUESTS + 1)
        .get(),
    ]);

  const membership = membershipSnapshot.data();
  const employee = employeeSnapshot.data();

  if (
    !membershipSnapshot.exists ||
    membership?.isDeleted === true ||
    membership.status !== "ACTIVE" ||
    membership.employeeId !== employeeId ||
    !employeeSnapshot.exists ||
    employee?.isDeleted === true ||
    employee.employmentStatus !== "ACTIVE" ||
    employee.accessStatus !== "ACTIVE" ||
    employee.userId !== uid
  ) {
    fail(
      "LEAVE_APPROVER_ACCOUNT_INVALID",
      "บัญชีผู้อนุมัติไม่พร้อมใช้งาน",
      403,
    );
  }

  if (pendingSnapshot.size > MAX_PENDING_REQUESTS) {
    fail(
      "LEAVE_APPROVAL_INBOX_LIMIT",
      "จำนวนใบลารออนุมัติเกินขนาดที่รายการนี้รองรับ",
    );
  }

  let companyAccess = null;

  if (HR_ROLES.has(membership.role)) {
    try {
      companyAccess = resolveCompanyAccess({
        role: membership.role,
        companyAccess: membership.companyAccess,
      });
    } catch {
      // HR ที่ตั้งค่าสิทธิ์บริษัทผิดจะไม่เห็นงาน HR
    }
  }

  const activeDelegations = await listActiveLeaveHrDelegations({
    organizationId,
    employeeId,
  });

  const delegatedCompanyIds = new Set(
    activeDelegations
      .filter((item) => item.delegateUid === uid)
      .map((item) => item.companyId),
  );

  return pendingSnapshot.docs
    .flatMap((snapshot) => {
      const request = snapshot.data();

      if (
        request.isDeleted === true ||
        request.organizationId !== organizationId ||
        request.employeeId === employeeId
      ) {
        return [];
      }

      const step = getAssignedStep(request.approval, employeeId);

      if (!step) {
        return [];
      }

      if (step.key === "HR") {
        const normalHrAccess =
          companyAccess && canAccessCompany(companyAccess, request.companyId);

        const delegatedAccess = delegatedCompanyIds.has(request.companyId);

        if (!normalHrAccess && !delegatedAccess) {
          return [];
        }
      }

      return [
        {
          id: snapshot.id,
          companyId: request.companyId,
          employeeId: request.employeeId,
          employeeCode: request.employeeCode ?? null,
          leaveTypeCode: request.leaveTypeCode,
          startDate: request.startDate,
          endDate: request.endDate,
          dayPart: request.dayPart,
          requestedDays: request.requestedDays,
          reason: request.reason ?? "",
          excessDays: request.excessDays ?? 0,
          track: step.key ?? "MANAGER",
          approvalMode:
            request.approval.mode === "PARALLEL_ALL"
              ? "PARALLEL_ALL"
              : "SEQUENTIAL",
          submittedAt: toIsoDateTime(request.submittedAt),
        },
      ];
    })
    .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
}
