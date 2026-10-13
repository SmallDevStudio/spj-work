export const MASTER_DATA_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
});

export const MASTER_DATA_STATUS_LABELS = Object.freeze({
  [MASTER_DATA_STATUS.ACTIVE]: {
    th: "ใช้งาน",
    en: "Active",
  },
  [MASTER_DATA_STATUS.INACTIVE]: {
    th: "ไม่ใช้งาน",
    en: "Inactive",
  },
});

export const ORGANIZATION_STRUCTURE_SOURCE = Object.freeze({
  MANUAL: "MANUAL",
  EXCEL_IMPORT: "EXCEL_IMPORT",
  GOOGLE_WORKSPACE_SYNC: "GOOGLE_WORKSPACE_SYNC",
});

export const ORGANIZATION_STRUCTURE_SOURCE_LABELS = Object.freeze({
  [ORGANIZATION_STRUCTURE_SOURCE.MANUAL]: {
    th: "เพิ่มด้วยตนเอง",
    en: "Manual",
  },
  [ORGANIZATION_STRUCTURE_SOURCE.EXCEL_IMPORT]: {
    th: "นำเข้าจาก Excel",
    en: "Excel Import",
  },
  [ORGANIZATION_STRUCTURE_SOURCE.GOOGLE_WORKSPACE_SYNC]: {
    th: "Google Workspace",
    en: "Google Workspace",
  },
});

export const ORGANIZATION_STRUCTURE_LIMITS = Object.freeze({
  code: 30,
  name: 150,
  description: 500,
  sortOrderMinimum: 0,
  sortOrderMaximum: 9999,
});

export const ALL_MASTER_DATA_STATUSES = Object.freeze(
  Object.values(MASTER_DATA_STATUS),
);

export const ALL_ORGANIZATION_STRUCTURE_SOURCES = Object.freeze(
  Object.values(ORGANIZATION_STRUCTURE_SOURCE),
);
