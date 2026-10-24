import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  createLeaveApprovalDelegation,
  getLeaveApprovalDelegations,
  removeLeaveApprovalDelegation,
} from "@/services/access/leave-approval-delegation.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const input = await readJsonRequest(request);

    const item = await createLeaveApprovalDelegation(session, input);

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}

export async function DELETE(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const input = await readJsonRequest(request);

    const item = await removeLeaveApprovalDelegation(session, input);

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}

export async function GET(request) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const companyId = new URL(request.url).searchParams.get("companyId");
    const items = await getLeaveApprovalDelegations(session, companyId);

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}
