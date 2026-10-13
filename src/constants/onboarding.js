export const ONBOARDING_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  WAITING_IT: "WAITING_IT",
  IT_IN_PROGRESS: "IT_IN_PROGRESS",
  BLOCKED: "BLOCKED",
  ACCOUNT_READY: "ACCOUNT_READY",
  DEVICE_PENDING: "DEVICE_PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const ONBOARDING_STATUS_LABELS = Object.freeze({
  [ONBOARDING_STATUS.DRAFT]: {
    th: "แบบร่าง",
    en: "Draft",
  },
  [ONBOARDING_STATUS.WAITING_IT]: {
    th: "รอฝ่าย IT",
    en: "Waiting for IT",
  },
  [ONBOARDING_STATUS.IT_IN_PROGRESS]: {
    th: "IT กำลังดำเนินการ",
    en: "IT in progress",
  },
  [ONBOARDING_STATUS.BLOCKED]: {
    th: "ติดปัญหา/รอข้อมูลเพิ่มเติม",
    en: "Blocked",
  },
  [ONBOARDING_STATUS.ACCOUNT_READY]: {
    th: "บัญชีพร้อมใช้งาน",
    en: "Account ready",
  },
  [ONBOARDING_STATUS.DEVICE_PENDING]: {
    th: "รอจัดสรรอุปกรณ์",
    en: "Device pending",
  },
  [ONBOARDING_STATUS.COMPLETED]: {
    th: "เสร็จสมบูรณ์",
    en: "Completed",
  },
  [ONBOARDING_STATUS.CANCELLED]: {
    th: "ยกเลิก",
    en: "Cancelled",
  },
});

export const ONBOARDING_TASK_TYPE = Object.freeze({
  DOMAIN_ACCOUNT: "DOMAIN_ACCOUNT",
  COMPANY_EMAIL: "COMPANY_EMAIL",
  PRINTER_ACCOUNT: "PRINTER_ACCOUNT",
  DEVICE_ASSIGNMENT: "DEVICE_ASSIGNMENT",
});

export const ONBOARDING_TASK_TYPE_LABELS = Object.freeze({
  [ONBOARDING_TASK_TYPE.DOMAIN_ACCOUNT]: {
    th: "สร้างบัญชี Domain",
    en: "Create domain account",
  },
  [ONBOARDING_TASK_TYPE.COMPANY_EMAIL]: {
    th: "สร้างอีเมลบริษัท",
    en: "Create company email",
  },
  [ONBOARDING_TASK_TYPE.PRINTER_ACCOUNT]: {
    th: "สร้างผู้ใช้ในเครื่องพิมพ์",
    en: "Create printer user",
  },
  [ONBOARDING_TASK_TYPE.DEVICE_ASSIGNMENT]: {
    th: "จัดสรรและส่งมอบอุปกรณ์",
    en: "Assign and deliver device",
  },
});

export const ONBOARDING_TASK_STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  BLOCKED: "BLOCKED",
  COMPLETED: "COMPLETED",
  NOT_REQUIRED: "NOT_REQUIRED",
});

export const ONBOARDING_TASK_STATUS_LABELS = Object.freeze({
  [ONBOARDING_TASK_STATUS.NOT_STARTED]: {
    th: "ยังไม่เริ่ม",
    en: "Not started",
  },
  [ONBOARDING_TASK_STATUS.IN_PROGRESS]: {
    th: "กำลังดำเนินการ",
    en: "In progress",
  },
  [ONBOARDING_TASK_STATUS.BLOCKED]: {
    th: "ติดปัญหา",
    en: "Blocked",
  },
  [ONBOARDING_TASK_STATUS.COMPLETED]: {
    th: "เสร็จแล้ว",
    en: "Completed",
  },
  [ONBOARDING_TASK_STATUS.NOT_REQUIRED]: {
    th: "ไม่ต้องดำเนินการ",
    en: "Not required",
  },
});

export const DEVICE_REQUIREMENT = Object.freeze({
  NONE: "NONE",
  NOTEBOOK: "NOTEBOOK",
  DESKTOP: "DESKTOP",
  EXISTING_DEVICE: "EXISTING_DEVICE",
  OTHER: "OTHER",
});

export const DEVICE_REQUIREMENT_LABELS = Object.freeze({
  [DEVICE_REQUIREMENT.NONE]: {
    th: "ไม่ต้องใช้อุปกรณ์",
    en: "No device required",
  },
  [DEVICE_REQUIREMENT.NOTEBOOK]: {
    th: "Notebook",
    en: "Notebook",
  },
  [DEVICE_REQUIREMENT.DESKTOP]: {
    th: "Desktop PC",
    en: "Desktop PC",
  },
  [DEVICE_REQUIREMENT.EXISTING_DEVICE]: {
    th: "ใช้อุปกรณ์ที่มีอยู่แล้ว",
    en: "Use an existing device",
  },
  [DEVICE_REQUIREMENT.OTHER]: {
    th: "อุปกรณ์อื่น ๆ",
    en: "Other",
  },
});

export const ONBOARDING_SOURCE = Object.freeze({
  MANUAL: "MANUAL",
  EXCEL_IMPORT: "EXCEL_IMPORT",
  API: "API",
});

export const ONBOARDING_NOTIFICATION_EVENT = Object.freeze({
  SUBMITTED: "EMPLOYEE_ONBOARDING_SUBMITTED",
  ASSIGNED: "IT_ONBOARDING_ASSIGNED",
  STARTED: "IT_ONBOARDING_STARTED",
  BLOCKED: "IT_ONBOARDING_BLOCKED",
  ACCOUNT_READY: "EMPLOYEE_ACCOUNT_READY",
  ASSET_REQUIRED: "ASSET_ASSIGNMENT_REQUIRED",
  ASSET_DELIVERED: "ASSET_DELIVERED",
  COMPLETED: "EMPLOYEE_ONBOARDING_COMPLETED",
  CANCELLED: "EMPLOYEE_ONBOARDING_CANCELLED",
});

export const NOTIFICATION_CHANNEL = Object.freeze({
  IN_APP: "IN_APP",
  EMAIL: "EMAIL",
  LINE: "LINE",
});

export const NOTIFICATION_OUTBOX_STATUS = Object.freeze({
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SENT: "SENT",
  PARTIALLY_SENT: "PARTIALLY_SENT",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
});

export const ONBOARDING_LIMITS = Object.freeze({
  notes: 2000,
  blockingReason: 1000,
  accountName: 150,
  assetRequirementNotes: 1000,
  notificationAttempts: 5,
});

export const ALL_ONBOARDING_STATUSES = Object.freeze(
  Object.values(ONBOARDING_STATUS),
);

export const ALL_ONBOARDING_TASK_TYPES = Object.freeze(
  Object.values(ONBOARDING_TASK_TYPE),
);

export const ALL_ONBOARDING_TASK_STATUSES = Object.freeze(
  Object.values(ONBOARDING_TASK_STATUS),
);

export const ALL_DEVICE_REQUIREMENTS = Object.freeze(
  Object.values(DEVICE_REQUIREMENT),
);

export const ALL_NOTIFICATION_CHANNELS = Object.freeze(
  Object.values(NOTIFICATION_CHANNEL),
);
