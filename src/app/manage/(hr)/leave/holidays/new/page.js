import { notFound, redirect } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";
import LeaveCalendarSettingsClient from "@/components/leave/LeaveCalendarSettingsClient";

export const dynamic = "force-dynamic";

export default async function NewHolidayYearPage({ searchParams }) {
  const session = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);
  const { year: rawYear } = await searchParams;
  const year = Number(rawYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) notFound();
  const existing = await getLeaveCalendarYear({ organizationId: session.access.organization.id, year });
  if (existing) redirect(`/manage/leave/holidays/${year}`);
  return <LeaveCalendarSettingsClient initialYear={year} initialItem={null} />;
}
