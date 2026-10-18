import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() + 1 === month &&
      date.getUTCDate() === day
    );
  }, "วันที่ไม่มีอยู่จริง");

const leaveTypeCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "รหัสประเภทการลาไม่ถูกต้อง");

const templateEntrySchema = z
  .object({
    leaveTypeCode: leaveTypeCodeSchema,

    // INHERIT = ใช้สิทธิเริ่มต้นจากประเภทการลาของบริษัท
    // OVERRIDE = template นี้กำหนดจำนวนวันเอง
    entitlementMode: z.enum(["INHERIT", "OVERRIDE"]),
    entitlementDays: z.number().int().min(0).max(365).nullable(),

    allowExcess: z.boolean(),
    maxExcessDays: z.number().int().min(0).max(365).nullable(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.entitlementMode === "INHERIT" && entry.entitlementDays !== null) {
      context.addIssue({
        code: "custom",
        path: ["entitlementDays"],
        message: "เมื่อใช้สิทธิเริ่มต้น ไม่ต้องกำหนดจำนวนวันใน template",
      });
      if (entry.allowExcess && entry.maxExcessDays === null) {
        context.addIssue({
          code: "custom",
          path: ["maxExcessDays"],
          message: "กรุณาระบุจำนวนวันสูงสุดที่ยื่นเกินสิทธิได้",
        });
      }
    }

    if (
      entry.entitlementMode === "OVERRIDE" &&
      entry.entitlementDays === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["entitlementDays"],
        message: "กรุณาระบุจำนวนวันสำหรับ template นี้",
      });
    }

    if (!entry.allowExcess && entry.maxExcessDays !== null) {
      context.addIssue({
        code: "custom",
        path: ["maxExcessDays"],
        message: "กำหนดวันลาเกินสิทธิได้เมื่อเปิดอนุญาตลาเกินสิทธิ",
      });
    }
  });

export const leaveTemplateCreateSchema = z
  .object({
    companyId: z
      .string()
      .trim()
      .min(1, "กรุณาเลือกบริษัท")
      .max(128)
      .refine((value) => !value.includes("/"), "บริษัทไม่ถูกต้อง"),

    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9_]{1,39}$/, "รหัส template ไม่ถูกต้อง"),

    nameTh: z.string().trim().min(1).max(150),
    description: z.string().trim().max(500).nullable(),
    effectiveFrom: isoDateSchema,
    status: z.enum(["ACTIVE", "INACTIVE"]),

    entries: z.array(templateEntrySchema).min(1).max(100),
  })
  .strict()
  .superRefine((template, context) => {
    const codes = template.entries.map((entry) => entry.leaveTypeCode);

    if (new Set(codes).size !== codes.length) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "มีประเภทการลาซ้ำใน template",
      });
    }
  });
