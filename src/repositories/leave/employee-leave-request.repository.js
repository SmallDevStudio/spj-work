import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function getOwnLeaveRequest({
  organizationId,
  requestId,
  employeeId,
  userId,
}) {
  if (
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 128 ||
    requestId.includes("/")
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_ID_INVALID",
      message: "รหัสใบลาไม่ถูกต้อง",
      status: 400,
    });
  }

  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests")
    .doc(requestId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const item = snapshot.data();

  if (
    item.isDeleted === true ||
    item.employeeId !== employeeId ||
    item.userId !== userId ||
    item.organizationId !== organizationId
  ) {
    // ไม่บอกว่ามีใบลาของคนอื่นอยู่หรือไม่
    return null;
  }

  return {
    id: snapshot.id,
    leaveTypeCode: item.leaveTypeCode ?? null,
    startDate: item.startDate,
    endDate: item.endDate,
    dayPart: item.dayPart ?? "FULL_DAY",
    requestedDays: item.requestedDays ?? null,
    reason: item.reason ?? "",
    status: item.status,
    revision: item.revision ?? 1,
  };
}
