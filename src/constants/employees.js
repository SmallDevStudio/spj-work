export const EMPLOYMENT_STATUS = Object.freeze({
  PRE_HIRE: "PRE_HIRE",
  ONBOARDING: "ONBOARDING",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  TERMINATED: "TERMINATED",
});

export const EMPLOYMENT_STATUS_LABELS = Object.freeze({
  [EMPLOYMENT_STATUS.PRE_HIRE]: {
    th: "รอเริ่มงาน",
    en: "Pre-hire",
  },
  [EMPLOYMENT_STATUS.ONBOARDING]: {
    th: "อยู่ระหว่างเตรียมพนักงาน",
    en: "Onboarding",
  },
  [EMPLOYMENT_STATUS.ACTIVE]: {
    th: "ปฏิบัติงาน",
    en: "Active",
  },
  [EMPLOYMENT_STATUS.INACTIVE]: {
    th: "ไม่ปฏิบัติงาน",
    en: "Inactive",
  },
  [EMPLOYMENT_STATUS.SUSPENDED]: {
    th: "ระงับสถานะ",
    en: "Suspended",
  },
  [EMPLOYMENT_STATUS.TERMINATED]: {
    th: "สิ้นสุดการจ้างงาน",
    en: "Terminated",
  },
});

export const EMPLOYMENT_TYPE = Object.freeze({
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACT",
  FREELANCE: "FREELANCE",
  INTERN: "INTERN",
});

export const EMPLOYMENT_TYPE_LABELS = Object.freeze({
  [EMPLOYMENT_TYPE.FULL_TIME]: {
    th: "พนักงานประจำ",
    en: "Full-time",
  },
  [EMPLOYMENT_TYPE.PART_TIME]: {
    th: "พนักงานพาร์ตไทม์",
    en: "Part-time",
  },
  [EMPLOYMENT_TYPE.CONTRACT]: {
    th: "พนักงานสัญญาจ้าง",
    en: "Contract",
  },
  [EMPLOYMENT_TYPE.FREELANCE]: {
    th: "ฟรีแลนซ์",
    en: "Freelance",
  },
  [EMPLOYMENT_TYPE.INTERN]: {
    th: "นักศึกษาฝึกงาน",
    en: "Intern",
  },
});

export const EMPLOYEE_GENDER = Object.freeze({
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
  NOT_SPECIFIED: "NOT_SPECIFIED",
});

export const EMPLOYEE_GENDER_LABELS = Object.freeze({
  [EMPLOYEE_GENDER.MALE]: {
    th: "ชาย",
    en: "Male",
  },
  [EMPLOYEE_GENDER.FEMALE]: {
    th: "หญิง",
    en: "Female",
  },
  [EMPLOYEE_GENDER.OTHER]: {
    th: "อื่น ๆ",
    en: "Other",
  },
  [EMPLOYEE_GENDER.NOT_SPECIFIED]: {
    th: "ไม่ระบุ",
    en: "Not specified",
  },
});

export const EMPLOYEE_ACCESS_STATUS = Object.freeze({
  NOT_CONFIGURED: "NOT_CONFIGURED",
  PENDING_LINK: "PENDING_LINK",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
});

export const EMPLOYEE_ACCESS_STATUS_LABELS = Object.freeze({
  [EMPLOYEE_ACCESS_STATUS.NOT_CONFIGURED]: {
    th: "ยังไม่ได้สร้างบัญชี",
    en: "Not configured",
  },
  [EMPLOYEE_ACCESS_STATUS.PENDING_LINK]: {
    th: "รอเชื่อมบัญชี Google",
    en: "Pending Google link",
  },
  [EMPLOYEE_ACCESS_STATUS.ACTIVE]: {
    th: "ใช้งานระบบได้",
    en: "Active",
  },
  [EMPLOYEE_ACCESS_STATUS.SUSPENDED]: {
    th: "ระงับการใช้งาน",
    en: "Suspended",
  },
  [EMPLOYEE_ACCESS_STATUS.REVOKED]: {
    th: "ยกเลิกสิทธิ์",
    en: "Revoked",
  },
});

export const EMPLOYEE_SOURCE = Object.freeze({
  MANUAL: "MANUAL",
  EXCEL_IMPORT: "EXCEL_IMPORT",
  GOOGLE_WORKSPACE_SYNC: "GOOGLE_WORKSPACE_SYNC",
});

