import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { getLeaveEntitlementSource } from "@/repositories/leave/leave-entitlement-source.repository";

const MAX_REQUESTS = 1000;

function fail(code, message) {
  throw new ApplicationError({ code, message, status: 409 });
}

function sumDays(requests) {
  return (
    Math.round(
      requests.reduce((total, request) => total + request.requestedDays, 0) * 2,
    ) / 2
  );
}

export async function getEmployeeLeaveBalance({
  organizationId,
  employeeId,
  leaveTypeCode,
  onDate,
  resetMonthDay = "01-01",
}) {
  const source = await getLeaveEntitlementSource({
    organizationId,
    employeeId,
    leaveTypeCode,
    onDate,
    resetMonthDay,
  });

  if (source.source === "NOT_CONFIGURED") {
    return {
      ...source,
      availableDays: null,
      approvedDays: 0,
      pendingDays: 0,
      remainingDays: null,
      remainingAfterPendingDays: null,
    };
  }

  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests")
    .where("employeeId", "==", employeeId)
    .limit(MAX_REQUESTS + 1)
    .get();

  if (snapshot.size > MAX_REQUESTS) {
    fail(
      "LEAVE_BALANCE_HISTORY_LIMIT",
      "ประวัติใบลามากเกินขนาดที่ตรวจยอดได้ กรุณาติดต่อ HR",
    );
  }

  const relevantRequests = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(
      (request) =>
        request.isDeleted !== true &&
        request.companyId === source.companyId &&
        request.leaveTypeCode === leaveTypeCode &&
        request.startDate >= source.periodStart &&
        request.endDate <= source.periodEnd &&
        ["APPROVED", "PENDING_APPROVAL"].includes(request.status) &&
        (source.source !== "OPENING_BALANCE" ||
          request.startDate >= source.effectiveDate),
    );

  for (const request of relevantRequests) {
    if (
      typeof request.requestedDays !== "number" ||
      !Number.isFinite(request.requestedDays) ||
      request.requestedDays <= 0
    ) {
      fail(
        "LEAVE_BALANCE_REQUEST_INVALID",
        `ใบลา ${request.id} ไม่มีจำนวนวันที่ถูกต้อง กรุณาให้ HR ตรวจสอบ`,
      );
    }
  }

  const approvedDays = sumDays(
    relevantRequests.filter((request) => request.status === "APPROVED"),
  );
  const pendingDays = sumDays(
    relevantRequests.filter((request) => request.status === "PENDING_APPROVAL"),
  );

  // ยอดนำเข้าเป็นยอดคงเหลือ ณ cutover ไม่ใช่สิทธิเต็มปี
  const availableDays =
    source.source === "OPENING_BALANCE"
      ? source.openingBalanceDays
      : source.entitlementDays;

  if (availableDays !== null && !Number.isFinite(availableDays)) {
    fail(
      "LEAVE_BALANCE_SOURCE_INVALID",
      "ยอดสิทธิวันลาไม่ถูกต้อง กรุณาให้ HR ตรวจสอบ",
    );
  }

  return {
    ...source,
    availableDays,
    approvedDays,
    pendingDays,
    remainingDays: availableDays === null ? null : availableDays - approvedDays,
    remainingAfterPendingDays:
      availableDays === null
        ? null
        : availableDays - approvedDays - pendingDays,
  };
}
