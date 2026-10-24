import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import { reassignPendingLeaveHrApprover } from "@/repositories/leave/leave-hr-reassignment.repository";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
    );

    const { requestId } = await params;
    const input = await readJsonRequest(request);

    if (
      !input ||
      typeof input.employeeId !== "string" ||
      !input.employeeId.trim()
    ) {
      throw new ApplicationError({
        code: "LEAVE_HR_APPROVER_REQUIRED",
        message: "กรุณาเลือกพนักงาน HR คนใหม่",
        status: 400,
      });
    }

    const item = await reassignPendingLeaveHrApprover({
      organizationId: currentSession.access.organization.id,
      leaveRequestId: requestId,
      targetEmployeeId: input.employeeId.trim(),
      actor: {
        uid: currentSession.identity.uid,
        email: currentSession.identity.email,
      },
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Reassignment API");
  }
}
