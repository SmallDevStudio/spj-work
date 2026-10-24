import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import { markNotificationReadForSession } from "@/services/notifications/notification.service";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    validateStateChangingRequest(request);

    const { notificationId } = await params;
    const input = await readJsonRequest(request);

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).length !== 1 ||
      input.read !== true
    ) {
      throw new ApplicationError({
        code: "NOTIFICATION_INPUT_INVALID",
        message: "ส่ง read: true เพื่อทำเครื่องหมายว่าอ่านแล้ว",
        status: 400,
      });
    }

    const session = await requirePermission(PERMISSIONS.NOTIFICATION_READ);

    await markNotificationReadForSession(session, notificationId);

    return createSuccessResponse({ id: notificationId, read: true });
  } catch (error) {
    return createApiErrorResponse(error, "Notification Update API");
  }
}
