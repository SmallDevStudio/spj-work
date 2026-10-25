import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getHolidayAnnouncement } from "@/services/leave/holiday-announcement.service";
import HolidayAnnouncementPreview from "@/components/leave/HolidayAnnouncementPreview";
import HolidayAnnouncementOptions from "@/components/leave/HolidayAnnouncementOptions";
import { listHolidayAnnouncementOptions } from "@/services/leave/holiday-announcement-options.service";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตัวอย่างประกาศวันหยุด | SPJ Work" };

export default async function HolidayPrintPreviewPage({ searchParams }) {
  const session = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);
  const { year: rawYear, companyId, executiveEmployeeId } = await searchParams;
  if (!/^(20\d\d|2100)$/.test(rawYear ?? "")) notFound();
  if (!companyId && !executiveEmployeeId) {
    const [year, options] = await Promise.all([
      getLeaveCalendarYear({ organizationId: session.access.organization.id, year: Number(rawYear) }),
      listHolidayAnnouncementOptions({ currentSession: session }),
    ]);
    if (year?.status !== "PUBLISHED") notFound();
    return <HolidayAnnouncementOptions year={Number(rawYear)} {...options} />;
  }
  if (typeof companyId !== "string" || typeof executiveEmployeeId !== "string") notFound();
  const item = await getHolidayAnnouncement({
    currentSession: session,
    year: Number(rawYear),
    companyId,
    executiveEmployeeId,
  });
  return <HolidayAnnouncementPreview item={item} companyId={companyId} />;
}
