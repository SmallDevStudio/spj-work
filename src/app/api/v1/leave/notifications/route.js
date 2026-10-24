import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  listOwnLeaveNotifications,
  markOwnLeaveNotificationRead,
} from "@/repositories/leave/leave-notification.repository";

export const dynamic = "force-dynamic";

function scope(session) {
  return {
    organizationId: session.access.organization.id,
    uid: session.identity.uid,
    employeeId: session.access.membership.employeeId,
  };
}

export async function GET() {
  try {
    const session = await requireCurrentSession();
    const items = await listOwnLeaveNotifications(scope(session));

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Notifications API");
  }
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requireCurrentSession();
    const input = await readJsonRequest(request);

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      typeof input.eventId !== "string"
    ) {
      throw new ApplicationError({
        code: "NOTIFICATION_INPUT_INVALID",
        message: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง",
        status: 400,
      });
    }

    await markOwnLeaveNotificationRead({
      ...scope(session),
      eventId: input.eventId,
    });

    return createSuccessResponse({ eventId: input.eventId, isRead: true });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Notifications API");
  }
}
