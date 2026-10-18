import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { listMembershipsForCompanyAccess } from "@/repositories/auth/company-access.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentSession = await requireCurrentSession();

    if (currentSession.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "COMPANY_ACCESS_MANAGE_DENIED",
        message: "เฉพาะ SUPERADMIN ที่จัดการสิทธิ์รายบริษัทได้",
        status: 403,
      });
    }

    const items = await listMembershipsForCompanyAccess({
      organizationId: currentSession.access.organization.id,
    });

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Company Access Users API");
  }
}
