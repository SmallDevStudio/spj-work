import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { resolveLeaveApprovalPlan } from "@/modules/leave/leave-approver-plan";
import { createLeaveSubmissionPolicy } from "@/modules/leave/leave-submission-policy";
import { prepareLeaveSubmission } from "@/modules/leave/prepare-leave-submission";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getLeaveEntitlementSource } from "@/repositories/leave/leave-entitlement-source.repository";
import { listHrLeaveApproverEmployeeIds } from "@/repositories/leave/leave-hr-approver.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";
import { getLeaveDayContext } from "@/services/leave/leave-day-context.service";

export async function prepareOwnLeaveSubmission({
  organizationId,
  employeeId,
  userId,
  draft,
  balance,
  resetMonthDay = "01-01",
}) {
  if (
    !draft ||
    draft.status !== "DRAFT" ||
    draft.employeeId !== employeeId ||
    draft.userId !== userId
  ) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_ACCESS_DENIED",
      message: "ไม่พบฉบับร่างของคุณที่พร้อมส่ง",
      status: 403,
    });
  }

  const employee = await getEmployeeById({
    organizationId,
    employeeId,
  });

  if (
    !employee ||
    employee.isDeleted === true ||
    employee.userId !== userId ||
    employee.companyId !== draft.companyId
  ) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_EMPLOYEE_INVALID",
      message: "ข้อมูลพนักงานหรือบริษัทไม่ตรงกับฉบับร่าง",
      status: 409,
    });
  }

  const [leaveTypeVersion, entitlementSource, dayContext] = await Promise.all([
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
      resetMonthDay,
    }),
    getLeaveDayContext({
      organizationId,
      draft,
    }),
  ]);

  let prepared;

  try {
    prepared = prepareLeaveSubmission({
      draft,
      leaveTypeVersion,
      entitlementSource,
      resetMonthDay,
      workingWeekdays: dayContext.workingWeekdays,
      holidayDates: dayContext.holidayDates,
      holidayCalendarReady: dayContext.holidayCalendarReady,
    });
  } catch (error) {
    throw new ApplicationError({
      code: error.code ?? "LEAVE_SUBMISSION_INVALID",
      message: error.message ?? "ยังไม่สามารถส่งใบลานี้ได้",
      status: error.status ?? 409,
    });
  }

  // ป้องกันการนำยอดจากประเภทลา/รอบปี/บริษัทอื่นมาตัดสิน
  if (
    !balance ||
    balance.employeeId !== employeeId ||
    balance.companyId !== employee.companyId ||
    balance.leaveTypeCode !== draft.leaveTypeCode ||
    balance.periodStart !== prepared.periodStart ||
    balance.periodEnd !== prepared.periodEnd ||
    typeof balance.remainingAfterPendingDays !== "number" ||
    !Number.isFinite(balance.remainingAfterPendingDays)
  ) {
    throw new ApplicationError({
      code: "LEAVE_BALANCE_NOT_READY",
      message: "ยังอ่านยอดวันลาล่าสุดสำหรับรอบปีนี้ไม่ได้",
      status: 409,
    });
  }

  let managerPlan;

  try {
    managerPlan = resolveLeaveApprovalPlan({ employee });
  } catch (error) {
    throw new ApplicationError({
      code: "LEAVE_MANAGER_APPROVER_NOT_CONFIGURED",
      message: error.message,
      status: 409,
    });
  }

  // กฎที่มีหลายขั้นจะรองรับเมื่อต่อ workflow editor
  if (managerPlan.steps.length !== 1) {
    throw new ApplicationError({
      code: "LEAVE_APPROVAL_PLAN_UNSUPPORTED",
      message: "สายอนุมัติใบลานี้ยังไม่พร้อมใช้งาน",
      status: 409,
    });
  }

  const remainingForNewRequest = Math.max(0, balance.remainingAfterPendingDays);

  const isOverEntitlement = prepared.requestedDays > remainingForNewRequest;

  const hrApproverEmployeeIds = isOverEntitlement
    ? await listHrLeaveApproverEmployeeIds({
        organizationId,
        companyId: employee.companyId,
        requesterEmployeeId: employeeId,
      })
    : [];

  let policy;

  try {
    policy = createLeaveSubmissionPolicy({
      requesterEmployeeId: employeeId,
      requestedDays: prepared.requestedDays,
      remainingAfterPendingDays: remainingForNewRequest,
      managerApproverEmployeeIds: managerPlan.steps[0].approverEmployeeIds,
      hrApproverEmployeeIds,
    });
  } catch (error) {
    throw new ApplicationError({
      code: error.code ?? "LEAVE_APPROVAL_POLICY_INVALID",
      message: error.message ?? "กำหนดผู้อนุมัติใบลาไม่ได้",
      status: error.status ?? 409,
    });
  }

  return {
    prepared,
    policy,
    managerPlan,
    balanceSnapshot: {
      remainingAfterPendingDays: balance.remainingAfterPendingDays,
      periodStart: balance.periodStart,
      periodEnd: balance.periodEnd,
    },
    calendarSnapshot: {
      workScheduleVersionId: dayContext.workScheduleVersionId,
      holidayCalendarYears: dayContext.holidayCalendarYears,
    },
  };
}