export const EMPLOYEE_SOURCE_LABELS = Object.freeze({
  [EMPLOYEE_SOURCE.MANUAL]: {
    th: "เพิ่มรายบุคคล",
    en: "Manual",
  },
  [EMPLOYEE_SOURCE.EXCEL_IMPORT]: {
    th: "นำเข้าจาก Excel",
    en: "Excel Import",
  },
  [EMPLOYEE_SOURCE.GOOGLE_WORKSPACE_SYNC]: {
    th: "Google Workspace",
    en: "Google Workspace",
  },
});

export const EMPLOYEE_IMPORT_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  VALIDATING: "VALIDATING",
  READY: "READY",
  IMPORTING: "IMPORTING",
  COMPLETED: "COMPLETED",
  COMPLETED_WITH_ERRORS: "COMPLETED_WITH_ERRORS",
  FAILED: "FAILED",
});

export const EMPLOYEE_IMPORT_ROW_STATUS = Object.freeze({
  VALID: "VALID",
  INVALID: "INVALID",
  DUPLICATE_IN_FILE: "DUPLICATE_IN_FILE",
  DUPLICATE_IN_SYSTEM: "DUPLICATE_IN_SYSTEM",
  CONFLICT: "CONFLICT",
  IMPORTED: "IMPORTED",
  FAILED: "FAILED",
});

export const EMPLOYEE_IMPORT_COLUMNS = Object.freeze({
  EMPLOYEE_CODE: "employeeCode",
  FIRST_NAME: "firstName",
  LAST_NAME: "lastName",
  GENDER: "gender",
  BIRTH_DATE: "birthDate",
  PHONE_NUMBER: "phoneNumber",
  POSITION_TITLE: "positionTitle",
  DEPARTMENT: "department",
  MANAGER_EMAIL: "managerEmail",
  EMPLOYEE_PIN: "employeePin",
  NOTES: "notes",
  EMPLOYMENT_TYPE: "employmentType",
  EMPLOYMENT_STATUS: "employmentStatus",
  EFFECTIVE_DATE: "effectiveDate",
  WORK_EMAIL: "workEmail",
});

export const REQUIRED_EMPLOYEE_IMPORT_COLUMNS = Object.freeze([
  EMPLOYEE_IMPORT_COLUMNS.EMPLOYEE_CODE,
  EMPLOYEE_IMPORT_COLUMNS.FIRST_NAME,
  EMPLOYEE_IMPORT_COLUMNS.LAST_NAME,
  EMPLOYEE_IMPORT_COLUMNS.GENDER,
  EMPLOYEE_IMPORT_COLUMNS.BIRTH_DATE,
  EMPLOYEE_IMPORT_COLUMNS.PHONE_NUMBER,
  EMPLOYEE_IMPORT_COLUMNS.POSITION_TITLE,
  EMPLOYEE_IMPORT_COLUMNS.DEPARTMENT,
  EMPLOYEE_IMPORT_COLUMNS.EMPLOYEE_PIN,
  EMPLOYEE_IMPORT_COLUMNS.EFFECTIVE_DATE,
]);

export const DEFAULT_EMPLOYEE_VALUES = Object.freeze({
  employmentType: EMPLOYMENT_TYPE.FULL_TIME,
  employmentStatus: EMPLOYMENT_STATUS.ONBOARDING,
  gender: EMPLOYEE_GENDER.NOT_SPECIFIED,
  role: "EMPLOYEE",
});

export const EMPLOYEE_LIMITS = Object.freeze({
  employeeCode: 30,
  firstName: 100,
  lastName: 100,
  phoneNumber: 30,
  positionTitle: 150,
  email: 254,
  notes: 2000,
  employeePinLength: 4,
  importRows: 5000,
  importFileSizeBytes: 10 * 1024 * 1024,
});

export const ALL_EMPLOYMENT_STATUSES = Object.freeze(
  Object.values(EMPLOYMENT_STATUS),
);

export const ALL_EMPLOYMENT_TYPES = Object.freeze(
  Object.values(EMPLOYMENT_TYPE),
);

export const ALL_EMPLOYEE_GENDERS = Object.freeze(
  Object.values(EMPLOYEE_GENDER),
);

export const ALL_EMPLOYEE_ACCESS_STATUSES = Object.freeze(
  Object.values(EMPLOYEE_ACCESS_STATUS),
);

export const ALL_EMPLOYEE_SOURCES = Object.freeze(
  Object.values(EMPLOYEE_SOURCE),
);
