import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { getLeaveCalendarYear, listLeaveCalendarYears } from "@/repositories/leave/leave-calendar-query.repository";

export async function readHolidayCalendarYears({ currentSession }) {
  if (!currentSession?.access?.permissions?.includes(PERMISSIONS.HOLIDAY_MANAGE)) {
    throw new ApplicationError({ code: "HOLIDAY_MANAGE_PERMISSION_DENIED", message: "ไม่มีสิทธิ์ดูปฏิทินวันหยุด", status: 403 });
  }
  return listLeaveCalendarYears({ organizationId: currentSession.access.organization.id });
}

export async function readHolidayCalendarYear({ currentSession, year }) {
  if (
    !currentSession?.access?.permissions?.includes(PERMISSIONS.HOLIDAY_MANAGE)
  ) {
    throw new ApplicationError({
      code: "HOLIDAY_MANAGE_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์ดูการตั้งค่าปฏิทินวันหยุด",
      status: 403,
    });
  }

  if (
    typeof year !== "string" ||
    !/^\d{4}$/.test(year) ||
    Number(year) < 2000 ||
    Number(year) > 2100
  ) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_YEAR_INVALID",
      message: "ปีปฏิทินไม่ถูกต้อง",
      status: 400,
    });
  }

  return getLeaveCalendarYear({
    organizationId: currentSession.access.organization.id,
    year: Number(year),
  });
}
