import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { getCompanyWorkScheduleForRange } from "@/repositories/company/company-work-schedule.repository";
import { getPublishedLeaveCalendar } from "@/repositories/leave/leave-calendar.repository";

export async function getLeaveDayContext({ organizationId, draft }) {
  if (!draft?.companyId || !draft.startDate || !draft.endDate) {
    throw new ApplicationError({
      code: "LEAVE_DRAFT_CALENDAR_INPUT_INVALID",
      message: "ใบลายังไม่มีข้อมูลบริษัทหรือช่วงวันที่ครบถ้วน",
      status: 400,
    });
  }

  const [companySchedule, holidayCalendar] = await Promise.all([
    getCompanyWorkScheduleForRange({
      organizationId,
      companyId: draft.companyId,
      startDate: draft.startDate,
      endDate: draft.endDate,
    }),
    getPublishedLeaveCalendar({
      organizationId,
      startDate: draft.startDate,
      endDate: draft.endDate,
    }),
  ]);

  return {
    workingWeekdays: companySchedule.workingWeekdays,
    holidayDates: holidayCalendar.holidayDates,
    holidayCalendarReady: holidayCalendar.holidayCalendarReady,

    // เก็บเป็น snapshot อ้างอิงตอนส่งใบลา
    workScheduleVersionId: companySchedule.versionId,
    holidayCalendarYears: holidayCalendar.calendarYears,
  };
}
