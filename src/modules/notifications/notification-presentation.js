const SUPPORTED_TYPES = new Set([
  "LEAVE_REQUEST_SUBMITTED",
  "LEAVE_DECISION_RECORDED",
  "LEAVE_HR_APPROVER_REASSIGNED",
]);

export function isSupportedNotificationEvent(type) {
  return SUPPORTED_TYPES.has(type);
}

export function presentNotificationEvent(event, employeeId) {
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
