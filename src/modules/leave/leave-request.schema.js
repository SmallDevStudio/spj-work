import { z } from "zod";

function validISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export const leaveRequestDraftSchema = z
  .object({
    leaveTypeCode: z
      .string()
      .trim()
      .toUpperCase()
      .min(1)
      .max(50)
      .regex(/^[A-Z0-9_]+$/),

    startDate: z.string().refine(validISODate, "วันเริ่มลาไม่ถูกต้อง"),

    endDate: z.string().refine(validISODate, "วันสิ้นสุดการลาไม่ถูกต้อง"),

    dayPart: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]).default("FULL_DAY"),

    reason: z.string().trim().max(2000).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.leaveTypeCode === "OTHER" && !value.reason.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "การลาอื่น ๆ ต้องระบุรายละเอียด",
      });
    }
    if (
      validISODate(value.startDate) &&
      validISODate(value.endDate) &&
      value.endDate < value.startDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "วันสิ้นสุดต้องไม่ก่อนวันเริ่มลา",
      });
    }

    if (value.dayPart !== "FULL_DAY" && value.startDate !== value.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dayPart"],
        message: "การลาครึ่งวันต้องเลือกวันเดียวกัน",
      });
    }
  });
