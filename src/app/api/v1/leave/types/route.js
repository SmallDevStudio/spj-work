import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  addCustomLeaveTypeConfig,
  getLeaveTypeConfigList,
} from "@/services/leave/leave-type-config.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(
      PERMISSIONS.HR_SETTINGS_READ,
    );

    const companyId = new URL(request.url).searchParams.get("companyId");

    const items = await getLeaveTypeConfigList({
      currentSession,
      companyId,
    });

    return createSuccessResponse({
      items,
      total: items.length,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type List API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_POLICY_MANAGE,
    );

    const input = await readJsonRequest(request);

    const item = await addCustomLeaveTypeConfig({
      currentSession,
      input,
    });

    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type Create API");
  }
}
