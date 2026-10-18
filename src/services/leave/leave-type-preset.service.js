import "server-only";

import { z } from "zod";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { installLeaveTypePresets } from "@/repositories/leave/leave-type-preset.repository";

const installSchema = z
  .object({
    companyId: z
      .string()
      .trim()
      .min(1, "กรุณาเลือกบริษัท")
      .max(128)
      .refine((value) => !value.includes("/"), "บริษัทไม่ถูกต้อง"),

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
  })
  .strict();

export async function installCompanyLeavePresets({ currentSession, input }) {
  const parsed = installSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลการติดตั้งประเภทการลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (
    !canAccessCompany(
      currentSession.access.membership.companyAccess,
      parsed.data.companyId,
    )
  ) {
    throw new ApplicationError({
      code: "LEAVE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์จัดการประเภทการลาของบริษัทนี้",
      status: 403,
    });
  }

  return installLeaveTypePresets({
    organizationId: currentSession.access.organization.id,
    companyId: parsed.data.companyId,
    effectiveFrom: parsed.data.effectiveFrom,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
