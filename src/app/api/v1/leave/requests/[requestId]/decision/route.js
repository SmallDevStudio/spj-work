import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { submitLeaveDecision } from "@/services/leave/leave-approval.service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(PERMISSIONS.LEAVE_APPROVE);

    const { requestId } = await params;
    const input = await readJsonRequest(request);

    const item = await submitLeaveDecision({
      currentSession,
      leaveRequestId: requestId,
      input,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Decision API");
  }
}
