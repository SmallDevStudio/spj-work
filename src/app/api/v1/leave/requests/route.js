import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse, createSuccessResponse } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { getManagedLeaveHistory } from "@/services/leave/leave-history.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_READ_ALL);
    const params = new URL(request.url).searchParams;

    const result = await getManagedLeaveHistory({
      session,
      cursor: params.get("cursor"),
      includeDeleted: params.get("includeDeleted") === "true",
    });

    return createSuccessResponse(result);
  } catch (error) {
    return createApiErrorResponse(error, "Leave History API");
  }
}
