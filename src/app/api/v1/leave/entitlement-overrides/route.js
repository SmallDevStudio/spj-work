import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { addLeaveEntitlementOverride } from "@/services/leave/leave-entitlement-override.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_BALANCE_MANAGE,
    );

    const input = await readJsonRequest(request);

    const item = await addLeaveEntitlementOverride({
      currentSession,
      input,
    });

    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Entitlement Override API");
  }
}
