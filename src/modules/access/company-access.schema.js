import { z } from "zod";

const companyIdSchema = z
  .string()
  .trim()
  .min(1, "กรุณาเลือกบริษัท")
  .max(128, "รหัสอ้างอิงบริษัทยาวเกินไป")
  .refine((value) => !value.includes("/"), "รหัสอ้างอิงบริษัทไม่ถูกต้อง");

export const companyAccessUpdateSchema = z
  .object({
    scope: z.enum(["ALL", "SELECTED"]),
    companyIds: z.array(companyIdSchema).max(100).default([]),
  })
  .superRefine((value, context) => {
    if (value.scope === "SELECTED" && value.companyIds.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["companyIds"],
        message: "กรุณาเลือกอย่างน้อยหนึ่งบริษัท",
      });
    }

    if (new Set(value.companyIds).size !== value.companyIds.length) {
      context.addIssue({
        code: "custom",
        path: ["companyIds"],
        message: "มีบริษัทซ้ำกัน",
      });
    }

    if (value.scope === "ALL" && value.companyIds.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["companyIds"],
        message: "เมื่อเลือกทุกบริษัท ไม่ต้องระบุรายการบริษัท",
      });
    }
  });
