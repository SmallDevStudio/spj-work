import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { publishHolidayCalendar } from "@/services/leave/leave-calendar.service";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const currentSession = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

    const input = await readJsonRequest(request);

    const item = await publishHolidayCalendar({
      currentSession,
      input,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Calendar Publish API");
  }
}
