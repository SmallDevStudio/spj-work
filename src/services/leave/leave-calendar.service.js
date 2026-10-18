import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  leaveCalendarDraftSchema,
  leaveCalendarPublishSchema,
} from "@/modules/leave/leave-calendar.schema";
import {
  publishLeaveCalendarYear,
  saveLeaveCalendarDraft,
} from "@/repositories/leave/leave-calendar-write.repository";

function requireHolidayManage(currentSession) {
  if (
    !currentSession?.access?.permissions?.includes(PERMISSIONS.HOLIDAY_MANAGE)
  ) {
    throw new ApplicationError({
      code: "HOLIDAY_MANAGE_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์จัดการปฏิทินวันหยุด",
      status: 403,
    });
  }

  return {
    organizationId: currentSession.access.organization.id,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  };
}

function parseInput(schema, input) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_VALIDATION_ERROR",
      message: "ข้อมูลปฏิทินวันหยุดไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data;
}

export async function saveHolidayCalendarDraft({ currentSession, input }) {
  const access = requireHolidayManage(currentSession);
  const data = parseInput(leaveCalendarDraftSchema, input);

  return saveLeaveCalendarDraft({
    ...access,
    data,
  });
}

export async function publishHolidayCalendar({ currentSession, input }) {
  const access = requireHolidayManage(currentSession);
  const data = parseInput(leaveCalendarPublishSchema, input);

  return publishLeaveCalendarYear({
    ...access,
    ...data,
  });
}
