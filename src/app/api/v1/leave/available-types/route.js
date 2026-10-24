import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { listLeaveTypeConfigs } from "@/repositories/leave/leave-type-config.repository";

export const dynamic = "force-dynamic";

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const value = (type) => parts.find((part) => part.type === type)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);
    const organizationId = session.access.organization.id;
    const employeeId = session.access.membership.employeeId;

    if (!employeeId) {
      throw new ApplicationError({
        code: "LEAVE_EMPLOYEE_NOT_LINKED",
        message: "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",
        status: 403,
      });
    }

    const employee = await getEmployeeById({
      organizationId,
      employeeId,
    });

    if (!employee || employee.isDeleted === true || !employee.companyId) {
      throw new ApplicationError({
        code: "LEAVE_EMPLOYEE_NOT_READY",
        message: "ข้อมูลพนักงานยังไม่พร้อมใช้งานระบบลา",
        status: 403,
      });
    }

    const today = bangkokToday();

    const types = await listLeaveTypeConfigs({
      organizationId,
      companyId: employee.companyId,
    });

    const items = types
      .filter(
        (type) =>
          type.status === "ACTIVE" &&
          type.effectiveFrom <= today &&
          typeof type.code === "string" &&
          typeof type.nameTh === "string",
      )
      .map((type) => ({
        code: type.code,
        nameTh: type.nameTh,
      }));

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Available Leave Types API");
  }
}
