import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { assignEmployeeToCompany } from "@/services/employee/employee-company.service";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requireCurrentSession();
    const { employeeId } = await context.params;
    const input = await readJsonRequest(request);

    const item = await assignEmployeeToCompany({
      currentSession,
      employeeId,
      input,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Employee Company Assignment API");
  }
}
