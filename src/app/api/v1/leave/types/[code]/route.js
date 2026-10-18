import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { editLeaveTypeConfig } from "@/services/leave/leave-type-update.service";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_POLICY_MANAGE,
    );

    const { code } = await context.params;
    const input = await readJsonRequest(request);

    const item = await editLeaveTypeConfig({
      currentSession,
      code,
      input,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type Update API");
  }
}
