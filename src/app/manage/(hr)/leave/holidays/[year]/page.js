import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";
import LeaveCalendarSettingsClient from "@/components/leave/LeaveCalendarSettingsClient";

export const dynamic = "force-dynamic";

export default async function EditHolidayYearPage({ params }) {
  const session = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);
  const { year: rawYear } = await params;
  if (!/^(20\d\d|2100)$/.test(rawYear)) notFound();
  const year = Number(rawYear);
  const item = await getLeaveCalendarYear({ organizationId: session.access.organization.id, year });
  if (!item) notFound();
  return <LeaveCalendarSettingsClient initialYear={year} initialItem={item} />;
}
