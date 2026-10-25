import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { listCompanies } from "@/repositories/company/company.repository";
import { listEmployees } from "@/repositories/employee/employee.repository";

export async function listHolidayAnnouncementOptions({ currentSession }) {
  const organizationId = currentSession.access.organization.id;
  const access = currentSession.access.membership.companyAccess;
  const globalAccess = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR_ADMIN]
    .includes(currentSession.access.membership.role) &&
    currentSession.access.permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL);
  const [companies, employees] = await Promise.all([
    listCompanies({ organizationId }),
    listEmployees({ organizationId, companyAccess: globalAccess ? { scope: "ALL", companyIds: [] } : access, limit: 500 }),
  ]);

  return {
    companies: companies
      .filter((company) => globalAccess || access.scope === "ALL" || access.companyIds?.includes(company.id))
      .map(({ id, code, nameTh }) => ({ id, code, nameTh })),
    executives: employees
      .filter((employee) => employee.employmentStatus === "ACTIVE" && employee.isDeleted !== true)
      .map((employee) => ({
        id: employee.id,
        name: [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.displayName,
        positionTitle: employee.positionTitle ?? "",
        companyId: employee.companyId,
        suggested: employee.role === ROLES.EXECUTIVE || /ผู้บริหาร|กรรมการ|director|executive|owner|ceo/i.test(employee.positionTitle ?? ""),
      }))
      .filter((employee) => employee.name)
      .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.name.localeCompare(b.name, "th")),
  };
}
