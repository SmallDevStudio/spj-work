import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveRequestDraftSchema } from "@/modules/leave/leave-request.schema";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { createLeaveRequestDraft } from "@/repositories/leave/leave-request-draft.repository";
import { listLeaveTypeConfigs } from "@/repositories/leave/leave-type-config.repository";

export async function addLeaveRequestDraft({ currentSession, input }) {
  if (
    !currentSession?.access?.permissions?.includes(PERMISSIONS.LEAVE_REQUEST)
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_PERMISSION_DENIED",
      message: "ไม่มีสิทธิ์ยื่นใบลา",
      status: 403,
    });
  }

  const organizationId = currentSession.access.organization.id;

  const employeeId = currentSession.access.membership.employeeId;

  if (!employeeId) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_EMPLOYEE_REQUIRED",
      message: "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",
      status: 403,
    });
  }

  const parsed = leaveRequestDraftSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_DRAFT",
      message: "ข้อมูลร่างใบลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const employee = await getEmployeeById({
    organizationId,
    employeeId,
  });

  if (
    !employee ||
    employee.isDeleted === true ||
    employee.userId !== currentSession.identity.uid ||
    !employee.companyId
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_EMPLOYEE_INVALID",
      message: "ข้อมูลพนักงานยังไม่พร้อมสร้างใบลา",
      status: 403,
    });
  }

  const leaveTypes = await listLeaveTypeConfigs({
    organizationId,
    companyId: employee.companyId,
  });

  const leaveType = leaveTypes.find(
    (item) =>
      item.code === parsed.data.leaveTypeCode &&
      item.status === "ACTIVE" &&
      item.isDeleted !== true &&
      item.effectiveFrom <= parsed.data.startDate,
  );

  if (!leaveType) {
    throw new ApplicationError({
      code: "LEAVE_TYPE_NOT_AVAILABLE",
      message: "ประเภทการลานี้ไม่พร้อมใช้ในวันเริ่มลา",
      status: 400,
    });
  }

  return createLeaveRequestDraft({
    organizationId,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
      employeeId,
    },
    data: parsed.data,
  });
}
