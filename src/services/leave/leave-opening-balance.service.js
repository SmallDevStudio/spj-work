import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveOpeningBalanceSchema } from "@/modules/leave/leave-opening-balance.schema";
import { createLeaveOpeningBalance } from "@/repositories/leave/leave-opening-balance.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";

export async function addLeaveOpeningBalance({ currentSession, input }) {
  const parsed = leaveOpeningBalanceSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลยอดตั้งต้นวันลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const data = parsed.data;

  if (
    !canAccessCompany(
      currentSession.access.membership.companyAccess,
      data.companyId,
    )
  ) {
    throw new ApplicationError({
      code: "LEAVE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์จัดการยอดวันลาของบริษัทนี้",
      status: 403,
    });
  }

  const leaveTypeVersion = await getEffectiveLeaveTypeVersion({
    organizationId: currentSession.access.organization.id,
    companyId: data.companyId,
    code: data.leaveTypeCode,
    onDate: data.cutoverDate,
  });

  return createLeaveOpeningBalance({
    organizationId: currentSession.access.organization.id,
    data,
    leaveTypeVersion,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
