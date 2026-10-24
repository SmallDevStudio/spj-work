import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  assertLeaveDevTestAccess,
  startDevTestRun,
} from "@/services/leave/leave-dev-test.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);
    const session = await requireCurrentSession();
    assertLeaveDevTestAccess(session);
    const input = await readJsonRequest(request);
    const item = await startDevTestRun(session, input);
    return createSuccessResponse({ item }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Dev Test API");
  }
}
