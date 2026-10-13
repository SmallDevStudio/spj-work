import { z } from "zod";

import { APP_CONFIG } from "@/config/app.config";
import {
  ALL_EMPLOYEE_GENDERS,
  ALL_EMPLOYMENT_STATUSES,
  ALL_EMPLOYMENT_TYPES,
  DEFAULT_EMPLOYEE_VALUES,
  EMPLOYEE_LIMITS,
} from "@/constants/employees";
import { ROLES } from "@/constants/roles";

const ASSIGNABLE_EMPLOYEE_ROLES = Object.freeze([
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.APPROVER,
]);

function normalizeText(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value).trim();
  }

  return value;
}

function emptyValueToNull(value) {
  const normalizedValue = normalizeText(value);

  if (
    normalizedValue === undefined ||
    normalizedValue === null ||
    normalizedValue === ""
  ) {
    return null;
  }

  return normalizedValue;
}

function normalizeEmployeePin(value) {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 9999
  ) {
    return String(value).padStart(EMPLOYEE_LIMITS.employeePinLength, "0");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function isValidISODate(value) {
  if (value === null) {
    return true;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return false;
  }

  return parsedDate.toISOString().slice(0, 10) === value;
}

function isFutureDate(value) {
  if (!value) {
    return false;
  }

  const today = new Date();
  const todayValue = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");

  return value > todayValue;
}

function isCompanyEmail(email) {
  const expectedDomain = `@${APP_CONFIG.emailDomain.toLowerCase()}`;

  return email.endsWith(expectedDomain);
}

const employeeCodeSchema = z
  .preprocess(
    normalizeText,
    z
      .string({
        required_error: "กรุณากรอกรหัสพนักงาน",
      })
      .trim()
      .min(1, "กรุณากรอกรหัสพนักงาน")
      .max(
        EMPLOYEE_LIMITS.employeeCode,
        `รหัสพนักงานต้องไม่เกิน ${EMPLOYEE_LIMITS.employeeCode} ตัวอักษร`,
      )
      .regex(
        /^[A-Za-z0-9._/-]+$/,
        "รหัสพนักงานใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข จุด ขีดกลาง ขีดล่าง และเครื่องหมายทับ",
      ),
  )
  .transform((value) => value.toUpperCase());

const firstNameSchema = z.preprocess(
  normalizeText,
  z
    .string({
      required_error: "กรุณากรอกชื่อ",
    })
    .trim()
    .min(1, "กรุณากรอกชื่อ")
    .max(
      EMPLOYEE_LIMITS.firstName,
      `ชื่อต้องไม่เกิน ${EMPLOYEE_LIMITS.firstName} ตัวอักษร`,
    ),
);

const lastNameSchema = z.preprocess(
  normalizeText,
  z
    .string({
      required_error: "กรุณากรอกนามสกุล",
    })
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(
      EMPLOYEE_LIMITS.lastName,
      `นามสกุลต้องไม่เกิน ${EMPLOYEE_LIMITS.lastName} ตัวอักษร`,
    ),
);

const genderSchema = z.preprocess(
  (value) => {
    const normalizedValue = emptyValueToNull(value);

    return normalizedValue?.toUpperCase() ?? DEFAULT_EMPLOYEE_VALUES.gender;
  },
  z.enum(ALL_EMPLOYEE_GENDERS, {
    errorMap: () => ({
      message: `เพศต้องเป็น ${ALL_EMPLOYEE_GENDERS.join(", ")}`,
    }),
  }),
);

const birthDateSchema = z
  .preprocess(
    normalizeText,
    z
      .string({
        required_error: "กรุณาระบุวันเดือนปีเกิด",
      })
      .trim()
      .min(1, "กรุณาระบุวันเดือนปีเกิด"),
  )
  .refine(isValidISODate, {
    message: "วันเดือนปีเกิดต้องอยู่ในรูปแบบ YYYY-MM-DD",
  })
  .refine((value) => !isFutureDate(value), {
    message: "วันเดือนปีเกิดต้องไม่เป็นวันที่ในอนาคต",
  });

const phoneNumberSchema = z.preprocess(
  normalizeText,
  z
    .string({
      required_error: "กรุณากรอกเบอร์โทรศัพท์",
    })
    .trim()
    .min(1, "กรุณากรอกเบอร์โทรศัพท์")
    .max(
      EMPLOYEE_LIMITS.phoneNumber,
      `เบอร์โทรศัพท์ต้องไม่เกิน ${EMPLOYEE_LIMITS.phoneNumber} ตัวอักษร`,
    )
    .regex(/^[0-9+\-()\s]+$/, "เบอร์โทรศัพท์มีตัวอักษรที่ไม่รองรับ"),
);

const positionTitleSchema = z.preprocess(
  normalizeText,
  z
    .string({
      required_error: "กรุณากรอกตำแหน่ง",
    })
    .trim()
    .min(1, "กรุณากรอกตำแหน่ง")
    .max(
      EMPLOYEE_LIMITS.positionTitle,
      `ตำแหน่งต้องไม่เกิน ${EMPLOYEE_LIMITS.positionTitle} ตัวอักษร`,
    ),
);

const requiredDepartmentIdSchema = z.preprocess(
  normalizeText,
  z
    .string({
      required_error: "กรุณาเลือกแผนก",
    })
    .trim()
    .min(1, "กรุณาเลือกแผนก")
    .max(128, "รหัสแผนกไม่ถูกต้อง"),
);

const managerEmployeeIdSchema = z.preprocess(
  emptyValueToNull,
  z.string().trim().min(1).max(128).nullable(),
);

const employeePinSchema = z.preprocess(
  normalizeEmployeePin,
  z
    .string({
      required_error: "กรุณากรอกรหัส 4 หลัก",
    })
    .length(EMPLOYEE_LIMITS.employeePinLength, "รหัสต้องมีตัวเลข 4 หลัก")
    .regex(/^\d{4}$/, "รหัสต้องเป็นตัวเลข 4 หลัก"),
);

const notesSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .max(
      EMPLOYEE_LIMITS.notes,
      `หมายเหตุต้องไม่เกิน ${EMPLOYEE_LIMITS.notes} ตัวอักษร`,
    )
    .nullable(),
);

