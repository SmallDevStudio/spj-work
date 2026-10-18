import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveTemplateCreateSchema } from "@/modules/leave/leave-template.schema";
import {
  createLeaveTemplate,
  listLeaveTemplates,
} from "@/repositories/leave/leave-template.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";

function requireCompanyScope(currentSession, companyId) {
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

export async function getLeaveTemplateList({ currentSession, companyId }) {
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

  requireCompanyScope(currentSession, companyId);

  return listLeaveTemplates({
    organizationId: currentSession.access.organization.id,
    companyId,
  });
}

export async function addLeaveTemplate({ currentSession, input }) {
  const parsed = leaveTemplateCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูล Leave Template ไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const data = parsed.data;
  requireCompanyScope(currentSession, data.companyId);

  const entries = await Promise.all(
    data.entries.map(async (entry) => {
      const leaveType = await getEffectiveLeaveTypeVersion({
        organizationId: currentSession.access.organization.id,
        companyId: data.companyId,
        code: entry.leaveTypeCode,
        onDate: data.effectiveFrom,
      });

      const resolvedEntitlementDays =
        entry.entitlementMode === "OVERRIDE"
          ? entry.entitlementDays
          : leaveType.entitlementDays;

      if (
        entry.leaveTypeCode === "MATERNITY" &&
        (resolvedEntitlementDays === null || resolvedEntitlementDays < 120)
      ) {
        throw new ApplicationError({
          code: "MATERNITY_TEMPLATE_BELOW_MINIMUM",
          message: "สิทธิลาคลอดใน template ต้องไม่น้อยกว่า 120 วัน",
          status: 400,
        });
      }

      return {
        ...entry,
        resolvedEntitlementDays,
        leaveTypeVersionId: leaveType.id,
        leaveTypeRevision: leaveType.revision,
        leaveTypeEffectiveFrom: leaveType.effectiveFrom,
        countingBasis: leaveType.countingBasis,
        payTreatment: leaveType.payTreatment,
        paidDaysCap: leaveType.paidDaysCap,
      };
    }),
  );

  return createLeaveTemplate({
    organizationId: currentSession.access.organization.id,
    data,
    entries,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
