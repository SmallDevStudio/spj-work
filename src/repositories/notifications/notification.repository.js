import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import {
  isSupportedNotificationEvent,
  presentNotificationEvent,
} from "@/modules/notifications/notification-presentation";

function organizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function isRecipient(event, employeeId, uid) {
  return (
    event.recipientUid === uid ||
    (employeeId && event.requesterEmployeeId === employeeId) ||
    (employeeId && event.newApproverEmployeeId === employeeId) ||
    (employeeId && Array.isArray(event.approverEmployeeIds) &&
      event.approverEmployeeIds.includes(employeeId))
  );
}

function toMillis(value) {
  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  return 0;
}

function readRef({ organizationId, uid, eventId }) {
  return organizationRef(organizationId)
    .collection("notificationReads")
    .doc(uid)
    .collection("items")
    .doc(eventId);
}

async function getRecipientEvents({ organizationId, employeeId, uid }) {
  const collection =
    organizationRef(organizationId).collection("notificationOutbox");

  // Equality / array-contains อย่างละหนึ่งเงื่อนไข ไม่ผูกกับ composite index
  // ที่ยังไม่ได้ deploy; รวมและเรียงผลในฝั่ง server
  const queries = [collection.where("recipientUid", "==", uid).get()];

  if (employeeId) {
    queries.push(
      collection.where("requesterEmployeeId", "==", employeeId).get(),
      collection.where("newApproverEmployeeId", "==", employeeId).get(),
      collection.where("approverEmployeeIds", "array-contains", employeeId).get(),
    );
  }

  const snapshots = await Promise.all(queries);

  const unique = new Map();

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      unique.set(doc.id, doc);
    }
  }

  return [...unique.values()]
    .filter((doc) => {
      const event = doc.data();
      return isSupportedNotificationEvent(event.type) && isRecipient(event, employeeId, uid);
    })
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))
    .slice(0, 100);
}

export async function listOwnNotifications({
  organizationId,
  uid,
  employeeId,
}) {
  const events = await getRecipientEvents({ organizationId, employeeId, uid });

  if (events.length === 0) {
    return [];
  }

  const reads = await adminFirestore.getAll(
    ...events.map((event) =>
      readRef({ organizationId, uid, eventId: event.id }),
    ),
  );

  return events.map((snapshot, index) => {
    const event = snapshot.data();
    const presentation = presentNotificationEvent(event, employeeId);
    const rawRequestId = event.leaveRequestId ?? event.requestId;
    const requestId =
      typeof rawRequestId === "string" &&
      /^[a-zA-Z0-9_-]{1,128}$/.test(rawRequestId)
        ? rawRequestId
        : null;

    return {
      id: snapshot.id,
      source: "LEAVE",
      testRunId: event.type === "LEAVE_DEV_TEST_EVENT" ? event.testRunId ?? null : null,
      resource: requestId ? { type: "LEAVE_REQUEST", id: requestId } : null,
      requestId,
      title: presentation.title,
      description: presentation.description,
      destination: presentation.destination,
      createdAt: event.createdAt?.toDate?.()?.toISOString() ?? null,
      isRead: reads[index].exists,
    };
  });
}

export async function markOwnNotificationRead({
  organizationId,
  uid,
  employeeId,
  eventId,
}) {
  if (
    typeof eventId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(eventId)
  ) {
    throw new ApplicationError({
      code: "NOTIFICATION_NOT_FOUND",
      message: "ไม่พบการแจ้งเตือน",
      status: 404,
    });
  }

  const eventSnapshot = await organizationRef(organizationId)
    .collection("notificationOutbox")
    .doc(eventId)
    .get();

  if (
    !eventSnapshot.exists ||
    !isSupportedNotificationEvent(eventSnapshot.data().type) ||
    !isRecipient(eventSnapshot.data(), employeeId, uid)
  ) {
    throw new ApplicationError({
      code: "NOTIFICATION_NOT_FOUND",
      message: "ไม่พบการแจ้งเตือน",
      status: 404,
    });
  }

  await readRef({ organizationId, uid, eventId }).set(
    { readAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}