const employmentTypeSchema = z.preprocess(
  (value) => {
    const normalizedValue = emptyValueToNull(value);

    return (
      normalizedValue?.toUpperCase() ?? DEFAULT_EMPLOYEE_VALUES.employmentType
    );
  },
  z.enum(ALL_EMPLOYMENT_TYPES, {
    errorMap: () => ({
      message: `ประเภทการจ้างต้องเป็น ${ALL_EMPLOYMENT_TYPES.join(", ")}`,
    }),
  }),
);

const employmentStatusSchema = z.preprocess(
  (value) => {
    const normalizedValue = emptyValueToNull(value);

    return (
      normalizedValue?.toUpperCase() ?? DEFAULT_EMPLOYEE_VALUES.employmentStatus
    );
  },
  z.enum(ALL_EMPLOYMENT_STATUSES, {
    errorMap: () => ({
      message: `สถานะพนักงานต้องเป็น ${ALL_EMPLOYMENT_STATUSES.join(", ")}`,
    }),
  }),
);

const effectiveDateSchema = z
  .preprocess(
    normalizeText,
    z
      .string({
        required_error: "กรุณาระบุวันที่มีผล",
      })
      .trim()
      .min(1, "กรุณาระบุวันที่มีผล"),
  )
  .refine(isValidISODate, {
    message: "วันที่มีผลต้องอยู่ในรูปแบบ YYYY-MM-DD",
  });

const optionalWorkEmailSchema = z
  .preprocess(
    emptyValueToNull,
    z
      .string()
      .trim()
      .max(
        EMPLOYEE_LIMITS.email,
        `อีเมลต้องไม่เกิน ${EMPLOYEE_LIMITS.email} ตัวอักษร`,
      )
      .email("รูปแบบอีเมลไม่ถูกต้อง")
      .nullable(),
  )
  .transform((value) => value?.toLowerCase() ?? null)
  .refine((value) => value === null || isCompanyEmail(value), {
    message: `ต้องใช้อีเมล @${APP_CONFIG.emailDomain} เท่านั้น`,
  });

const employeeRoleSchema = z.preprocess(
  (value) => {
    const normalizedValue = emptyValueToNull(value);

    return normalizedValue?.toUpperCase() ?? DEFAULT_EMPLOYEE_VALUES.role;
  },
  z.enum(ASSIGNABLE_EMPLOYEE_ROLES, {
    errorMap: () => ({
      message: `Role ต้องเป็น ${ASSIGNABLE_EMPLOYEE_ROLES.join(", ")}`,
    }),
  }),
);

export const employeeCreateSchema = z
  .object({
    employeeCode: employeeCodeSchema,
    firstName: firstNameSchema,
    lastName: lastNameSchema,
    gender: genderSchema,
    birthDate: birthDateSchema,
    phoneNumber: phoneNumberSchema,
    positionTitle: positionTitleSchema,
    departmentId: requiredDepartmentIdSchema,
    managerEmployeeId: managerEmployeeIdSchema.default(null),
    employeePin: employeePinSchema,
    notes: notesSchema.default(null),
    employmentType: employmentTypeSchema,
    employmentStatus: employmentStatusSchema,
    effectiveDate: effectiveDateSchema,
    workEmail: optionalWorkEmailSchema.default(null),
    role: employeeRoleSchema,
  })
  .strict();

export const employeeImportRowSchema = employeeCreateSchema.passthrough();

export const employeeIdSchema = z
  .string()
  .trim()
  .min(1, "ไม่พบรหัสอ้างอิงพนักงาน")
  .max(128, "รหัสอ้างอิงพนักงานไม่ถูกต้อง");

export function validateEmployeeCreateInput(input) {
  return employeeCreateSchema.safeParse(input);
}

export function validateEmployeeImportRow(input) {
  return employeeImportRowSchema.safeParse(input);
}

export function formatEmployeeValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "row",
    code: issue.code,
    message: issue.message,
  }));
}
