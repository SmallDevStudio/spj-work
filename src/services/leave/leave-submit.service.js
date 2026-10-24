import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { PERMISSIONS } from "@/constants/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { resolveLeaveApprovalPlan } from "@/modules/leave/leave-approver-plan";
import { createLeaveSubmissionPolicy } from "@/modules/leave/leave-submission-policy";
import {
  calculateLeaveUsage,
  findOverlappingLeaveRequest,
} from "@/modules/leave/leave-usage";
import { prepareLeaveSubmission } from "@/modules/leave/prepare-leave-submission";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getEmployeeLeaveBalance } from "@/repositories/leave/leave-balance.repository";
import { getLeaveEntitlementSource } from "@/repositories/leave/leave-entitlement-source.repository";
import { listHrLeaveApproverEmployeeIds } from "@/repositories/leave/leave-hr-approver.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";
import { getLeaveDayContext } from "@/services/leave/leave-day-context.service";

const MAX_REQUESTS = 1000;

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

function toApplicationError(error, fallbackCode) {
  if (error instanceof ApplicationError) {
    return error;
  }

  return new ApplicationError({
    code: error?.code ?? fallbackCode,
    message: error?.message ?? "ยังไม่สามารถส่งใบลาได้",
    status: error?.status ?? 409,
  });
}

