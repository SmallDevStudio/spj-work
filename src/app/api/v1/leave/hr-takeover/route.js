import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  previewLeaveHrTakeover,
  applyLeaveHrTakeover,
} from "@/repositories/leave/leave-hr-takeover.repository";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const params = new URL(request.url).searchParams;

    const preview = await previewLeaveHrTakeover({
      organizationId: session.access.organization.id,
      companyId: params.get("companyId"),
      oldEmployeeId: params.get("oldEmployeeId"),
      companyAccess: session.access.membership.companyAccess,
    });

    return createSuccessResponse({ preview });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Takeover API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const input = await readJsonRequest(request);

    const result = await applyLeaveHrTakeover({
      organizationId: session.access.organization.id,
      companyId: input?.companyId,
      oldEmployeeId: input?.oldEmployeeId,
      newEmployeeId: input?.newEmployeeId,
      requestIds: input?.requestIds,
      actor: {
        uid: session.identity.uid,
        email: session.identity.email,
      },
    });

    return createSuccessResponse({ result });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Takeover API");
  }
}
