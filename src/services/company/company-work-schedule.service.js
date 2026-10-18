import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  companyWorkScheduleCreateSchema,
  companyWorkScheduleQuerySchema,
} from "@/modules/company/company-work-schedule.schema";
import {
  createCompanyWorkSchedule,
  listCompanyWorkSchedules,
} from "@/repositories/company/company-work-schedule.repository";

function validate(schema, input) {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "COMPANY_WORK_SCHEDULE_VALIDATION_ERROR",
      message: "ข้อมูลวันทำงานของบริษัทไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return parsed.data;
}

function requireCompanySettingsAccess({ currentSession, companyId }) {
  if (
    !currentSession?.access?.permissions?.includes(
      PERMISSIONS.HR_SETTINGS_MANAGE,
    )
  ) {
    throw new ApplicationError({
      code: "COMPANY_WORK_SCHEDULE_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์จัดการวันทำงานของบริษัท",
      status: 403,
    });
  }

  if (
    !canAccessCompany(currentSession.access.membership.companyAccess, companyId)
  ) {
    throw new ApplicationError({
      code: "COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์เข้าถึงข้อมูลบริษัทนี้",
      status: 403,
    });
  }

  return currentSession.access.organization.id;
}

export async function addCompanyWorkSchedule({ currentSession, input }) {
  const data = validate(companyWorkScheduleCreateSchema, input);

  const organizationId = requireCompanySettingsAccess({
    currentSession,
    companyId: data.companyId,
  });

  return createCompanyWorkSchedule({
    organizationId,
    ...data,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}

export async function readCompanyWorkSchedules({ currentSession, companyId }) {
  const data = validate(companyWorkScheduleQuerySchema, { companyId });

  const organizationId = requireCompanySettingsAccess({
    currentSession,
    companyId: data.companyId,
  });

  return listCompanyWorkSchedules({
    organizationId,
    companyId: data.companyId,
  });
}
