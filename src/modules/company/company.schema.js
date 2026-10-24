import { z } from "zod";

import {
  ALL_COMPANY_ACCESS_SCOPES,
  ALL_COMPANY_STATUSES,
  COMPANY_ACCESS_SCOPE,
  COMPANY_LIMITS,
  COMPANY_STATUS,
} from "@/constants/companies";

const companyCodeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z
    .string()
    .min(2, "รหัสบริษัทต้องมีอย่างน้อย 2 ตัวอักษร")
    .max(
      COMPANY_LIMITS.code,
      `รหัสบริษัทต้องไม่เกิน ${COMPANY_LIMITS.code} ตัวอักษร`,
    )
    .regex(
      /^[A-Z][A-Z0-9_-]*$/,
      "รหัสบริษัทต้องเริ่มด้วย A-Z และใช้ได้เฉพาะ A-Z, 0-9, _ และ -",
    ),
);

const companyNameSchema = z
  .string()
  .trim()
  .min(1, "กรุณากรอกชื่อบริษัท")
  .max(
    COMPANY_LIMITS.name,
    `ชื่อบริษัทต้องไม่เกิน ${COMPANY_LIMITS.name} ตัวอักษร`,
  );

const descriptionSchema = z.preprocess(
  (value) =>
    value === undefined || value === null || value === "" ? null : value,
  z
    .string()
    .trim()
    .max(
      COMPANY_LIMITS.description,
      `รายละเอียดต้องไม่เกิน ${COMPANY_LIMITS.description} ตัวอักษร`,
    )
    .nullable(),
);

const optionalText = (max) => z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.string().trim().max(max).nullable(),
);

const emailSchema = z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.string().trim().email("อีเมลบริษัทไม่ถูกต้อง").max(254).nullable(),
);

const logoUrlSchema = z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.string().trim().url("URL โลโก้ไม่ถูกต้อง").max(1000)
    .refine((value) => /^https:\/\//i.test(value), "โลโก้ต้องใช้ HTTPS").nullable(),
);

const companyIdSchema = z
  .string()
  .trim()
  .min(1, "รหัสอ้างอิงบริษัทไม่ถูกต้อง")
  .max(128, "รหัสอ้างอิงบริษัทไม่ถูกต้อง");

export const companyCreateSchema = z
  .object({
    code: companyCodeSchema,
    nameTh: companyNameSchema,
    description: descriptionSchema.default(null),
    address: optionalText(1000).default(null),
    phoneNumber: optionalText(50).default(null),
    email: emailSchema.default(null),
    logoUrl: logoUrlSchema.default(null),
    status: z.enum(ALL_COMPANY_STATUSES).default(COMPANY_STATUS.ACTIVE),
  })
  .strict();

export const companyUpdateSchema = z
  .object({
    nameTh: companyNameSchema.optional(),
    description: descriptionSchema.optional(),
    address: optionalText(1000).optional(),
    phoneNumber: optionalText(50).optional(),
    email: emailSchema.optional(),
    logoUrl: logoUrlSchema.optional(),
    status: z.enum(ALL_COMPANY_STATUSES).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
  });

export const companyAccessSchema = z
  .object({
    scope: z.enum(ALL_COMPANY_ACCESS_SCOPES),
    companyIds: z
      .array(companyIdSchema)
      .max(COMPANY_LIMITS.maxAssignedCompanies)
      .default([]),
    primaryCompanyId: companyIdSchema.nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    const uniqueIds = new Set(value.companyIds);

    if (uniqueIds.size !== value.companyIds.length) {
      context.addIssue({
        code: "custom",
        path: ["companyIds"],
        message: "มีบริษัทซ้ำในรายการสิทธิ์",
      });
    }

    if (
      value.scope === COMPANY_ACCESS_SCOPE.SELECTED &&
      value.companyIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["companyIds"],
        message: "ต้องเลือกอย่างน้อยหนึ่งบริษัท",
      });
    }

    if (
      value.scope === COMPANY_ACCESS_SCOPE.SELECTED &&
      value.primaryCompanyId &&
      !uniqueIds.has(value.primaryCompanyId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["primaryCompanyId"],
        message: "บริษัทหลักต้องอยู่ในรายการบริษัทที่ได้รับสิทธิ์",
      });
    }
  });

export function formatCompanyValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    code: issue.code,
    message: issue.message,
  }));
}
