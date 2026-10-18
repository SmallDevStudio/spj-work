import { z } from "zod";

import {
  ALL_MASTER_DATA_STATUSES,
  MASTER_DATA_STATUS,
  ORGANIZATION_STRUCTURE_LIMITS,
} from "@/constants/organization-structure";

function emptyValueToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}

const departmentNameSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z
    .string({
      required_error: "กรุณากรอกชื่อแผนก",
    })
    .trim()
    .min(1, "กรุณากรอกชื่อแผนก")
    .max(
      ORGANIZATION_STRUCTURE_LIMITS.name,
      `ชื่อแผนกต้องไม่เกิน ${ORGANIZATION_STRUCTURE_LIMITS.name} ตัวอักษร`,
    ),
);

const descriptionSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .max(
      ORGANIZATION_STRUCTURE_LIMITS.description,
      `รายละเอียดต้องไม่เกิน ${ORGANIZATION_STRUCTURE_LIMITS.description} ตัวอักษร`,
    )
    .nullable(),
);

const managerEmployeeIdSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .min(1, "รหัสหัวหน้าแผนกไม่ถูกต้อง")
    .max(128, "รหัสหัวหน้าแผนกไม่ถูกต้อง")
    .nullable(),
);

const statusSchema = z
  .enum(ALL_MASTER_DATA_STATUSES, {
    errorMap: () => ({
      message: `สถานะต้องเป็น ${ALL_MASTER_DATA_STATUSES.join(", ")}`,
    }),
  })
  .default(MASTER_DATA_STATUS.ACTIVE);

export const departmentCreateSchema = z.object({
  nameTh: departmentNameSchema,
  description: descriptionSchema.default(null),
  managerEmployeeId: managerEmployeeIdSchema.default(null),
});

export const departmentUpdateSchema = z
  .object({
    nameTh: departmentNameSchema.optional(),
    description: descriptionSchema.optional(),
    managerEmployeeId: managerEmployeeIdSchema.optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "กรุณาระบุข้อมูลที่ต้องการแก้ไข",
  });

export const departmentIdSchema = z
  .string({
    required_error: "ไม่พบรหัสอ้างอิงแผนก",
  })
  .trim()
  .min(1, "ไม่พบรหัสอ้างอิงแผนก")
  .max(128, "รหัสอ้างอิงแผนกไม่ถูกต้อง");

export const departmentListQuerySchema = z.object({
  status: z
    .enum(["ALL", ...ALL_MASTER_DATA_STATUSES], {
      errorMap: () => ({
        message: "ตัวกรองสถานะไม่ถูกต้อง",
      }),
    })
    .default("ACTIVE"),

  search: z
    .string()
    .trim()
    .max(100, "คำค้นหาต้องไม่เกิน 100 ตัวอักษร")
    .default(""),

  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export function validateDepartmentCreateInput(input) {
  return departmentCreateSchema.safeParse(input);
}

export function validateDepartmentUpdateInput(input) {
  return departmentUpdateSchema.safeParse(input);
}

export function formatOrganizationStructureValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    code: issue.code,
    message: issue.message,
  }));
}
