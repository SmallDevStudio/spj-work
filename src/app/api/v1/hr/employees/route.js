import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import {
  requireAllPermissions,
  requireAnyPermission,
} from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { addEmployee, getEmployeeList } from "@/services/hr/employee.service";

export const dynamic = "force-dynamic";

function getQuery(request) {
  const { searchParams } = new URL(request.url);

  return {
    status: searchParams.get("status") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  };
}

export async function GET(request) {
  try {
    const currentSession = await requireAnyPermission([
      PERMISSIONS.EMPLOYEE_READ_ALL,
      PERMISSIONS.EMPLOYEE_READ,
    ]);

    const employees = await getEmployeeList({
      currentSession,
      query: getQuery(request),
    });

    return createSuccessResponse({
      items: employees,
      total: employees.length,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Employee List API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requireAllPermissions([
      PERMISSIONS.EMPLOYEE_CREATE,
      PERMISSIONS.EMPLOYEE_PIN_CREATE,
      PERMISSIONS.ONBOARDING_CREATE,
    ]);

    const requestBody = await readJsonRequest(request);

    const result = await addEmployee({
      currentSession,
      input: requestBody,
    });

    return createSuccessResponse(
      {
        employee: result.employee,
        onboardingRequest: result.onboardingRequest,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return createApiErrorResponse(error, "Employee Create API");
  }
}
