import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse, createSuccessResponse } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);
    const year = new URL(request.url).searchParams.get("year");
    if (!/^20\d\d$|^2100$/.test(year ?? "")) throw new ApplicationError({ code: "INVALID_YEAR", message: "ปีปฏิทินไม่ถูกต้อง", status: 400 });
    const calendar = await getLeaveCalendarYear({ organizationId: currentSession.access.organization.id, year: Number(year) });
    const items = calendar?.status === "PUBLISHED" ? calendar.holidays.map(({ date, nameTh }) => ({ date, nameTh })) : [];
    return createSuccessResponse({ items });
  } catch (error) { return createApiErrorResponse(error, "Own Leave Holidays API"); }
}
