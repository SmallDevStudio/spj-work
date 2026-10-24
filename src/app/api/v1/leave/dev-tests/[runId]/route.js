import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  readDevTestRun,
  removeDevTestRun,
} from "@/services/leave/leave-dev-test.service";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const session = await requireCurrentSession();
    const { runId } = await params;
    const item = await readDevTestRun(session, runId);
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Dev Test Detail API");
  }
}

export async function DELETE(request, { params }) {
  try {
    validateStateChangingRequest(request);
    const session = await requireCurrentSession();
    const { runId } = await params;
    const item = await removeDevTestRun(session, runId);
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Dev Test Delete API");
  }
}
