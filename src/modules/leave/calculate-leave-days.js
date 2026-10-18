const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REQUEST_DAYS = 366;

function parseDate(value) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new Error("วันที่ต้องเป็นรูปแบบ YYYY-MM-DD");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("วันที่ไม่ถูกต้อง");
  }

  return date;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * workingWeekdays ใช้เลขตาม JavaScript:
 * 0 = อาทิตย์, 1 = จันทร์, ... 6 = เสาร์
 *
 * holidays ต้องเป็นวันที่ YYYY-MM-DD ที่โหลดและตรวจสอบจากฝั่ง server
 * countingBasis รองรับ CALENDAR_DAYS หรือ WORKING_DAYS เท่านั้น
 */
export function calculateLeaveDays({
  startDate,
  endDate,
  dayPart = "FULL_DAY",
  countingBasis,
  workingWeekdays = [1, 2, 3, 4, 5],
  holidays = [],
}) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (end < start) {
    throw new Error("วันสิ้นสุดต้องไม่ก่อนวันเริ่มลา");
  }

  if (!["FULL_DAY", "MORNING", "AFTERNOON"].includes(dayPart)) {
    throw new Error("ช่วงเวลาการลาไม่ถูกต้อง");
  }

  if (dayPart !== "FULL_DAY" && startDate !== endDate) {
    throw new Error("การลาครึ่งวันต้องเลือกวันเดียวกัน");
  }

  if (!["CALENDAR_DAYS", "WORKING_DAYS"].includes(countingBasis)) {
    throw new Error("ยังไม่รองรับวิธีนับวันของประเภทลานี้");
  }

  if (
    !Array.isArray(workingWeekdays) ||
    workingWeekdays.length === 0 ||
    workingWeekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  ) {
    throw new Error("การตั้งค่าวันทำงานไม่ถูกต้อง");
  }

  if (!Array.isArray(holidays)) {
    throw new Error("ข้อมูลวันหยุดไม่ถูกต้อง");
  }

  const holidaySet = new Set(
    holidays.map((value) => {
      parseDate(value);
      return value;
    }),
  );
  const workingDaySet = new Set(workingWeekdays);

  const dates = [];
  const current = new Date(start);

  while (current <= end) {
    if (dates.length >= MAX_REQUEST_DAYS) {
      throw new Error("ช่วงวันที่ลาต้องไม่เกิน 366 วัน");
    }

    const date = isoDate(current);
    const isWorkingWeekday = workingDaySet.has(current.getUTCDay());
    const isHoliday = holidaySet.has(date);

    const isCounted =
      countingBasis === "CALENDAR_DAYS" || (isWorkingWeekday && !isHoliday);

    dates.push({
      date,
      isWorkingWeekday,
      isHoliday,
      isCounted,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  const countedDates = dates.filter((item) => item.isCounted);

  if (countedDates.length === 0) {
    throw new Error("ช่วงวันที่เลือกไม่มีวันลาที่นับตามประเภทนี้");
  }

  return {
    requestedDays: dayPart === "FULL_DAY" ? countedDates.length : 0.5,
    countedDates: countedDates.map((item) => item.date),
    excludedDates: dates
      .filter((item) => !item.isCounted)
      .map((item) => item.date),
    countingBasis,
    dayPart,
  };
}
