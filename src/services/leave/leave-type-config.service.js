import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveTypeCustomCreateSchema } from "@/modules/leave/leave-type-config.schema";
import {
  createCustomLeaveTypeConfig,
  listLeaveTypeConfigs,
} from "@/repositories/leave/leave-type-config.repository";

function requireCompanyAccess(currentSession, companyId) {
  if (
    !canAccessCompany(currentSession.access.membership.companyAccess, companyId)
  ) {
    throw new ApplicationError({
      code: "LEAVE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์เข้าถึงนโยบายการลาของบริษัทนี้",
      status: 403,
    });
  }
}

export async function getLeaveTypeConfigList({ currentSession, companyId }) {
  if (
    typeof companyId !== "string" ||
    !companyId.trim() ||
    companyId.length > 128 ||
    companyId.includes("/")
  ) {
    throw new ApplicationError({
      code: "INVALID_COMPANY_ID",
      message: "กรุณาเลือกบริษัท",
      status: 400,
    });
  }

  requireCompanyAccess(currentSession, companyId);

  return listLeaveTypeConfigs({
    organizationId: currentSession.access.organization.id,
    companyId,
  });
}

export async function addCustomLeaveTypeConfig({ currentSession, input }) {
  const parsed = leaveTypeCustomCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลประเภทการลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  requireCompanyAccess(currentSession, parsed.data.companyId);

  return createCustomLeaveTypeConfig({
    organizationId: currentSession.access.organization.id,
    data: parsed.data,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
