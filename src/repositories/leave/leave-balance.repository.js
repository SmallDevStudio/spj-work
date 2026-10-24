import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { calculateLeaveUsage } from "@/modules/leave/leave-usage";
import { getLeaveEntitlementSource } from "@/repositories/leave/leave-entitlement-source.repository";

const MAX_REQUESTS = 1000;

function fail(code, message) {
  throw new ApplicationError({ code, message, status: 409 });
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

  let usage;

  try {
    usage = calculateLeaveUsage({
      requests: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      employeeId,
      companyId: source.companyId,
      leaveTypeCode,
      periodStart: source.periodStart,
      periodEnd: source.periodEnd,
      openingCutoverDate:
        source.source === "OPENING_BALANCE" ? source.effectiveDate : null,
    });
  } catch (error) {
    fail(error.code ?? "LEAVE_BALANCE_REQUEST_INVALID", error.message);
  }

  const { approvedDays, pendingDays } = usage;

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
