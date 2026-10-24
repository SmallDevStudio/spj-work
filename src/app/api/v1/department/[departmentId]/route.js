import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { editDepartment, removeDepartment } from "@/services/department/organization-structure.service";

export const dynamic = "force-dynamic";

export async function PUT(request, context) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.DEPARTMENT_MANAGE,
    );

    const { departmentId } = await context.params;
    const requestBody = await readJsonRequest(request);

    const department = await editDepartment({
      currentSession,
      departmentId,
      input: requestBody,
    });

    return createSuccessResponse({
      item: department,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Department Update API");
  }
}

export async function DELETE(request, context) {
  try {
    validateStateChangingRequest(request);
    const currentSession = await requirePermission(PERMISSIONS.DEPARTMENT_MANAGE);
    const { departmentId } = await context.params;
    const item = await removeDepartment({ currentSession, departmentId });
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Department Delete API");
  }
}
