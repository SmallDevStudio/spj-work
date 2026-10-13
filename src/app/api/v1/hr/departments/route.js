import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  addDepartment,
  getDepartmentList,
} from "@/services/hr/organization-structure.service";

export const dynamic = "force-dynamic";

function getQuery(request) {
  const { searchParams } = new URL(request.url);

  return {
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.DEPARTMENT_READ);

    const departments = await getDepartmentList({
      currentSession,
      query: getQuery(request),
    });

    return createSuccessResponse({
      items: departments,
      total: departments.length,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Department List API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(
      PERMISSIONS.DEPARTMENT_MANAGE,
    );

    const requestBody = await readJsonRequest(request);

    const department = await addDepartment({
      currentSession,
      input: requestBody,
    });

    return createSuccessResponse(
      {
        item: department,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createApiErrorResponse(error, "Department Create API");
  }
}
