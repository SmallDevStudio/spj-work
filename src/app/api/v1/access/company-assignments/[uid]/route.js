import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  getUserCompanyAccess,
  updateUserCompanyAccess,
} from "@/services/access/company-access.service";

export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  try {
    const currentSession = await requireCurrentSession();
    const { uid } = await context.params;

    const item = await getUserCompanyAccess({
      currentSession,
      targetUid: uid,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "User Company Access GET API");
  }
}

export async function PUT(request, context) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requireCurrentSession();
    const { uid } = await context.params;
    const input = await readJsonRequest(request);

    const item = await updateUserCompanyAccess({
      currentSession,
      targetUid: uid,
      input,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "User Company Access PUT API");
  }
}
