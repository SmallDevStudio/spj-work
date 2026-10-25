import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message, status = 409) {
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

function normalizeCalendar({ year, holidays }) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    fail("LEAVE_CALENDAR_YEAR_INVALID", "ปีปฏิทินไม่ถูกต้อง", 400);
  }

  if (!Array.isArray(holidays) || holidays.length > 366) {
    fail("LEAVE_CALENDAR_HOLIDAYS_INVALID", "รายการวันหยุดไม่ถูกต้อง", 400);
  }

  const normalizedHolidays = holidays.map((item) => {
    const date = item?.date;
    const nameTh = item?.nameTh?.trim();

    if (
      !validDate(date) ||
      Number(date.slice(0, 4)) !== year ||
      !nameTh ||
      nameTh.length > 200 ||
      !["THAI_PUBLIC", "COMPANY"].includes(item.kind)
    ) {
      fail(
        "LEAVE_CALENDAR_HOLIDAY_INVALID",
        `ข้อมูลวันหยุด ${date ?? ""} ไม่ถูกต้อง`,
        400,
      );
    }

    return {
      date,
      nameTh,
      kind: item.kind,
    };
  });

  normalizedHolidays.sort((a, b) => a.date.localeCompare(b.date));

  const holidayDates = normalizedHolidays.map((item) => item.date);

  if (new Set(holidayDates).size !== holidayDates.length) {
    fail("LEAVE_CALENDAR_HOLIDAY_DUPLICATED", "มีวันที่หยุดซ้ำกัน", 400);
  }

  return {
    year,
    holidays: normalizedHolidays,
    holidayDates,
  };
}

function getRefs(organizationId, year) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  return {
    calendarRef: organizationRef
      .collection("leaveCalendarYears")
      .doc(String(year)),
    auditRef: organizationRef.collection("auditLogs").doc(),
  };
}

export async function saveLeaveCalendarDraft({ organizationId, data, actor }) {
  // ไม่อ่าน data.workingWeekdays:
  // วันทำงานต้องอยู่ใน workScheduleVersions ของบริษัท
  const calendar = normalizeCalendar(data);

  const { calendarRef, auditRef } = getRefs(organizationId, calendar.year);

  let revision;

  await adminFirestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(calendarRef);

    const existing = snapshot.exists ? snapshot.data() : null;

    revision = (existing?.pendingDraft?.revision ?? existing?.revision ?? 0) + 1;

    // เขียนเอกสารทั้งชุด เพื่อเอา workingWeekdays
    // ที่เคยอยู่ในฉบับร่างออกจริง
    if (existing?.status === "PUBLISHED") {
      // Keep the published calendar active until the next revision is approved.
      transaction.update(calendarRef, {
        pendingDraft: { ...calendar, revision, savedAt: FieldValue.serverTimestamp(), savedBy: actor.uid },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    } else {
      transaction.set(calendarRef, {
        organizationId,
        ...calendar,
        status: "DRAFT",
        revision,
        publishedAt: null,
        publishedBy: null,
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        createdBy: existing?.createdBy ?? actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    }

    transaction.set(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_CALENDAR_DRAFT_SAVE",
      entityType: "LEAVE_CALENDAR_YEAR",
      entityId: String(calendar.year),
      source: "WEB",
      summary: `Saved leave calendar draft ` + `for ${calendar.year}.`,
      before: existing
        ? {
            revision: existing.revision,
            status: existing.status,
            holidayDates: existing.pendingDraft?.holidayDates ?? existing.holidayDates ?? [],
            holidays: existing.pendingDraft?.holidays ?? existing.holidays ?? [],
          }
        : null,
      after: {
        revision,
        status: existing?.status === "PUBLISHED" ? "PENDING_REVISION" : "DRAFT",
        holidayDates: calendar.holidayDates,
        holidays: calendar.holidays,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    year: calendar.year,
    revision,
    status: "DRAFT",
  };
}

export async function publishLeaveCalendarYear({
  organizationId,
  year,
  expectedRevision,
  confirmedComplete,
  actor,
}) {
  if (
    !Number.isInteger(year) ||
    year < 2000 ||
    year > 2100 ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 1
  ) {
    fail(
      "LEAVE_CALENDAR_PUBLISH_INPUT_INVALID",
      "ข้อมูลการเผยแพร่ไม่ถูกต้อง",
      400,
    );
  }

  if (confirmedComplete !== true) {
    fail(
      "LEAVE_CALENDAR_CONFIRMATION_REQUIRED",
      "กรุณายืนยันว่าได้ตรวจวันหยุดครบแล้ว",
      400,
    );
  }

  const { calendarRef, auditRef } = getRefs(organizationId, year);

  await adminFirestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(calendarRef);

    const existing = snapshot.exists ? snapshot.data() : null;

    const pendingRevision = existing?.status === "PUBLISHED" &&
      existing.pendingDraft?.revision === expectedRevision;
    if (!existing || (!pendingRevision &&
      (existing.status !== "DRAFT" || existing.revision !== expectedRevision))) {
      fail(
        "LEAVE_CALENDAR_REVISION_CONFLICT",
        "ฉบับร่างถูกแก้ไขหรือเผยแพร่แล้ว กรุณาโหลดข้อมูลใหม่",
      );
    }

    const calendar = normalizeCalendar({
      year,
      holidays: pendingRevision ? existing.pendingDraft.holidays : existing.holidays,
    });

    if (calendar.holidays.length === 0) {
      fail("LEAVE_CALENDAR_EMPTY", "ยังไม่มีวันหยุดในปีนี้");
    }

    if (pendingRevision) {
      transaction.set(calendarRef.collection("versions").doc(String(existing.revision)), {
        organizationId,
        year,
        revision: existing.revision,
        holidays: existing.holidays,
        holidayDates: existing.holidayDates,
        publishedAt: existing.publishedAt,
        publishedBy: existing.publishedBy,
        archivedAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.update(calendarRef, {
      ...calendar,
      revision: expectedRevision,
      status: "PUBLISHED",
      pendingDraft: FieldValue.delete(),
      publishedAt: FieldValue.serverTimestamp(),
      publishedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_CALENDAR_PUBLISH",
      entityType: "LEAVE_CALENDAR_YEAR",
      entityId: String(year),
      source: "WEB",
      summary: `Published leave calendar ` + `for ${year}.`,
      before: {
        revision: existing.revision,
        status: existing.status,
        holidayDates: existing.holidayDates ?? [],
        holidays: existing.holidays ?? [],
      },
      after: {
        revision: expectedRevision,
        status: "PUBLISHED",
        holidayCount: calendar.holidays.length,
        holidayDates: calendar.holidayDates,
        holidays: calendar.holidays,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    year,
    revision: expectedRevision,
    status: "PUBLISHED",
  };
}
