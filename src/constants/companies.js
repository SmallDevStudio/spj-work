export const COMPANY_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

export const COMPANY_ACCESS_SCOPE = Object.freeze({
  ALL: "ALL",
  SELECTED: "SELECTED",
});

export const ALL_COMPANY_STATUSES = Object.freeze(
  Object.values(COMPANY_STATUS),
);

export const ALL_COMPANY_ACCESS_SCOPES = Object.freeze(
  Object.values(COMPANY_ACCESS_SCOPE),
);

export const COMPANY_LIMITS = Object.freeze({
  code: 20,
  name: 150,
  description: 500,
  maxAssignedCompanies: 100,
});
