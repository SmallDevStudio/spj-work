import "server-only";

import { PERMISSIONS } from "@/constants/permissions";

import { ApplicationError } from "@/lib/errors/application-error";

import { leaveRequestDraftSchema } from "@/modules/leave/leave-request.schema";

import { createLeaveRequestDraft } from "@/repositories/leave/leave-request-draft.repository";

export async function addLeaveRequestDraft({ currentSession, input }) {
  if (
    !currentSession?.access?.permissions?.includes(PERMISSIONS.LEAVE_REQUEST)
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_PERMISSION_DENIED",

      message: "ไม่มีสิทธิ์ยื่นใบลา",

      status: 403,
    });
  }

  const employeeId = currentSession.access.membership.employeeId;

  if (!employeeId) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_EMPLOYEE_REQUIRED",

      message: "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",

      status: 403,
    });
  }

  const parsed = leaveRequestDraftSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_DRAFT",

      message: "ข้อมูลร่างใบลาไม่ถูกต้อง",

      status: 400,

      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),

        message: issue.message,
      })),
    });
  }

  return createLeaveRequestDraft({
    organizationId: currentSession.access.organization.id,

    actor: {
      uid: currentSession.identity.uid,

      email: currentSession.identity.email,

      role: currentSession.access.membership.role,

      employeeId,
    },

    data: parsed.data,
  });
}
