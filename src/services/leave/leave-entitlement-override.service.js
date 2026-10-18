import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveEntitlementOverrideSchema } from "@/modules/leave/leave-entitlement-override.schema";
import { createLeaveEntitlementOverride } from "@/repositories/leave/leave-entitlement-override.repository";

export async function addLeaveEntitlementOverride({ currentSession, input }) {
  const parsed = leaveEntitlementOverrideSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลการปรับสิทธิ์วันลาไม่ถูกต้อง",
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
      message: "ไม่มีสิทธิ์ปรับสิทธิ์ของบริษัทนี้",
      status: 403,
    });
  }

  return createLeaveEntitlementOverride({
    organizationId: currentSession.access.organization.id,
    data: parsed.data,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
