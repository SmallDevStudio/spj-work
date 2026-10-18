import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  addCompanyWorkSchedule,
  readCompanyWorkSchedules,
} from "@/services/company/company-work-schedule.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(
      PERMISSIONS.HR_SETTINGS_MANAGE,
    );

    const companyId = new URL(request.url).searchParams.get("companyId");

    const item = await readCompanyWorkSchedules({
      currentSession,
      companyId,
    });

    return createSuccessResponse({
      item,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Company Work Schedule API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.HR_SETTINGS_MANAGE,
    );

    const input = await readJsonRequest(request);

    const item = await addCompanyWorkSchedule({
      currentSession,
      input,
    });

    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Company Work Schedule API");
  }
}
