import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const MAX_OWN_REQUESTS = 500;

export async function listOwnLeaveRequests({
  organizationId,
  employeeId,
  userId,
}) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests")
    .where("userId", "==", userId)
    .limit(MAX_OWN_REQUESTS + 1)
    .get();

  if (snapshot.size > MAX_OWN_REQUESTS) {
    throw new ApplicationError({
      code: "OWN_LEAVE_HISTORY_LIMIT",
      message: "ประวัติใบลามีจำนวนมากเกินกว่าหน้านี้จะโหลดได้",
      status: 409,
    });
  }

  return snapshot.docs
    .map((document) => {
      const item = document.data();

      if (item.employeeId !== employeeId || item.isDeleted === true) {
        return null;
      }

      // รายการนี้เป็นของเจ้าของบัญชี จึงแสดงประเภทและสถานะได้
      // เหตุผลและความเห็นไม่จำเป็นต่อหน้า Calendar
      return {
        id: document.id,
        leaveTypeCode: item.leaveTypeCode ?? null,
        startDate: item.startDate,
        endDate: item.endDate,
        dayPart: item.dayPart ?? "FULL_DAY",
        requestedDays: item.requestedDays ?? null,
        status: item.status ?? "DRAFT",
      };
    })
    .filter(Boolean)
    .filter(
      (item) =>
        /^\d{4}-\d{2}-\d{2}$/.test(item.startDate ?? "") &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.endDate ?? ""),
    )
    .sort(
      (a, b) =>
        b.startDate.localeCompare(a.startDate) ||
        b.endDate.localeCompare(a.endDate),
    );
}
