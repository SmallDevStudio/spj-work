import { calculateLeaveDays } from "@/modules/leave/calculate-leave-days";
import { getLeaveCycleForDate } from "@/modules/leave/leave-cycle";

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 409;
  throw error;
}

export function prepareLeaveSubmission({
  draft,
  leaveTypeVersion,
  entitlementSource,
  resetMonthDay,
  workingWeekdays,
  holidayDates,
  holidayCalendarReady,
}) {
  if (
    !draft ||
    draft.status !== "DRAFT" ||
    !draft.startDate ||
    !draft.endDate
  ) {
    fail("LEAVE_DRAFT_INVALID", "ใบลาต้องเป็นฉบับร่างที่มีวันที่ครบถ้วน");
  }

  if (
    !leaveTypeVersion ||
    leaveTypeVersion.status !== "ACTIVE" ||
    leaveTypeVersion.code !== draft.leaveTypeCode ||
    leaveTypeVersion.effectiveFrom > draft.startDate
  ) {
    fail("LEAVE_TYPE_VERSION_INVALID", "ประเภทลาไม่พร้อมใช้ในวันเริ่มลา");
  }

  if (
    !entitlementSource ||
    entitlementSource.employeeId !== draft.employeeId ||
    entitlementSource.companyId !== draft.companyId ||
    entitlementSource.leaveTypeCode !== draft.leaveTypeCode
  ) {
    fail("LEAVE_ENTITLEMENT_MISMATCH", "ข้อมูลสิทธิวันลาไม่ตรงกับใบลา");
  }

  if (entitlementSource.source === "NOT_CONFIGURED") {
    fail(
      "LEAVE_ENTITLEMENT_NOT_CONFIGURED",
      "พนักงานยังไม่มีสิทธิสำหรับประเภทลานี้ กรุณาให้ HR ตรวจสอบ",
    );
  }

  if (holidayCalendarReady !== true) {
    fail(
      "LEAVE_CALENDAR_NOT_READY",
      "ยังไม่มีข้อมูลปฏิทินวันหยุดที่ตรวจสอบแล้ว",
    );
  }

  const startCycle = getLeaveCycleForDate({
    date: draft.startDate,
    resetMonthDay,
  });

  const endCycle = getLeaveCycleForDate({
    date: draft.endDate,
    resetMonthDay,
  });

  if (startCycle.periodStart !== endCycle.periodStart) {
    fail("LEAVE_REQUEST_CROSSES_CYCLE", "ใบลาข้ามรอบปี กรุณาแยกเป็นสองใบลา");
  }

  if (
    entitlementSource.periodStart !== startCycle.periodStart ||
    entitlementSource.periodEnd !== startCycle.periodEnd
  ) {
    fail("LEAVE_ENTITLEMENT_CYCLE_MISMATCH", "สิทธิวันลาไม่ตรงกับรอบปีของใบลา");
  }

  if (
    entitlementSource.source === "OPENING_BALANCE" &&
    entitlementSource.effectiveDate &&
    draft.startDate < entitlementSource.effectiveDate
  ) {
    fail(
      "LEAVE_BEFORE_IMPORT_CUTOVER",
      "วันเริ่มลาอยู่ก่อนวันที่เริ่มใช้ยอดนำเข้า",
    );
  }

  if (leaveTypeVersion.reasonRequired === true && !draft.reason?.trim()) {
    fail("LEAVE_REASON_REQUIRED", "กรุณาระบุรายละเอียดการลา");
  }

  const days = calculateLeaveDays({
    startDate: draft.startDate,
    endDate: draft.endDate,
    dayPart: draft.dayPart,
    countingBasis: leaveTypeVersion.countingBasis,
    workingWeekdays,
    holidays: holidayDates,
  });

  return {
    requestedDays: days.requestedDays,
    countedDates: days.countedDates,
    excludedDates: days.excludedDates,
    countingBasis: days.countingBasis,
    periodStart: startCycle.periodStart,
    periodEnd: startCycle.periodEnd,
    entitlementSource: entitlementSource.source,
    entitlementSourceId: entitlementSource.sourceId,
    leaveTypeVersionId: leaveTypeVersion.id,
    leaveTypeVersionPath: leaveTypeVersion.versionPath,
  };
}
