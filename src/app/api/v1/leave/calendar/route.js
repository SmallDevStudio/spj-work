import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { readHolidayCalendarYear } from "@/services/leave/leave-calendar-query.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

    const year = new URL(request.url).searchParams.get("year");

    const item = await readHolidayCalendarYear({
      currentSession,
      year,
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Calendar Query API");
  }
}
