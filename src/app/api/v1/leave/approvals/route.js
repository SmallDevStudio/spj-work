import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { listMyPendingLeaveApprovals } from "@/repositories/leave/leave-approval-inbox.repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const currentSession = await requirePermission(PERMISSIONS.LEAVE_APPROVE);

    const items = await listMyPendingLeaveApprovals({
      organizationId: currentSession.access.organization.id,
      uid: currentSession.identity.uid,
      employeeId: currentSession.access.membership.employeeId,
    });

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Approval Inbox API");
  }
}
