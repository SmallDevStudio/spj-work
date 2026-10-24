import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { getEmployeeLeaveBalance } from "@/repositories/leave/leave-balance.repository";

export const dynamic = "force-dynamic";

function parseQuery(request) {
  const { searchParams } = new URL(request.url);

  const leaveTypeCode = searchParams.get("leaveTypeCode")?.trim().toUpperCase();

  const onDate = searchParams.get("onDate")?.trim();

  if (!leaveTypeCode || !/^[A-Z][A-Z0-9_]{1,39}$/.test(leaveTypeCode)) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_TYPE_CODE",
      message: "รหัสประเภทการลาไม่ถูกต้อง",
      status: 400,
    });
  }

  if (!onDate || !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_BALANCE_DATE",
      message: "กรุณาระบุวันที่รูปแบบ YYYY-MM-DD",
      status: 400,
    });
  }

  const parsedDate = new Date(`${onDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== onDate
  ) {
    throw new ApplicationError({
      code: "INVALID_LEAVE_BALANCE_DATE",
      message: "วันที่ตรวจยอดไม่มีอยู่จริง",
      status: 400,
    });
  }

  return { leaveTypeCode, onDate };
}

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);

    const employeeId = currentSession.access.membership.employeeId;

    if (!employeeId) {
      throw new ApplicationError({
        code: "LEAVE_EMPLOYEE_NOT_LINKED",
        message: "บัญชีนี้ยังไม่ได้เชื่อมข้อมูลพนักงาน",
        status: 403,
      });
    }

    const { leaveTypeCode, onDate } = parseQuery(request);

    const balance = await getEmployeeLeaveBalance({
      organizationId: currentSession.access.organization.id,
      employeeId,
      leaveTypeCode,
      onDate,
      resetMonthDay: "01-01",
    });

    return createSuccessResponse({ item: balance });
  } catch (error) {
    return createApiErrorResponse(error, "Own Leave Balance API");
  }
}
