import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { previewGoogleThaiHolidays } from "@/services/leave/google-holiday-preview.service";
import { ApplicationError } from "@/lib/errors/application-error";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requirePermission(PERMISSIONS.HOLIDAY_MANAGE);

    const yearText = new URL(request.url).searchParams.get("year");

    if (!yearText || !/^\d{4}$/.test(yearText)) {
      throw new ApplicationError({
        code: "GOOGLE_HOLIDAY_YEAR_INVALID",
        message: "ปีปฏิทินไม่ถูกต้อง",
        status: 400,
      });
    }

    const preview = await previewGoogleThaiHolidays(Number(yearText));

    return createSuccessResponse({
      preview,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Google Holiday Preview API");
  }
}
