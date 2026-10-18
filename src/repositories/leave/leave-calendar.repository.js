import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message) {
  throw new ApplicationError({
    code,
    message,
    status: 409,
  });
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function yearsInRange(startDate, endDate) {
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
    fail("LEAVE_CALENDAR_DATE_INVALID", "ช่วงวันที่ลาไม่ถูกต้อง");
  }

  const first = Number(startDate.slice(0, 4));
  const last = Number(endDate.slice(0, 4));

  if (last - first > 1) {
    fail(
      "LEAVE_CALENDAR_RANGE_TOO_LONG",
      "ช่วงวันที่ลาครอบคลุมหลายปีเกินกว่าที่รองรับ",
    );
  }

  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export async function getPublishedLeaveCalendar({
  organizationId,
  startDate,
  endDate,
}) {
  const years = yearsInRange(startDate, endDate);

  const collectionRef = adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveCalendarYears");

  const snapshots = await Promise.all(
    years.map((year) => collectionRef.doc(String(year)).get()),
  );

  const calendarYears = snapshots.map((snapshot, index) => {
    const year = years[index];
    const data = snapshot.exists ? snapshot.data() : null;

    if (
      !data ||
      data.status !== "PUBLISHED" ||
      !data.publishedAt ||
      !data.publishedBy
    ) {
      fail(
        "LEAVE_CALENDAR_NOT_PUBLISHED",
        `ปฏิทินวันหยุดปี ${year} ยังไม่เผยแพร่`,
      );
    }

    if (
      !Array.isArray(data.holidayDates) ||
      data.holidayDates.length === 0 ||
      data.holidayDates.some(
        (date) => !validDate(date) || Number(date.slice(0, 4)) !== year,
      ) ||
      new Set(data.holidayDates).size !== data.holidayDates.length
    ) {
      fail(
        "LEAVE_CALENDAR_HOLIDAYS_INVALID",
        `ข้อมูลวันหยุดปี ${year} ไม่ถูกต้อง`,
      );
    }

    return {
      year,
      revision: data.revision,
      holidayDates: data.holidayDates,
    };
  });

  return {
    holidayCalendarReady: true,
    holidayDates: calendarYears
      .flatMap((item) => item.holidayDates)
      .filter((date) => date >= startDate && date <= endDate)
      .sort(),
    calendarYears: calendarYears.map(({ year, revision }) => ({
      year,
      revision,
    })),
  };
}
