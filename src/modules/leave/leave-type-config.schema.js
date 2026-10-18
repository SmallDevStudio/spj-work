import { z } from "zod";

import {
  LEAVE_COUNTING_BASIS,
  LEAVE_PAY_TREATMENT,
  LEAVE_TYPE_CODES,
} from "@/constants/leave-types";

const builtinCodes = Object.values(LEAVE_TYPE_CODES);

const companyIdSchema = z
  .string()
  .trim()
  .min(1, "กรุณาเลือกบริษัท")
  .max(128)
  .refine((value) => !value.includes("/"), "บริษัทไม่ถูกต้อง");

const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "รหัสประเภทการลาไม่ถูกต้อง");

const nullableDaysSchema = z.number().int().min(0).max(365).nullable();

const leaveTypeFields = z.object({
  companyId: companyIdSchema,
  code: codeSchema,
  nameTh: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).nullable(),
  countingBasis: z.enum(Object.values(LEAVE_COUNTING_BASIS)),
  payTreatment: z.enum(Object.values(LEAVE_PAY_TREATMENT)),
  entitlementDays: nullableDaysSchema,
  paidDaysCap: nullableDaysSchema,
  reasonRequired: z.boolean(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD")
    .refine((value) => {
      const [year, month, day] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));

      return (
        parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() + 1 === month &&
        parsed.getUTCDate() === day
      );
    }, "วันที่ไม่มีอยู่จริง"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const leaveTypeConfigCreateSchema = leaveTypeFields
  .strict()
  .superRefine((value, context) => {
    if (
      value.payTreatment === LEAVE_PAY_TREATMENT.UNPAID &&
      value.paidDaysCap !== 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["paidDaysCap"],
        message: "การลาไม่รับเงินตอบแทนต้องมีวันจ่ายค่าจ้างเป็น 0",
      });
    }

    if (
      value.entitlementDays !== null &&
      value.paidDaysCap !== null &&
      value.paidDaysCap > value.entitlementDays
    ) {
      context.addIssue({
        code: "custom",
        path: ["paidDaysCap"],
        message: "วันจ่ายค่าจ้างต้องไม่เกินสิทธิวันลา",
      });
    }
  });

export const leaveTypeCustomCreateSchema = leaveTypeConfigCreateSchema.refine(
  (value) => !builtinCodes.includes(value.code),
  {
    path: ["code"],
    message: "รหัสนี้เป็นประเภทการลามาตรฐานของระบบ",
  },
);
