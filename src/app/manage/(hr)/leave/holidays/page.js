import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readHolidayCalendarYears } from "@/services/leave/leave-calendar-query.service";
import HolidayYearDirectory from "@/components/leave/HolidayYearDirectory";

export const dynamic = "force-dynamic";

export default async function HolidaySettingsPage() {
  const currentSession = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

  const years = await readHolidayCalendarYears({ currentSession });
  return <HolidayYearDirectory years={years} />;
}