export async function submitOwnLeaveDraft({ currentSession, requestId }) {
  if (!currentSession.access.permissions.includes(PERMISSIONS.LEAVE_REQUEST)) {
    fail("LEAVE_REQUEST_PERMISSION_DENIED", "ไม่มีสิทธิ์ส่งใบลา", 403);
  }

  if (!validId(requestId)) {
    fail("LEAVE_REQUEST_ID_INVALID", "รหัสใบลาไม่ถูกต้อง", 400);
  }

  const organizationId = currentSession.access.organization.id;
  const employeeId = currentSession.access.membership.employeeId;
  const uid = currentSession.identity.uid;

  if (!employeeId) {
    fail(
      "LEAVE_REQUEST_EMPLOYEE_REQUIRED",
      "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",
      403,
    );
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const leaveRef = organizationRef.collection("leaveRequests").doc(requestId);

  const draftSnapshot = await leaveRef.get();
  const draft = draftSnapshot.data();

  if (
    !draftSnapshot.exists ||
    draft?.isDeleted === true ||
    draft?.organizationId !== organizationId ||
    draft?.employeeId !== employeeId ||
    draft?.userId !== uid
  ) {
    fail("LEAVE_REQUEST_NOT_FOUND", "ไม่พบฉบับร่างของคุณ", 404);
  }

  if (draft.status !== "DRAFT") {
    fail(
      "LEAVE_DRAFT_ALREADY_SUBMITTED",
      "ใบลานี้ถูกส่งแล้ว กรุณาโหลดข้อมูลใหม่",
    );
  }

  const employee = await getEmployeeById({
    organizationId,
    employeeId,
  });

  if (
    !employee ||
    employee.isDeleted === true ||
    employee.employmentStatus !== "ACTIVE" ||
    employee.accessStatus !== "ACTIVE" ||
    employee.userId !== uid ||
    !employee.companyId ||
    employee.companyId !== draft.companyId
  ) {
    fail(
      "LEAVE_REQUEST_EMPLOYEE_INVALID",
      "ข้อมูลพนักงานหรือบริษัทไม่พร้อมส่งใบลา",
      403,
    );
  }

  const [typeVersion, entitlement, dayContext, balance] = await Promise.all([
    getEffectiveLeaveTypeVersion({
      organizationId,
      companyId: employee.companyId,
      code: draft.leaveTypeCode,
      onDate: draft.startDate,
    }),
    getLeaveEntitlementSource({
      organizationId,
      employeeId,
      leaveTypeCode: draft.leaveTypeCode,
      onDate: draft.startDate,
    }),
    getLeaveDayContext({ organizationId, draft }),
    getEmployeeLeaveBalance({
      organizationId,
      employeeId,
      leaveTypeCode: draft.leaveTypeCode,
      onDate: draft.startDate,
    }),
  ]);

  let prepared;
  let managerPlan;

  try {
    prepared = prepareLeaveSubmission({
      draft,
      leaveTypeVersion: typeVersion,
      entitlementSource: entitlement,
      resetMonthDay: "01-01",
      workingWeekdays: dayContext.workingWeekdays,
      holidayDates: dayContext.holidayDates,
      holidayCalendarReady: dayContext.holidayCalendarReady,
    });

    managerPlan = resolveLeaveApprovalPlan({ employee });
  } catch (error) {
    throw toApplicationError(error, "LEAVE_SUBMISSION_INVALID");
  }

  if (managerPlan.steps.length !== 1) {
    fail(
      "LEAVE_APPROVAL_PLAN_UNSUPPORTED",
      "สายอนุมัติใบลานี้ยังไม่พร้อมใช้งาน",
    );
  }

  if (
    balance.employeeId !== employeeId ||
    balance.companyId !== draft.companyId ||
    balance.leaveTypeCode !== draft.leaveTypeCode ||
    balance.periodStart !== prepared.periodStart ||
    balance.periodEnd !== prepared.periodEnd
  ) {
    fail("LEAVE_BALANCE_MISMATCH", "ข้อมูลยอดวันลาไม่ตรงกับฉบับร่าง");
  }

  // อ่านรายชื่อไว้ก่อน transaction แต่จะใช้ต่อเมื่อยอดล่าสุดใน transaction
  // บอกว่าลาเกินสิทธิ์เท่านั้น
  let hrApproverEmployeeIds = [];

  try {
    hrApproverEmployeeIds = await listHrLeaveApproverEmployeeIds({
      organizationId,
      companyId: employee.companyId,
      requesterEmployeeId: employeeId,
    });
  } catch (error) {
    if (error?.code !== "LEAVE_HR_APPROVER_NOT_CONFIGURED") {
      throw error;
    }
  }

  const managerIds = managerPlan.steps[0].approverEmployeeIds;
  const distinctHrIds = hrApproverEmployeeIds.filter(
    (id) => !managerIds.includes(id),
  );

  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const membershipRef = organizationRef.collection("memberships").doc(uid);

  const requestsQuery = organizationRef
    .collection("leaveRequests")
    .where("employeeId", "==", employeeId)
    .limit(MAX_REQUESTS + 1);

  return adminFirestore.runTransaction(async (transaction) => {
    // Firestore transaction: อ่านทั้งหมดก่อนเริ่มเขียน
    const [
      currentDraftSnapshot,
      currentEmployeeSnapshot,
      membershipSnapshot,
      requestSnapshots,
    ] = await Promise.all([
      transaction.get(leaveRef),
      transaction.get(employeeRef),
      transaction.get(membershipRef),
      transaction.get(requestsQuery),
    ]);

    const currentDraft = currentDraftSnapshot.data();
    const currentEmployee = currentEmployeeSnapshot.data();
    const membership = membershipSnapshot.data();

    if (
      !currentDraftSnapshot.exists ||
      currentDraft?.isDeleted === true ||
      currentDraft.status !== "DRAFT" ||
      currentDraft.employeeId !== employeeId ||
      currentDraft.userId !== uid ||
      currentDraft.organizationId !== organizationId ||
      currentDraft.companyId !== draft.companyId ||
      currentDraft.revision !== draft.revision ||
      currentDraft.leaveTypeCode !== draft.leaveTypeCode ||
      currentDraft.startDate !== draft.startDate ||
      currentDraft.endDate !== draft.endDate ||
      currentDraft.dayPart !== draft.dayPart ||
      currentDraft.reason !== draft.reason
    ) {
      fail(
        "LEAVE_DRAFT_CHANGED",
        "ฉบับร่างมีการเปลี่ยนแปลงหรือถูกส่งแล้ว กรุณาโหลดข้อมูลใหม่",
      );
    }

    if (
      !currentEmployeeSnapshot.exists ||
      currentEmployee?.isDeleted === true ||
      currentEmployee.employmentStatus !== "ACTIVE" ||
      currentEmployee.accessStatus !== "ACTIVE" ||
      currentEmployee.userId !== uid ||
      currentEmployee.companyId !== draft.companyId ||
      !membershipSnapshot.exists ||
      membership?.isDeleted === true ||
      membership.status !== "ACTIVE" ||
      membership.employeeId !== employeeId
    ) {
      fail(
        "LEAVE_REQUEST_EMPLOYEE_INVALID",
        "บัญชีพนักงานไม่พร้อมส่งใบลา",
        403,
      );
    }

    if (requestSnapshots.size > MAX_REQUESTS) {
      fail(
        "LEAVE_BALANCE_HISTORY_LIMIT",
        "ประวัติใบลามากเกินขนาดที่ตรวจยอดได้ กรุณาติดต่อ HR",
      );
    }

    const requests = requestSnapshots.docs.map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));

    const overlapping = findOverlappingLeaveRequest({
      requests,
      draft,
      excludeRequestId: requestId,
    });

    if (overlapping) {
      fail(
        "LEAVE_DATES_OVERLAP",
        "มีใบลารออนุมัติหรืออนุมัติแล้วในช่วงวันที่นี้ กรุณาตรวจสอบรายการลา",
      );
    }

    let usage;

    try {
      usage = calculateLeaveUsage({
        requests,
        excludeRequestId: requestId,
        employeeId,
        companyId: draft.companyId,
        leaveTypeCode: draft.leaveTypeCode,
        periodStart: prepared.periodStart,
        periodEnd: prepared.periodEnd,
        openingCutoverDate:
          entitlement.source === "OPENING_BALANCE"
            ? entitlement.effectiveDate
            : null,
      });
    } catch (error) {
      throw toApplicationError(error, "LEAVE_BALANCE_REQUEST_INVALID");
    }

    const remaining =
      balance.availableDays === null
        ? null
        : balance.availableDays - usage.approvedDays - usage.pendingDays;

    let approval;
    let excessDays = 0;
    let coveredDays = prepared.requestedDays;

    if (
      remaining === null ||
      prepared.requestedDays <= Math.max(0, remaining)
    ) {
      approval = {
        source: managerPlan.source,
        steps: managerPlan.steps,
        currentStepIndex: 0,
        lastDecision: null,
      };
    } else {
      if (distinctHrIds.length === 0) {
        fail(
          "LEAVE_HR_APPROVER_NOT_CONFIGURED",
          "ใบลาเกินสิทธิ์ต้องมี HR อีกคนที่รับอนุมัติได้ กรุณาให้ HR ตั้งค่าผู้รับงาน",
        );
      }

      let policy;

      try {
        policy = createLeaveSubmissionPolicy({
          requesterEmployeeId: employeeId,
          requestedDays: prepared.requestedDays,
          remainingAfterPendingDays: Math.max(0, remaining),
          managerApproverEmployeeIds: managerIds,
          hrApproverEmployeeIds: distinctHrIds,
        });
      } catch (error) {
        throw toApplicationError(error, "LEAVE_APPROVAL_POLICY_INVALID");
      }

      excessDays = policy.excessDays;
      coveredDays = policy.coveredDays;

      approval = {
        mode: "PARALLEL_ALL",
        source: "OVER_ENTITLEMENT",
        steps: policy.approvals,
        lastDecision: null,
      };
    }

    const auditRef = organizationRef.collection("auditLogs").doc();
    const outboxRef = organizationRef.collection("notificationOutbox").doc();

    transaction.update(leaveRef, {
      status: "PENDING_APPROVAL",
      requestedDays: prepared.requestedDays,
      countedDates: prepared.countedDates,
      excludedDates: prepared.excludedDates,
      countingBasis: prepared.countingBasis,
      periodStart: prepared.periodStart,
      periodEnd: prepared.periodEnd,
      entitlementSource: prepared.entitlementSource,
      entitlementSourceId: prepared.entitlementSourceId ?? null,
      leaveTypeVersionId: prepared.leaveTypeVersionId,
      leaveTypeVersionPath: prepared.leaveTypeVersionPath,
      workScheduleVersionId: dayContext.workScheduleVersionId ?? null,
      holidayCalendarYears: dayContext.holidayCalendarYears ?? [],
      coveredDays,
      excessDays,
      balanceAtSubmission: {
        availableDays: balance.availableDays,
        approvedDays: usage.approvedDays,
        pendingDays: usage.pendingDays,
        remainingAfterPendingDays: remaining,
      },
      approval,
      submittedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
      revision: FieldValue.increment(1),
    });

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid,
        email: currentSession.identity.email ?? null,
        role: membership.role,
      },
      action: "LEAVE_SUBMIT",
      entityType: "LEAVE_REQUEST",
      entityId: requestId,
      source: "WEB",
      summary: `Submitted leave request ${requestId}.`,
      before: { status: "DRAFT" },
      after: {
        status: "PENDING_APPROVAL",
        requestedDays: prepared.requestedDays,
        coveredDays,
        excessDays,
        approvalMode: approval.mode ?? "SEQUENTIAL",
      },
      metadata: {
        companyId: draft.companyId,
        employeeId,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    transaction.set(outboxRef, {
      organizationId,
      companyId: draft.companyId,
      type: "LEAVE_REQUEST_SUBMITTED",
      status: "PENDING",
      leaveRequestId: requestId,
      requesterEmployeeId: employeeId,
      approverEmployeeIds:
        approval.mode === "PARALLEL_ALL"
          ? [...new Set([...managerIds, ...distinctHrIds])]
          : managerIds,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      id: requestId,
      status: "PENDING_APPROVAL",
      requestedDays: prepared.requestedDays,
      coveredDays,
      excessDays,
      approvalMode: approval.mode ?? "SEQUENTIAL",
    };
  });
}
