import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readHolidayCalendarYear } from "@/services/leave/leave-calendar-query.service";
import LeaveCalendarSettingsClient from "@/components/hr/LeaveCalendarSettingsClient";

export const dynamic = "force-dynamic";

export default async function HolidaySettingsPage() {
  const currentSession = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

  const year = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(new Date()),
  );

  const initialItem = await readHolidayCalendarYear({
    currentSession,
    year: String(year),
  });

  return (
    <LeaveCalendarSettingsClient initialYear={year} initialItem={initialItem} />
  );
}
