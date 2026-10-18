import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("/"), "รหัสอ้างอิงไม่ถูกต้อง");

const effectiveDateSchema = z
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

export const leaveTemplateAssignmentSchema = z
  .object({
    companyId: idSchema,
    templateCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,39}$/),
    effectiveFrom: effectiveDateSchema,
    employeeIds: z.array(idSchema).min(1).max(50),
  })
  .strict()
  .superRefine((value, context) => {
    if (new Set(value.employeeIds).size !== value.employeeIds.length) {
      context.addIssue({
        code: "custom",
        path: ["employeeIds"],
        message: "มีพนักงานซ้ำในรายการ",
      });
    }
  });
