import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession, requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { PERMISSIONS } from "@/constants/permissions";
import {
  readManagedLeaveRequest,
  removeManagedLeaveRequest,
} from "@/services/leave/leave-history.service";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_READ_ALL);
    const { requestId } = await params;
    const item = await readManagedLeaveRequest({ session, requestId });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Detail API");
  }
}

export async function DELETE(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const session = await requireCurrentSession();
    const { requestId } = await params;
    const input = await readJsonRequest(request);

    const item = await removeManagedLeaveRequest({ session, requestId, input });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Delete API");
  }
}
