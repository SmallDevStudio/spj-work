import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveTemplateAssignmentSchema } from "@/modules/leave/leave-template-assignment.schema";
import { commitLeaveTemplateAssignments } from "@/repositories/leave/leave-template-assignment.repository";

export async function assignLeaveTemplateBatch({ currentSession, input }) {
  const parsed = leaveTemplateAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลการมอบ Leave Template ไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (
    !canAccessCompany(
      currentSession.access.membership.companyAccess,
      parsed.data.companyId,
    )
  ) {
    throw new ApplicationError({
      code: "LEAVE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์มอบ Leave Template ของบริษัทนี้",
      status: 403,
    });
  }

  return commitLeaveTemplateAssignments({
    organizationId: currentSession.access.organization.id,
    data: parsed.data,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
