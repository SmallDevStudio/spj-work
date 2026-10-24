import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { readTeamLeaveCalendar } from "@/services/leave/team-calendar.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);

    const month = new URL(request.url).searchParams.get("month");

    const items = await readTeamLeaveCalendar({
      currentSession,
      month,
    });

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Team Leave Calendar API");
  }
}
