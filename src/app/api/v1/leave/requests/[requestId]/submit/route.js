import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { submitOwnLeaveDraft } from "@/services/leave/leave-submit.service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(PERMISSIONS.LEAVE_REQUEST);

    const { requestId } = await params;

    const item = await submitOwnLeaveDraft({
      currentSession,
      requestId,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Submit API");
  }
}
