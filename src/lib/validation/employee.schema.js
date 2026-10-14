import { z } from "zod";

import { APP_CONFIG } from "@/config/app.config";
import {
  ALL_EMPLOYEE_GENDERS,
  ALL_EMPLOYMENT_STATUSES,
  ALL_EMPLOYMENT_TYPES,
  ALL_MANAGER_ASSIGNMENT_TYPES,
  DEFAULT_EMPLOYEE_VALUES,
  EMPLOYEE_LIMITS,
  MANAGER_ASSIGNMENT_TYPE,
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

function createOptionalTextSchema({ maximum, message }) {
  return z.preprocess(
    emptyValueToNull,
    z.string().trim().max(maximum, message).nullable(),
  );
}

function normalizePrinterCode(value) {
  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 9999
  ) {
    return String(value).padStart(EMPLOYEE_LIMITS.printerCodeLength, "0");
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
  .preprocess(emptyValueToNull, z.string().trim().nullable())
  .refine((value) => value === null || isValidISODate(value), {
    message: "วันเดือนปีเกิดต้องอยู่ในรูปแบบ YYYY-MM-DD",
  })
  .refine((value) => value === null || !isFutureDate(value), {
    message: "วันเดือนปีเกิดต้องไม่เป็นวันที่ในอนาคต",
  });

const phoneNumberSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .max(
      EMPLOYEE_LIMITS.phoneNumber,
      `เบอร์โทรศัพท์ต้องไม่เกิน ${EMPLOYEE_LIMITS.phoneNumber} ตัวอักษร`,
    )
    .regex(/^[0-9+\-()\s]+$/, "เบอร์โทรศัพท์มีตัวอักษรที่ไม่รองรับ")
    .nullable(),
);

const positionTitleSchema = createOptionalTextSchema({
  maximum: EMPLOYEE_LIMITS.positionTitle,
  message: `ตำแหน่งต้องไม่เกิน ${EMPLOYEE_LIMITS.positionTitle} ตัวอักษร`,
});

const departmentIdSchema = z.preprocess(
  emptyValueToNull,
  z.string().trim().min(1).max(128).nullable(),
);

const managerEmployeeIdSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .min(1, "รหัสหัวหน้างานไม่ถูกต้อง")
    .max(128, "รหัสหัวหน้างานไม่ถูกต้อง")
    .nullable(),
);

const managerAssignmentTypeSchema = z
  .enum(ALL_MANAGER_ASSIGNMENT_TYPES, {
    errorMap: () => ({
      message: `รูปแบบการกำหนดหัวหน้าต้องเป็น ${ALL_MANAGER_ASSIGNMENT_TYPES.join(", ")}`,
    }),
  })
  .default(DEFAULT_EMPLOYEE_VALUES.managerAssignmentType);

const printerCodeSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .length(
      EMPLOYEE_LIMITS.printerCodeLength,
      "รหัส Printer ต้องมีตัวเลข 4 หลัก",
    )
    .regex(/^\d{4}$/, "รหัส Printer ต้องเป็นตัวเลข 4 หลัก")
    .nullable(),
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
  .preprocess(emptyValueToNull, z.string().trim().nullable())
  .refine((value) => value === null || isValidISODate(value), {
    message: "วันที่มีผลต้องอยู่ในรูปแบบ YYYY-MM-DD",
  });

const requiredWorkEmailSchema = z
  .preprocess(
    normalizeText,
    z
      .string({
        required_error: "กรุณากรอกอีเมลบริษัท",
      })
      .trim()
      .min(1, "กรุณากรอกอีเมลบริษัท")
      .max(
        EMPLOYEE_LIMITS.email,
        `อีเมลต้องไม่เกิน ${EMPLOYEE_LIMITS.email} ตัวอักษร`,
      )
      .email("รูปแบบอีเมลไม่ถูกต้อง"),
  )
  .transform((value) => value.toLowerCase())
  .refine(isCompanyEmail, {
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
    workEmail: requiredWorkEmailSchema,

    gender: genderSchema,
    birthDate: birthDateSchema.default(null),
    phoneNumber: phoneNumberSchema.default(null),
    positionTitle: positionTitleSchema.default(null),
    departmentId: departmentIdSchema.default(null),

    managerAssignmentType: managerAssignmentTypeSchema,
    managerEmployeeId: managerEmployeeIdSchema.default(null),

    printerCode: printerCodeSchema.default(null),
    notes: notesSchema.default(null),
    employmentType: employmentTypeSchema,
    employmentStatus: employmentStatusSchema,
    effectiveDate: effectiveDateSchema.default(null),
    role: employeeRoleSchema,
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.managerAssignmentType === MANAGER_ASSIGNMENT_TYPE.MANUAL &&
      !data.managerEmployeeId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["managerEmployeeId"],
        message: "กรุณาเลือกหัวหน้างานสำหรับการกำหนดแบบรายบุคคล",
      });
    }

    if (
      data.managerAssignmentType !== MANAGER_ASSIGNMENT_TYPE.MANUAL &&
      data.managerEmployeeId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["managerEmployeeId"],
        message: "สามารถระบุหัวหน้างานได้เฉพาะเมื่อเลือกกำหนดหัวหน้าเฉพาะบุคคล",
      });
    }
  });

export const employeeImportRowSchema = employeeCreateSchema;

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
