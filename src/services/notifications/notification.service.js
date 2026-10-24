import "server-only";

import {
  listOwnNotifications,
  markOwnNotificationRead,
} from "@/repositories/notifications/notification.repository";

function notificationScope(session) {
  return {
    organizationId: session.access.organization.id,
    uid: session.identity.uid,
    employeeId: session.access.membership.employeeId,
  };
}

export function getNotificationsForSession(session) {
  return listOwnNotifications(notificationScope(session));
}

export function markNotificationReadForSession(session, notificationId) {
  return markOwnNotificationRead({
    ...notificationScope(session),
    eventId: notificationId,
  });
}
