import { z } from "zod";

const dateSchema = z
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
  }, "วันที่ไม่มีอยู่จริง");

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("/"), "รหัสอ้างอิงไม่ถูกต้อง");

const halfDayNumber = z
  .number()
  .min(-365)
  .max(365)
  .refine(
    (value) => Number.isInteger(value * 2),
    "จำนวนวันต้องเพิ่มทีละครึ่งวัน",
  );

export const leaveOpeningBalanceSchema = z
  .object({
    companyId: idSchema,
    employeeId: idSchema,
    leaveTypeCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,39}$/),

    periodStart: dateSchema,
    periodEnd: dateSchema,
    cutoverDate: dateSchema,

    // ยอดที่เหลืออยู่ ณ วันเริ่มใช้ระบบ อาจติดลบได้
    openingBalanceDays: halfDayNumber,

    // ใช้เพื่อรายงานอดีตเท่านั้น ไม่ใช่รายการหักยอด
    historicalUsedDays: halfDayNumber.refine(
      (value) => value >= 0,
      "จำนวนวันที่เคยใช้ต้องไม่ติดลบ",
    ),

    note: z.string().trim().min(3).max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.periodEnd < value.periodStart) {
      context.addIssue({
        code: "custom",
        path: ["periodEnd"],
        message: "วันสิ้นสุดรอบต้องไม่ก่อนวันเริ่มรอบ",
      });
    }

    if (
      value.cutoverDate < value.periodStart ||
      value.cutoverDate > value.periodEnd
    ) {
      context.addIssue({
        code: "custom",
        path: ["cutoverDate"],
        message: "วันเริ่มใช้ระบบต้องอยู่ภายในรอบวันลา",
      });
    }
  });
