import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireAllPermissions } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { updateEmployeeDetails } from "@/services/employee/employee.service";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requireAllPermissions([
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.PRINTER_CODE_UPDATE,
    ]);

    const { employeeId } = await context.params;
    const requestBody = await readJsonRequest(request);

    const employee = await updateEmployeeDetails({
      currentSession,
      employeeId,
      input: requestBody,
    });

    return createSuccessResponse({
      employee,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Employee Update API");
  }
}
