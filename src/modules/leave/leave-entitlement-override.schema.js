import { z } from "zod";

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .refine((value) => !value.includes("/"), "รหัสอ้างอิงไม่ถูกต้อง");

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

export const leaveEntitlementOverrideSchema = z
  .object({
    companyId: idSchema,
    employeeId: idSchema,
    leaveTypeCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,39}$/),

    effectiveFrom: dateSchema,

    // รองรับสิทธิ์ครึ่งวัน
    entitlementDays: z
      .number()
      .min(0)
      .max(365)
      .refine(
        (value) => Number.isInteger(value * 2),
        "จำนวนวันต้องเพิ่มทีละครึ่งวัน",
      ),

    reason: z.string().trim().min(3, "กรุณาระบุเหตุผล").max(1000),
  })
  .strict();
