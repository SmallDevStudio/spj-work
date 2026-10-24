import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { makeDevTestDecision } from "@/services/leave/leave-dev-test.service";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  try {
    validateStateChangingRequest(request);
    const session = await requireCurrentSession();
    const { runId } = await params;
    const input = await readJsonRequest(request);
    const item = await makeDevTestDecision(session, runId, input);
    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Dev Test Decision API");
  }
}
