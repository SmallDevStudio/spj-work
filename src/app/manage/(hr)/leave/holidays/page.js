import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readHolidayCalendarYears } from "@/services/leave/leave-calendar-query.service";
import { listCompanies } from "@/repositories/company/company.repository";
import HolidayYearDirectory from "@/components/leave/HolidayYearDirectory";
import { ROLES } from "@/constants/roles";

export const dynamic = "force-dynamic";

export default async function HolidaySettingsPage() {
  const currentSession = await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

  const [years, companies] = await Promise.all([
    readHolidayCalendarYears({ currentSession }),
    listCompanies({ organizationId: currentSession.access.organization.id }),
  ]);
  const access = currentSession.access.membership.companyAccess;
  const globalCalendarAccess = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR_ADMIN]
    .includes(currentSession.access.membership.role) &&
    currentSession.access.permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL);
  const availableCompanies = companies
    .filter((company) => globalCalendarAccess || access.scope === "ALL" || access.companyIds?.includes(company.id))
    .map(({ id, code, nameTh, logoUrl }) => ({ id, code, nameTh, logoUrl }));

  return <HolidayYearDirectory years={years} companies={availableCompanies} />;
}
