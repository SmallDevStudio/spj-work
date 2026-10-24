import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse, createSuccessResponse, readJsonRequest } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { editCompany, removeCompany } from "@/services/company/company.service";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    validateStateChangingRequest(request);
    const currentSession = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
    const { companyId } = await params;
    const item = await editCompany({ currentSession, companyId, input: await readJsonRequest(request) });
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Company Update API");
  }
}

export async function DELETE(request, { params }) {
  try {
    validateStateChangingRequest(request);
    const currentSession = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
    const { companyId } = await params;
    const item = await removeCompany({ currentSession, companyId });
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Company Delete API");
  }
}
