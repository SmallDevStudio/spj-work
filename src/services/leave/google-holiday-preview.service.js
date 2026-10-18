import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";

function fail(code, message, status = 502) {
  throw new ApplicationError({ code, message, status });
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

function nextDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function previewGoogleThaiHolidays(year) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    fail("GOOGLE_HOLIDAY_YEAR_INVALID", "ปีปฏิทินไม่ถูกต้อง", 400);
  }

  const apiKey = process.env.GOOGLE_HOLIDAY_API_KEY?.trim();

  const calendarId = process.env.GOOGLE_HOLIDAY_CALENDAR_ID?.trim();

  if (!apiKey || !calendarId) {
    fail(
      "GOOGLE_HOLIDAY_NOT_CONFIGURED",
      "ยังไม่ได้ตั้งค่า Google Holiday Calendar",
      503,
    );
  }

  const firstDate = `${year}-01-01`;
  const afterLastDate = `${year + 1}-01-01`;

  const baseUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/` +
      `${encodeURIComponent(calendarId)}/events`,
  );

  baseUrl.searchParams.set("key", apiKey);
  baseUrl.searchParams.set("timeMin", `${firstDate}T00:00:00+07:00`);
  baseUrl.searchParams.set("timeMax", `${afterLastDate}T00:00:00+07:00`);
  baseUrl.searchParams.set("singleEvents", "true");
  baseUrl.searchParams.set("orderBy", "startTime");
  baseUrl.searchParams.set("maxResults", "250");
  baseUrl.searchParams.set("timeZone", "Asia/Bangkok");

  const events = [];
  let pageToken = null;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(baseUrl);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    let response;

    try {
      response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      fail("GOOGLE_HOLIDAY_UNAVAILABLE", "เชื่อมต่อ Google Calendar ไม่สำเร็จ");
    }

    if (!response.ok) {
      fail(
        "GOOGLE_HOLIDAY_API_ERROR",
        `Google Calendar ตอบกลับ HTTP ${response.status}; กรุณาตรวจ API key และ Calendar ID`,
      );
    }

    const data = await response.json();

    if (!Array.isArray(data.items)) {
      fail(
        "GOOGLE_HOLIDAY_RESPONSE_INVALID",
        "รูปแบบข้อมูลจาก Google Calendar ไม่ถูกต้อง",
      );
    }

    events.push(...data.items);

    if (events.length > 2500) {
      fail(
        "GOOGLE_HOLIDAY_RESULT_LIMIT",
        "จำนวนรายการจาก Google Calendar มากเกินขนาดที่รองรับ",
      );
    }

    pageToken = data.nextPageToken ?? null;

    if (!pageToken) {
      break;
    }

    if (page === 9) {
      fail(
        "GOOGLE_HOLIDAY_PAGE_LIMIT",
        "รายการจาก Google Calendar มีหลายหน้าเกินขนาดที่รองรับ",
      );
    }
  }

  // Google ใช้ end.date แบบไม่รวมวันสิ้นสุด
  // รวมหลาย event ที่ตรงวันเดียวกันไว้เป็น candidate เดียว
  const dates = new Map();
  let skippedTimedEvents = 0;

  for (const event of events) {
    if (event.status === "cancelled") {
      continue;
    }

    const start = event.start?.date;
    const endExclusive = event.end?.date;

    if (!start || !endExclusive) {
      skippedTimedEvents += 1;
      continue;
    }

    if (
      !validDate(start) ||
      !validDate(endExclusive) ||
      endExclusive <= start
    ) {
      continue;
    }

    const name = String(event.summary ?? "").trim();

    if (!name) {
      continue;
    }

    let current = start;
    let expandedDays = 0;

    while (current < endExclusive) {
      expandedDays += 1;

      if (expandedDays > 366) {
        fail(
          "GOOGLE_HOLIDAY_EVENT_TOO_LONG",
          "พบกิจกรรมที่กินช่วงเวลานานผิดปกติ",
        );
      }

      if (current >= firstDate && current < afterLastDate) {
        const entry = dates.get(current) ?? {
          date: current,
          names: new Set(),
          sourceEventIds: new Set(),
        };

        entry.names.add(name);

        if (event.id) {
          entry.sourceEventIds.add(event.id);
        }

        dates.set(current, entry);
      }

      current = nextDate(current);
    }
  }

  const candidates = [...dates.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => ({
      date: entry.date,
      nameTh: [...entry.names].join(" / ").slice(0, 200),
      kind: "THAI_PUBLIC",
      sourceEventIds: [...entry.sourceEventIds],
    }));

  return {
    year,
    provider: "GOOGLE_CALENDAR",
    calendarId,
    candidates,
    skippedTimedEvents,
    imported: false,
  };
}
