import "server-only";

import { z } from "zod";

import { PERMISSIONS } from "@/constants/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { decideLeaveRequest } from "@/repositories/leave/leave-approval.repository";

const decisionSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    comment: z.string().trim().min(1).max(2000),
    financialDisposition: z
      .enum(["DEDUCT_PAY", "PAID_EXCEPTION"])
      .nullable()
      .optional(),
    financialReason: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export async function submitLeaveDecision({
  currentSession,
  leaveRequestId,
  input,
}) {
  if (
    !currentSession?.access?.permissions?.includes(PERMISSIONS.LEAVE_APPROVE)
  ) {
    throw new ApplicationError({
      code: "LEAVE_APPROVE_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์อนุมัติใบลา",
      status: 403,
    });
  }

  const validated = decisionSchema.safeParse(input);

  if (!validated.success) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_DECISION",
      message: "ข้อมูลการตัดสินใจไม่ถูกต้อง",
      status: 400,
      details: validated.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const employeeId = currentSession.access.membership.employeeId;

  if (!employeeId) {
    throw new ApplicationError({
      code: "LEAVE_APPROVER_EMPLOYEE_REQUIRED",
      message: "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",
      status: 403,
    });
  }

  return decideLeaveRequest({
    organizationId: currentSession.access.organization.id,
    leaveRequestId,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
      employeeId,
    },
    decision: validated.data.decision,
    comment: validated.data.comment,
    financialDisposition: validated.data.financialDisposition ?? null,
    financialReason: validated.data.financialReason ?? null,
  });
}
