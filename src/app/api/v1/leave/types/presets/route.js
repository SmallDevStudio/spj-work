import { PERMISSIONS } from "@/constants/permissions";
import { createApiErrorResponse } from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    await requirePermission(PERMISSIONS.LEAVE_BALANCE_MANAGE);

    throw new ApplicationError({
      code: "LEAVE_PRESET_INSTALL_RETIRED",
      message:
        "ประเภทลามาตรฐานใช้ร่วมกันทั้งองค์กรแล้ว " + "ไม่ต้องติดตั้งแยกบริษัท",
      status: 409,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type Preset API");
  }
}
