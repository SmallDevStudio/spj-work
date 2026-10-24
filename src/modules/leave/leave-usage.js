const COUNTED_STATUSES = new Set(["APPROVED", "PENDING_APPROVAL"]);

export function calculateLeaveUsage({
  requests,
  employeeId,
  companyId,
  leaveTypeCode,
  periodStart,
  periodEnd,
  openingCutoverDate = null,
  excludeRequestId = null,
}) {
  let approvedDays = 0;
  let pendingDays = 0;

  for (const request of requests) {
    if (
      request.id === excludeRequestId ||
      request.isDeleted === true ||
      request.employeeId !== employeeId ||
      request.companyId !== companyId ||
      request.leaveTypeCode !== leaveTypeCode ||
      request.startDate < periodStart ||
      request.endDate > periodEnd ||
      (openingCutoverDate && request.startDate < openingCutoverDate) ||
      !COUNTED_STATUSES.has(request.status)
    ) {
      continue;
    }

    if (
      typeof request.requestedDays !== "number" ||
      !Number.isFinite(request.requestedDays) ||
      request.requestedDays <= 0 ||
      !Number.isInteger(request.requestedDays * 2)
    ) {
      const error = new Error(
        `ใบลา ${request.id} ไม่มีจำนวนวันที่ถูกต้อง กรุณาให้ HR ตรวจสอบ`,
      );
      error.code = "LEAVE_BALANCE_REQUEST_INVALID";
      throw error;
    }

    if (request.status === "APPROVED") {
      approvedDays += request.requestedDays;
    } else {
      pendingDays += request.requestedDays;
    }
  }

  return { approvedDays, pendingDays };
}

export function findOverlappingLeaveRequest({ requests, draft, excludeRequestId }) {
  return (
    requests.find((request) => {
      if (
        request.id === excludeRequestId ||
        request.isDeleted === true ||
        !COUNTED_STATUSES.has(request.status) ||
        request.employeeId !== draft.employeeId ||
        request.startDate > draft.endDate ||
        request.endDate < draft.startDate
      ) {
        return false;
      }

      const sameSingleDay =
        draft.startDate === draft.endDate &&
        request.startDate === request.endDate &&
        draft.startDate === request.startDate;

      return !(
        sameSingleDay &&
        ((draft.dayPart === "MORNING" && request.dayPart === "AFTERNOON") ||
          (draft.dayPart === "AFTERNOON" && request.dayPart === "MORNING"))
      );
    }) ?? null
  );
}
