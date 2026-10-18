import { z } from "zod";

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const companyIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "รหัสอ้างอิงบริษัทไม่ถูกต้อง");

export const companyWorkScheduleCreateSchema = z
  .object({
    companyId: companyIdSchema,
    effectiveFrom: z.string().refine(validDate, "วันที่เริ่มใช้ไม่ถูกต้อง"),
    workingWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  })
  .strict()
  .superRefine((data, context) => {
    if (new Set(data.workingWeekdays).size !== data.workingWeekdays.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workingWeekdays"],
        message: "เลือกวันทำงานซ้ำกัน",
      });
    }
  });

export const companyWorkScheduleQuerySchema = z
  .object({
    companyId: companyIdSchema,
  })
  .strict();
