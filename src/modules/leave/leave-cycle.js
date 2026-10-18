const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_DAY_PATTERN = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parseIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    throw new Error("date must be YYYY-MM-DD");
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("date is not a valid calendar date");
  }

  return date;
}

function parseResetMonthDay(value) {
  if (typeof value !== "string" || !MONTH_DAY_PATTERN.test(value)) {
    throw new Error("resetMonthDay must be MM-DD");
  }

  // วันเริ่มรอบต้องเกิดขึ้นทุกปี
  if (value === "02-29") {
    throw new Error("resetMonthDay cannot be 02-29");
  }

  parseIsoDate(`2001-${value}`);
  return value;
}

function cycleStart(year, resetMonthDay) {
  return `${String(year).padStart(4, "0")}-${resetMonthDay}`;
}

function precedingDate(dateString) {
  const date = parseIsoDate(dateString);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

// date คือวันที่ตามเขตเวลาขององค์กร เช่น Asia/Bangkok
// ผู้เรียกต้องแปลงก่อน ไม่ใช้วันที่ของ server บน Vercel โดยตรง
export function getLeaveCycleForDate({ date, resetMonthDay = "01-01" }) {
  parseIsoDate(date);
  parseResetMonthDay(resetMonthDay);

  const currentYear = Number(date.slice(0, 4));
  const thisYearStart = cycleStart(currentYear, resetMonthDay);
  const startYear = date >= thisYearStart ? currentYear : currentYear - 1;
  const periodStart = cycleStart(startYear, resetMonthDay);
  const nextPeriodStart = cycleStart(startYear + 1, resetMonthDay);

  return {
    periodStart,
    periodEnd: precedingDate(nextPeriodStart),
    nextPeriodStart,
    cycleYear: startYear,
  };
}

export function getNextLeaveCycle({ periodStart, resetMonthDay = "01-01" }) {
  const current = getLeaveCycleForDate({
    date: periodStart,
    resetMonthDay,
  });

  if (current.periodStart !== periodStart) {
    throw new Error("periodStart does not match resetMonthDay");
  }

  return getLeaveCycleForDate({
    date: current.nextPeriodStart,
    resetMonthDay,
  });
}
