import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getNotificationsForSession } from "@/services/notifications/notification.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.NOTIFICATION_READ);
    const items = await getNotificationsForSession(session);

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Notifications API");
  }
}
