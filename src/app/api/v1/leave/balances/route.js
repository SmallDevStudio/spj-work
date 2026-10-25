import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse, createSuccessResponse } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { getEmployeeLeaveBalances } from "@/repositories/leave/leave-balance.repository";

export const dynamic = "force-dynamic";

const LEAVE_TYPE_CODES = ["SICK", "PERSONAL", "ANNUAL"];

export async function GET(request) {
  try {
    const currentSession = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);
    const employeeId = currentSession.access.membership.employeeId;
    if (!employeeId) throw new ApplicationError({ code: "LEAVE_EMPLOYEE_NOT_LINKED", message: "บัญชียังไม่ได้เชื่อมข้อมูลพนักงาน", status: 403 });

    const onDate = new URL(request.url).searchParams.get("onDate");
    const parsed = typeof onDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(onDate)
      ? new Date(`${onDate}T00:00:00.000Z`) : null;
    if (!parsed || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== onDate) {
      throw new ApplicationError({ code: "INVALID_LEAVE_BALANCE_DATE", message: "วันที่ตรวจยอดไม่ถูกต้อง", status: 400 });
    }

    const items = await getEmployeeLeaveBalances({
      organizationId: currentSession.access.organization.id,
      employeeId,
      onDate,
      leaveTypeCodes: LEAVE_TYPE_CODES,
    });
    return createSuccessResponse({ items });
  } catch (error) { return createApiErrorResponse(error, "Own Leave Balances API"); }
}
