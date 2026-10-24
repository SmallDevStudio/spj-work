import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const SUPPORTED_TYPES = new Set([
  "LEAVE_REQUEST_SUBMITTED",
  "LEAVE_DECISION_RECORDED",
  "LEAVE_HR_APPROVER_REASSIGNED",
]);

function organizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function isRecipient(event, employeeId) {
  return (
    event.requesterEmployeeId === employeeId ||
    event.newApproverEmployeeId === employeeId ||
    (Array.isArray(event.approverEmployeeIds) &&
      event.approverEmployeeIds.includes(employeeId))
  );
}

function notificationText(event, employeeId) {
  if (event.type === "LEAVE_REQUEST_SUBMITTED") {
    return {
      title: "มีใบลารอพิจารณา",
      description: "มีใบลาใหม่ในรายการอนุมัติของคุณ",
      destination: "approvals",
    };
  }

  if (event.type === "LEAVE_HR_APPROVER_REASSIGNED") {
    return {
      title: "มีใบลาที่มอบหมายให้คุณ",
      description: "มีใบลารอการพิจารณาจาก HR",
      destination: "approvals",
    };
  }

  if (event.type === "LEAVE_DECISION_RECORDED") {
    if (event.requesterEmployeeId === employeeId) {
      return {
        title:
          event.resultStatus === "REJECTED"
            ? "ใบลาของคุณไม่ได้รับอนุมัติ"
            : event.resultStatus === "APPROVED"
              ? "ใบลาของคุณได้รับอนุมัติ"
              : "ใบลาของคุณมีความคืบหน้า",
        description: "เปิดใบลาเพื่อตรวจสอบสถานะล่าสุด",
        destination: "request",
      };
    }

    return {
      title: "รายการอนุมัติมีความคืบหน้า",
      description: "เปิดรายการอนุมัติเพื่อตรวจสอบสถานะล่าสุด",
      destination: "approvals",
    };
  }

  return null;
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

async function getRecipientEvents({ organizationId, employeeId }) {
  const collection =
    organizationRef(organizationId).collection("notificationOutbox");

  // Equality / array-contains อย่างละหนึ่งเงื่อนไข ไม่ผูกกับ composite index
  // ที่ยังไม่ได้ deploy; รวมและเรียงผลในฝั่ง server
  const snapshots = await Promise.all([
    collection.where("requesterEmployeeId", "==", employeeId).get(),
    collection.where("newApproverEmployeeId", "==", employeeId).get(),
    collection.where("approverEmployeeIds", "array-contains", employeeId).get(),
  ]);

  const unique = new Map();

  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      unique.set(doc.id, doc);
    }
  }

  return [...unique.values()]
    .filter((doc) => {
      const event = doc.data();
      return SUPPORTED_TYPES.has(event.type) && isRecipient(event, employeeId);
    })
    .sort((a, b) => toMillis(b.data().createdAt) - toMillis(a.data().createdAt))
    .slice(0, 100);
}

export async function listOwnLeaveNotifications({
  organizationId,
  uid,
  employeeId,
}) {
  if (!employeeId) {
    return [];
  }

  const events = await getRecipientEvents({ organizationId, employeeId });

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
    const presentation = notificationText(event, employeeId);

    return {
      id: snapshot.id,
      requestId:
        typeof event.requestId === "string" &&
        /^[a-zA-Z0-9_-]{1,128}$/.test(event.requestId)
          ? event.requestId
          : null,
      title: presentation.title,
      description: presentation.description,
      destination: presentation.destination,
      createdAt: event.createdAt?.toDate?.()?.toISOString() ?? null,
      isRead: reads[index].exists,
    };
  });
}

export async function markOwnLeaveNotificationRead({
  organizationId,
  uid,
  employeeId,
  eventId,
}) {
  if (
    !employeeId ||
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
    !SUPPORTED_TYPES.has(eventSnapshot.data().type) ||
    !isRecipient(eventSnapshot.data(), employeeId)
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
