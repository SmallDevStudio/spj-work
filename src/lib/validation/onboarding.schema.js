import { z } from "zod";

import { APP_CONFIG } from "@/config/app.config";
import {
  ALL_DEVICE_REQUIREMENTS,
  DEVICE_REQUIREMENT,
  ONBOARDING_LIMITS,
} from "@/constants/onboarding";

function emptyValueToNull(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  return value;
}

function isCompanyEmail(email) {
  const expectedDomain = `@${APP_CONFIG.emailDomain.toLowerCase()}`;

  return email.endsWith(expectedDomain);
}

const employeeIdSchema = z
  .string({
    required_error: "ไม่พบรหัสอ้างอิงพนักงาน",
  })
  .trim()
  .min(1, "ไม่พบรหัสอ้างอิงพนักงาน")
  .max(128, "รหัสอ้างอิงพนักงานไม่ถูกต้อง");

const deviceRequirementSchema = z.enum(ALL_DEVICE_REQUIREMENTS, {
  errorMap: () => ({
    message: `ประเภทอุปกรณ์ต้องเป็น ${ALL_DEVICE_REQUIREMENTS.join(", ")}`,
  }),
});

const deviceRequirementNotesSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .max(
      ONBOARDING_LIMITS.assetRequirementNotes,
      `รายละเอียดอุปกรณ์ต้องไม่เกิน ${ONBOARDING_LIMITS.assetRequirementNotes} ตัวอักษร`,
    )
    .nullable(),
);

const generalNotesSchema = z.preprocess(
  emptyValueToNull,
  z
    .string()
    .trim()
    .max(
      ONBOARDING_LIMITS.notes,
      `หมายเหตุต้องไม่เกิน ${ONBOARDING_LIMITS.notes} ตัวอักษร`,
    )
    .nullable(),
);

export const onboardingCreateDetailsSchema = z
  .object({
    submitToIT: z.boolean().default(true),

    deviceRequirement: deviceRequirementSchema.default(
      DEVICE_REQUIREMENT.NOTEBOOK,
    ),

    deviceRequirementNotes: deviceRequirementNotesSchema.default(null),

    notes: generalNotesSchema.default(null),
  })
  .strict()
  .superRefine((data, context) => {
    if (
      data.deviceRequirement === DEVICE_REQUIREMENT.OTHER &&
      !data.deviceRequirementNotes
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceRequirementNotes"],
        message: "กรุณาระบุรายละเอียดอุปกรณ์ที่ต้องการ",
      });
    }
  });

export const onboardingStartSchema = z
  .object({
    assigneeUserId: z.preprocess(
      emptyValueToNull,
      z.string().trim().min(1).max(128).nullable(),
    ),

    notes: generalNotesSchema.default(null),
  })
  .strict();

export const onboardingBlockSchema = z
  .object({
    reason: z
      .string({
        required_error: "กรุณาระบุสาเหตุที่ไม่สามารถดำเนินการต่อได้",
      })
      .trim()
      .min(3, "กรุณาระบุสาเหตุอย่างน้อย 3 ตัวอักษร")
      .max(
        ONBOARDING_LIMITS.blockingReason,
        `สาเหตุต้องไม่เกิน ${ONBOARDING_LIMITS.blockingReason} ตัวอักษร`,
      ),
  })
  .strict();

export const onboardingResumeSchema = z
  .object({
    notes: generalNotesSchema.default(null),
  })
  .strict();

export const accountProvisioningCompleteSchema = z
  .object({
    workEmail: z
      .string({
        required_error: "กรุณากรอกอีเมลบริษัท",
      })
      .trim()
      .toLowerCase()
      .email("รูปแบบอีเมลไม่ถูกต้อง")
      .refine(isCompanyEmail, {
        message: `ต้องใช้อีเมล @${APP_CONFIG.emailDomain} เท่านั้น`,
      }),

    domainAccountName: z.preprocess(
      emptyValueToNull,
      z
        .string()
        .trim()
        .max(
          ONBOARDING_LIMITS.accountName,
          `ชื่อบัญชี Domain ต้องไม่เกิน ${ONBOARDING_LIMITS.accountName} ตัวอักษร`,
        )
        .nullable(),
    ),

    domainAccountCompleted: z.boolean().refine((value) => value === true, {
      message: "กรุณายืนยันว่าตั้งค่า Domain Account แล้ว",
    }),

    printerAccountCompleted: z.boolean().refine((value) => value === true, {
      message: "กรุณายืนยันว่าตั้งค่า Printer Account แล้ว",
    }),

    notes: generalNotesSchema.default(null),
  })
  .strict();

export const onboardingCancelSchema = z
  .object({
    reason: z
      .string({
        required_error: "กรุณาระบุเหตุผลในการยกเลิก",
      })
      .trim()
      .min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร")
      .max(
        ONBOARDING_LIMITS.blockingReason,
        `เหตุผลต้องไม่เกิน ${ONBOARDING_LIMITS.blockingReason} ตัวอักษร`,
      ),
  })
  .strict();

export const onboardingIdSchema = z
  .string()
  .trim()
  .min(1, "ไม่พบรหัสอ้างอิง Onboarding")
  .max(128, "รหัสอ้างอิง Onboarding ไม่ถูกต้อง");

export const onboardingEmployeeIdSchema = employeeIdSchema;

export function formatOnboardingValidationErrors(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "request",
    code: issue.code,
    message: issue.message,
  }));
}
