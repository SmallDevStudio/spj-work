function invalid(message) {
  const error = new Error(message);
  error.code = "LEAVE_SUBMISSION_POLICY_INVALID";
  throw error;
}

function validDays(value, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    Math.round(value * 2) !== value * 2
  ) {
    invalid(`${label} ต้องเป็นจำนวนวันที่ถูกต้อง โดยเพิ่มทีละครึ่งวัน`);
  }

  return value;
}

function approverIds(value, requesterEmployeeId, label) {
  if (!Array.isArray(value)) {
    invalid(`ยังไม่ได้กำหนดผู้อนุมัติฝ่าย${label}`);
  }

  const ids = [
    ...new Set(
      value
        .filter((id) => typeof id === "string")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].filter((id) => id !== requesterEmployeeId);

  if (ids.length === 0) {
    invalid(`ยังไม่ได้กำหนดผู้อนุมัติฝ่าย${label}`);
  }

  return ids;
}

/**
 * เรียกเฉพาะตอนส่งใบลา หลังจาก server คำนวณวันลาและอ่านยอดล่าสุดแล้ว
 *
 * remainingAfterPendingDays คือยอดหลังกันใบที่รออนุมัติไว้ด้วย
 * หากไม่มีสิทธิ์ที่ตั้งค่าไว้ ให้ส่ง null และจัดการเป็น error ก่อนเรียกฟังก์ชันนี้
 */
export function createLeaveSubmissionPolicy({
  requesterEmployeeId,
  requestedDays,
  remainingAfterPendingDays,
  managerApproverEmployeeIds,
  hrApproverEmployeeIds = [],
}) {
  if (!requesterEmployeeId) {
    invalid("ไม่พบพนักงานผู้ยื่นใบลา");
  }

  const requested = validDays(requestedDays, "จำนวนวันที่ขอ");
  const remaining = validDays(
    remainingAfterPendingDays,
    "ยอดคงเหลือหลังหักใบที่รออนุมัติ",
  );

  if (requested === 0) {
    invalid("ใบลาต้องมีวันที่นับอย่างน้อยครึ่งวัน");
  }

  const managerIds = approverIds(
    managerApproverEmployeeIds,
    requesterEmployeeId,
    "หัวหน้า",
  );

  const coveredDays = Math.min(requested, remaining);
  const excessDays = requested - coveredDays;
  const isOverEntitlement = excessDays > 0;

  const approvals = [
    {
      key: "MANAGER",
      label: "หัวหน้า",
      mode: "ANY_ONE",
      approverEmployeeIds: managerIds,
      status: "PENDING",
      decidedByEmployeeId: null,
      decidedAt: null,
      comment: null,
    },
  ];

  if (isOverEntitlement) {
    approvals.push({
      key: "HR",
      label: "HR",
      mode: "ANY_ONE",
      approverEmployeeIds: approverIds(
        hrApproverEmployeeIds,
        requesterEmployeeId,
        "HR",
      ),
      status: "PENDING",
      decidedByEmployeeId: null,
      decidedAt: null,
      comment: null,
      financialDisposition: null,
      financialReason: null,
    });
  }

  return {
    requestedDays: requested,
    availableAtSubmissionDays: remaining,
    coveredDays,
    excessDays,
    isOverEntitlement,
    approvalMode: "ALL_TRACKS",
    approvals,
    status: "PENDING_APPROVAL",
    financialStatus: isOverEntitlement ? "HR_REVIEW_REQUIRED" : "NOT_REQUIRED",
  };
}
