import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { addLeaveRequestDraft } from "@/services/leave/leave-request-draft.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(PERMISSIONS.LEAVE_REQUEST);

    const input = await readJsonRequest(request);

    const item = await addLeaveRequestDraft({
      currentSession,
      input,
    });

    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Draft Create API");
  }
}
