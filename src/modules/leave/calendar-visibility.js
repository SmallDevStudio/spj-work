import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";

const GLOBAL_ROLES = new Set([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.HR_ADMIN,
  ROLES.EXECUTIVE,
]);

export function resolveLeaveCalendarVisibility({ role, permissions, companyAccess, ownCompanyId, departmentId, delegatedCompanyIds = [], companies }) {
  const activeIds = new Set(companies.map((company) => company.id));
  if (GLOBAL_ROLES.has(role) && permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL)) {
    return { scope: "ALL_COMPANIES", companyIds: [...activeIds], departmentId: null };
  }

  const hasCompanyPermission = permissions.includes(PERMISSIONS.LEAVE_READ_ALL) || permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL);
  const delegated = delegatedCompanyIds.filter((id) => activeIds.has(id));
  if (hasCompanyPermission || delegated.length > 0) {
    const assigned = role === ROLES.HR_OFFICER
      ? [ownCompanyId].filter((id) => activeIds.has(id))
      : companyAccess?.scope === "ALL"
      ? [...activeIds]
      : companyAccess?.scope === "SELECTED"
        ? (companyAccess.companyIds ?? []).filter((id) => activeIds.has(id))
        : [ownCompanyId].filter((id) => activeIds.has(id));
    const companyIds = [...new Set([...assigned.filter(() => hasCompanyPermission), ...delegated])];
    return { scope: "COMPANIES", companyIds, departmentId: null };
  }

  return {
    scope: "DEPARTMENT",
    companyIds: ownCompanyId && activeIds.has(ownCompanyId) ? [ownCompanyId] : [],
    departmentId: departmentId ?? null,
  };
}
