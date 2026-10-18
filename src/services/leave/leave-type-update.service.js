import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveTypeConfigCreateSchema } from "@/modules/leave/leave-type-config.schema";
import { updateLeaveTypeConfig } from "@/repositories/leave/leave-type-update.repository";

export async function editLeaveTypeConfig({ currentSession, code, input }) {
  if (typeof code !== "string" || !/^[A-Z][A-Z0-9_]{1,39}$/.test(code)) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_TYPE_CODE",
      message: "รหัสประเภทการลาไม่ถูกต้อง",
      status: 400,
    });
  }

  const parsed = leaveTypeConfigCreateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลประเภทการลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (parsed.data.code !== code) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_CODE_IMMUTABLE",
      message: "ไม่สามารถเปลี่ยนรหัสประเภทการลาได้",
      status: 400,
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
      message: "ไม่มีสิทธิ์แก้นโยบายการลาของบริษัทนี้",
      status: 403,
    });
  }

  if (
    code === "MATERNITY" &&
    (parsed.data.entitlementDays === null ||
      parsed.data.entitlementDays < 120 ||
      parsed.data.paidDaysCap === null ||
      parsed.data.paidDaysCap < 60)
  ) {
    throw new ApplicationError({
      code: "MATERNITY_LEGAL_MINIMUM",
      message:
        "ลาคลอดต้องมีสิทธิอย่างน้อย 120 วัน และเพดานวันที่นายจ้างจ่ายค่าจ้างอย่างน้อย 60 วัน",
      status: 400,
    });
  }

  return updateLeaveTypeConfig({
    organizationId: currentSession.access.organization.id,
    companyId: parsed.data.companyId,
    code,
    data: parsed.data,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
