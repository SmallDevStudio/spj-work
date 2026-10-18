import "server-only";

import { z } from "zod";

import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { assignEmployeeCompany } from "@/repositories/employee/employee-company.repository";

const assignmentSchema = z.object({
  companyId: z
    .string()
    .trim()
    .min(1, "กรุณาเลือกบริษัท")
    .max(128)
    .refine((value) => !value.includes("/"), "บริษัทไม่ถูกต้อง"),
});

function validEmployeeId(employeeId) {
  if (
    typeof employeeId !== "string" ||
    !employeeId.trim() ||
    employeeId.length > 128 ||
    employeeId.includes("/")
  ) {
    throw new ApplicationError({
      code: "INVALID_EMPLOYEE_ID",
      message: "รหัสอ้างอิงพนักงานไม่ถูกต้อง",
      status: 400,
    });
  }

  return employeeId.trim();
}

export async function assignEmployeeToCompany({
  currentSession,
  employeeId,
  input,
}) {
  if (currentSession.access.membership.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "EMPLOYEE_COMPANY_ASSIGN_DENIED",
      message: "เฉพาะ SUPERADMIN ที่จัดบริษัทให้ข้อมูลเดิมได้",
      status: 403,
    });
  }

  const parsed = assignmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง",
      status: 400,
    });
  }

  return assignEmployeeCompany({
    organizationId: currentSession.access.organization.id,
    employeeId: validEmployeeId(employeeId),
    companyId: parsed.data.companyId,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
