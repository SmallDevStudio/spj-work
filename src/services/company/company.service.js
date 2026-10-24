import "server-only";

import { z } from "zod";

import {
  ALL_COMPANY_STATUSES,
  COMPANY_LIMITS,
  COMPANY_STATUS,
} from "@/constants/companies";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  companyCreateSchema,
  companyUpdateSchema,
  formatCompanyValidationErrors,
} from "@/modules/company/company.schema";
import {
  createCompany,
  listCompanies,
  updateCompany,
  softDeleteCompany,
} from "@/repositories/company/company.repository";

const companyListQuerySchema = z.object({
  status: z
    .enum(["ALL", ...ALL_COMPANY_STATUSES])
    .default(COMPANY_STATUS.ACTIVE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMPANY_LIMITS.maxAssignedCompanies)
    .default(100),
});

function createActor(currentSession) {
  return {
    uid: currentSession.identity.uid,
    email: currentSession.identity.email,
    role: currentSession.access.membership.role,
  };
}

function requireCompanyId(companyId) {
  if (typeof companyId !== "string" || !/^[^/]{1,128}$/.test(companyId)) {
    throw new ApplicationError({ code: "INVALID_COMPANY_ID", message: "รหัสอ้างอิงบริษัทไม่ถูกต้อง", status: 400 });
  }
  return companyId;
}

export function serializeCompany(company) {
  return {
    id: company.id,
    code: company.code,
    nameTh: company.nameTh,
    description: company.description ?? null,
    address: company.address ?? null,
    phoneNumber: company.phoneNumber ?? null,
    email: company.email ?? null,
    logoUrl: company.logoUrl ?? null,
    status: company.status,
  };
}

export async function editCompany({ currentSession, companyId, input }) {
  requireCompanyId(companyId);
  const result = companyUpdateSchema.safeParse(input);
  if (!result.success) throw new ApplicationError({
    code: "VALIDATION_ERROR", message: "ข้อมูลบริษัทไม่ถูกต้อง", status: 400,
    details: formatCompanyValidationErrors(result.error),
  });
  return serializeCompany(await updateCompany({
    organizationId: currentSession.access.organization.id,
    companyId, data: result.data, actor: createActor(currentSession),
  }));
}

export async function removeCompany({ currentSession, companyId }) {
  requireCompanyId(companyId);
  return softDeleteCompany({
    organizationId: currentSession.access.organization.id,
    companyId, actor: createActor(currentSession),
  });
}

export async function getCompanyList({ currentSession, query }) {
  const result = companyListQuerySchema.safeParse(query);

  if (!result.success) {
    throw new ApplicationError({
      code: "INVALID_QUERY",
      message: "ตัวกรองบริษัทไม่ถูกต้อง",
      status: 400,
      details: formatCompanyValidationErrors(result.error),
    });
  }

  const companies = await listCompanies({
    organizationId: currentSession.access.organization.id,
    limit: result.data.limit,
  });

  return companies
    .filter(
      (company) =>
        result.data.status === "ALL" || company.status === result.data.status,
    )
    .map(serializeCompany);
}

export async function addCompany({ currentSession, input }) {
  const result = companyCreateSchema.safeParse(input);

  if (!result.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลบริษัทไม่ถูกต้อง",
      status: 400,
      details: formatCompanyValidationErrors(result.error),
    });
  }

  const company = await createCompany({
    organizationId: currentSession.access.organization.id,
    data: result.data,
    actor: createActor(currentSession),
  });

  return serializeCompany(company);
}
