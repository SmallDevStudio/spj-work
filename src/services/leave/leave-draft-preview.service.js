import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { calculateLeaveDays } from "@/modules/leave/calculate-leave-days";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";
import { getLeaveDayContext } from "@/services/leave/leave-day-context.service";

export async function previewOwnLeaveDraft({
  organizationId,
  employeeId,
  userId,
  request,
}) {
  if (
    !request ||
    request.status !== "DRAFT" ||
    !request.startDate ||
    !request.endDate ||
    !request.leaveTypeCode
  ) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_PREVIEW_INVALID",
      message: "ข้อมูลฉบับร่างยังไม่พร้อมคำนวณ",
      status: 400,
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
    !employee.companyId
  ) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_EMPLOYEE_INVALID",
      message: "ข้อมูลพนักงานไม่พร้อมคำนวณวันลา",
      status: 403,
    });
  }

  const draftContext = {
    companyId: employee.companyId,
    startDate: request.startDate,
    endDate: request.endDate,
  };

  const [leaveTypeVersion, dayContext] = await Promise.all([
    getEffectiveLeaveTypeVersion({
      organizationId,
      companyId: employee.companyId,
      code: request.leaveTypeCode,
      onDate: request.startDate,
    }),
    getLeaveDayContext({
      organizationId,
      draft: draftContext,
    }),
  ]);

  if (dayContext.holidayCalendarReady !== true) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_NOT_READY",
      message: "ยังไม่มีปฏิทินวันหยุดที่เผยแพร่สำหรับช่วงวันที่เลือก",
      status: 409,
    });
  }

  let result;

  try {
    result = calculateLeaveDays({
      startDate: request.startDate,
      endDate: request.endDate,
      dayPart: request.dayPart,
      countingBasis: leaveTypeVersion.countingBasis,
      workingWeekdays: dayContext.workingWeekdays,
      holidays: dayContext.holidayDates,
    });
  } catch (error) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_DAYS_NOT_CALCULABLE",
      message:
        error instanceof Error
          ? error.message
          : "ยังคำนวณวันลาสำหรับช่วงวันที่เลือกไม่ได้",
      status: 409,
    });
  }

  return {
    requestedDays: result.requestedDays,
    countedDates: result.countedDates,
    excludedDates: result.excludedDates,
    countingBasis: result.countingBasis,
    dayPart: result.dayPart,
  };
}
