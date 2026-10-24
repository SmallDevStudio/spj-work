import { calculateLeaveDays } from "@/modules/leave/calculate-leave-days";
import { decideLeaveApproval } from "@/modules/leave/leave-approval-transition";
import { resolveLeaveApprovalPlan } from "@/modules/leave/leave-approver-plan";
import { getLeaveCycleForDate } from "@/modules/leave/leave-cycle";
import { decideParallelLeaveApproval } from "@/modules/leave/leave-parallel-approval-transition";
import { createLeaveSubmissionPolicy } from "@/modules/leave/leave-submission-policy";

const REQUESTER = "DEV_TEST_REQUESTER";
const MANAGER = "DEV_TEST_MANAGER";
const HR = "DEV_TEST_HR";

export function createDevLeaveScenario(input, uid) {
  const days = calculateLeaveDays({
    startDate: input.startDate,
    endDate: input.endDate,
    dayPart: input.dayPart,
    countingBasis: input.countingBasis,
    workingWeekdays: input.workingWeekdays,
    holidays: input.holidays,
  });

  const startCycle = getLeaveCycleForDate({ date: input.startDate });
  const endCycle = getLeaveCycleForDate({ date: input.endDate });

  if (startCycle.periodStart !== endCycle.periodStart) {
    const error = new Error("ใบลาข้ามรอบปี กรุณาแยกเป็นสองใบลา");
    error.code = "LEAVE_REQUEST_CROSSES_CYCLE";
    throw error;
  }

  const remaining = Math.max(0, input.entitlementDays - input.alreadyUsedDays);
  let approval;
  let coveredDays = days.requestedDays;
  let excessDays = 0;

  if (days.requestedDays > remaining) {
    const policy = createLeaveSubmissionPolicy({
      requesterEmployeeId: REQUESTER,
      requestedDays: days.requestedDays,
      remainingAfterPendingDays: remaining,
      managerApproverEmployeeIds: [MANAGER],
      hrApproverEmployeeIds: [HR],
    });

    approval = {
      mode: "PARALLEL_ALL",
      source: "DEV_TEST",
      steps: policy.approvals,
      lastDecision: null,
    };
    coveredDays = policy.coveredDays;
    excessDays = policy.excessDays;
  } else {
    const plan = resolveLeaveApprovalPlan({
      employee: {
        id: REQUESTER,
        defaultLeaveApproverEmployeeIds: [MANAGER],
      },
    });

    approval = {
      source: "DEV_TEST",
      steps: plan.steps,
      currentStepIndex: 0,
      lastDecision: null,
    };
  }

  return {
    ownerUid: uid,
    isDevTest: true,
    isDeleted: false,
    employeeId: REQUESTER,
    startDate: input.startDate,
    endDate: input.endDate,
    dayPart: input.dayPart,
    countingBasis: input.countingBasis,
    workingWeekdays: input.workingWeekdays,
    holidays: input.holidays,
    countedDates: days.countedDates,
    excludedDates: days.excludedDates,
    periodStart: startCycle.periodStart,
    periodEnd: startCycle.periodEnd,
    entitlementDays: input.entitlementDays,
    alreadyUsedDays: input.alreadyUsedDays,
    requestedDays: days.requestedDays,
    coveredDays,
    excessDays,
    status: "PENDING_APPROVAL",
    approval,
    revision: 1,
  };
}

export function decideDevLeaveScenario({ scenario, track, decision, comment, financialDisposition, financialReason, uid }) {
  const actorEmployeeId = track === "HR" ? HR : MANAGER;
  const input = {
    request: scenario,
    actorEmployeeId,
    actorUid: uid,
    decision,
    comment,
    decidedAt: new Date(),
  };

  if (scenario.approval?.mode === "PARALLEL_ALL") {
    return decideParallelLeaveApproval({
      ...input,
      financialDisposition,
      financialReason,
    });
  }

  if (track !== "MANAGER") {
    const error = new Error("ใบลาที่ไม่เกินสิทธิ์ไม่มีขั้นอนุมัติ HR");
    error.code = "LEAVE_DEV_TRACK_INVALID";
    throw error;
  }

  return decideLeaveApproval(input);
}

export function devLeaveBalance(scenario) {
  const remaining = scenario.entitlementDays - scenario.alreadyUsedDays;
  const committedDays = scenario.isDeleted || scenario.status !== "APPROVED"
    ? 0
    : scenario.requestedDays;
  const reservedDays = scenario.isDeleted || scenario.status !== "PENDING_APPROVAL"
    ? 0
    : scenario.requestedDays;

  return {
    entitlementDays: scenario.entitlementDays,
    alreadyUsedDays: scenario.alreadyUsedDays,
    remainingDays: remaining - committedDays,
    remainingAfterPendingDays: remaining - committedDays - reservedDays,
  };
}
