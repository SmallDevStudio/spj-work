import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { previewLeaveOpeningBalances } from "@/services/leave/leave-opening-balance-preview.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_BALANCE_MANAGE,
    );

    const input = await readJsonRequest(request);

    const preview = await previewLeaveOpeningBalances({
      currentSession,
      input,
    });

    return createSuccessResponse({ preview });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Opening Balance Preview API");
  }
}
