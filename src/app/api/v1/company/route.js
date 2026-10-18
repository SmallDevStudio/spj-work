import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { addCompany, getCompanyList } from "@/services/company/company.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(
      PERMISSIONS.ORGANIZATION_MANAGE,
    );

    const { searchParams } = new URL(request.url);

    const companies = await getCompanyList({
      currentSession,
      query: {
        status: searchParams.get("status") ?? undefined,
        limit: searchParams.get("limit") ?? undefined,
      },
    });

    return createSuccessResponse({
      items: companies,
      total: companies.length,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Company List API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.ORGANIZATION_MANAGE,
    );

    const body = await readJsonRequest(request);

    const company = await addCompany({
      currentSession,
      input: body,
    });

    return createSuccessResponse({ item: company }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Company Create API");
  }
}
