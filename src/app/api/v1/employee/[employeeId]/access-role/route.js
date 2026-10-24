import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import { setEmployeeAccessRole } from "@/repositories/employee/employee-access-role.repository";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(PERMISSIONS.ROLE_MANAGE);

    const input = await readJsonRequest(request);

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length !== 1 ||
      typeof input.role !== "string"
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_ACCESS_ROLE_INPUT_INVALID",
        message: "กรุณาระบุ role ที่ต้องการกำหนด",
        status: 400,
      });
    }

    const { employeeId } = await params;

    const item = await setEmployeeAccessRole({
      organizationId: currentSession.access.organization.id,
      employeeId,
      role: input.role,
      actor: {
        uid: currentSession.identity.uid,
        email: currentSession.identity.email,
      },
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Employee Access Role API");
  }
}
