import "server-only";

import { ROLES } from "@/constants/roles";
import { AuthSessionError } from "@/lib/auth/auth-session-error";

export const COMPANY_SCOPE = Object.freeze({
  ALL: "ALL",
  SELECTED: "SELECTED",
  UNASSIGNED: "UNASSIGNED",
});

function invalidCompanyAccess() {
  throw new AuthSessionError({
    code: "AUTH_COMPANY_ACCESS_INVALID",
    message: "Company access configuration is invalid.",
    status: 403,
  });
}

export function resolveCompanyAccess({ role, companyAccess }) {
  // SUPERADMIN เข้าถึงทุกบริษัทเสมอ
  if (role === ROLES.SUPERADMIN) {
    return {
      scope: COMPANY_SCOPE.ALL,
      companyIds: [],
    };
  }

  // บัญชีเดิมที่ยังไม่ได้กำหนด scope ต้องไม่ถูกตีความว่าเห็นทุกบริษัท
  if (companyAccess == null) {
    return {
      scope: COMPANY_SCOPE.UNASSIGNED,
      companyIds: [],
    };
  }

  if (typeof companyAccess !== "object" || Array.isArray(companyAccess)) {
    invalidCompanyAccess();
  }

  if (companyAccess.scope === COMPANY_SCOPE.ALL) {
    return {
      scope: COMPANY_SCOPE.ALL,
      companyIds: [],
    };
  }

  if (companyAccess.scope !== COMPANY_SCOPE.SELECTED) {
    invalidCompanyAccess();
  }

  const companyIds = companyAccess.companyIds;

  if (
    !Array.isArray(companyIds) ||
    companyIds.length === 0 ||
    companyIds.length > 100 ||
    companyIds.some(
      (id) =>
        typeof id !== "string" ||
        !id.trim() ||
        id.length > 128 ||
        id.includes("/"),
    )
  ) {
    invalidCompanyAccess();
  }

  const uniqueIds = [...new Set(companyIds)];

  if (uniqueIds.length !== companyIds.length) {
    invalidCompanyAccess();
  }

  return {
    scope: COMPANY_SCOPE.SELECTED,
    companyIds: uniqueIds,
  };
}

export function canAccessCompany(companyAccess, companyId) {
  if (typeof companyId !== "string" || !companyId.trim() || !companyAccess) {
    return false;
  }

  return (
    companyAccess.scope === COMPANY_SCOPE.ALL ||
    (companyAccess.scope === COMPANY_SCOPE.SELECTED &&
      companyAccess.companyIds.includes(companyId))
  );
}
