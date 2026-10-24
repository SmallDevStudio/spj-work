import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const MAX_VERSIONS = 100;

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

function validWeekdays(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 7 &&
    value.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    new Set(value).size === value.length
  );
}

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-` + `${values.month}-` + `${values.day}`;
}

function companyRefFor(organizationId, companyId) {
  return adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("companies")
    .doc(companyId);
}

function versionsQuery(companyRef) {
  // ไม่มี orderBy แบบ desc จึงไม่ต้องสร้าง index เพิ่ม
  return companyRef.collection("workScheduleVersions").limit(MAX_VERSIONS + 1);
}

function assertHistoryLimit(snapshot) {
  if (snapshot.size > MAX_VERSIONS) {
    fail("WORK_SCHEDULE_HISTORY_LIMIT", "ประวัติวันทำงานเกินขนาดที่รองรับ");
  }
}

function latestVersion(snapshot) {
  return snapshot.docs.reduce(
    (latest, current) => (!latest || current.id > latest.id ? current : latest),
    null,
  );
}

export async function createCompanyWorkSchedule({
  organizationId,
  companyId,
  effectiveFrom,
  workingWeekdays,
  actor,
}) {
  if (!validDate(effectiveFrom)) {
    fail("WORK_SCHEDULE_DATE_INVALID", "วันที่เริ่มใช้ไม่ถูกต้อง", 400);
  }

  if (!validWeekdays(workingWeekdays)) {
    fail("WORK_SCHEDULE_DAYS_INVALID", "วันทำงานไม่ถูกต้อง", 400);
  }

  const companyRef = companyRefFor(organizationId, companyId);

  const scheduleRef = companyRef
    .collection("workScheduleVersions")
    .doc(effectiveFrom);

  const historyQuery = versionsQuery(companyRef);

  const auditRef = adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("auditLogs")
    .doc();

  const normalizedDays = [...workingWeekdays].sort((a, b) => a - b);

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, scheduleSnapshot, historySnapshot] =
      await Promise.all([
        transaction.get(companyRef),
        transaction.get(scheduleRef),
        transaction.get(historyQuery),
      ]);

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      fail("COMPANY_NOT_ACTIVE", "บริษัทไม่พร้อมใช้งาน", 404);
    }

    assertHistoryLimit(historySnapshot);

    if (scheduleSnapshot.exists) {
      fail(
        "WORK_SCHEDULE_VERSION_EXISTS",
        "บริษัทนี้มีการตั้งค่าวันทำงานในวันที่เลือกแล้ว",
      );
    }

    const latest = latestVersion(historySnapshot);

    if (latest && effectiveFrom <= latest.id) {
      fail(
        "WORK_SCHEDULE_DATE_ORDER_INVALID",
        "วันที่เริ่มใช้ต้องหลัง version ล่าสุด",
      );
    }

    if (latest && effectiveFrom <= todayInBangkok()) {
      fail(
        "WORK_SCHEDULE_RETROACTIVE_CHANGE",
        "การเปลี่ยนวันทำงานต้องเริ่มใช้ในอนาคต",
      );
    }

    transaction.set(scheduleRef, {
      organizationId,
      companyId,
      companyCode: companySnapshot.data().code,
      effectiveFrom,
      workingWeekdays: normalizedDays,
      status: "ACTIVE",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    });

    // Snapshot สำหรับหน้า Company; ประวัติ version ยังเป็นแหล่งข้อมูลอ้างอิงเมื่อคำนวณใบลาย้อนหลัง
    transaction.update(companyRef, {
      workSchedule: { effectiveFrom, workingWeekdays: normalizedDays },
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditRef, {
      organizationId,
      actor,
      action: "COMPANY_WORK_SCHEDULE_CREATE",
      entityType: "COMPANY",
      entityId: companyId,
      source: "WEB",
      summary:
        `Created work schedule for ` +
        `${companySnapshot.data().code} ` +
        `from ${effectiveFrom}.`,
      before: latest
        ? {
            effectiveFrom: latest.id,
            workingWeekdays: latest.data().workingWeekdays,
          }
        : null,
      after: {
        effectiveFrom,
        workingWeekdays: normalizedDays,
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    companyId,
    effectiveFrom,
    workingWeekdays: normalizedDays,
  };
}

export async function listCompanyWorkSchedules({ organizationId, companyId }) {
  const companyRef = companyRefFor(organizationId, companyId);

  const [companySnapshot, historySnapshot] = await Promise.all([
    companyRef.get(),
    versionsQuery(companyRef).get(),
  ]);

  if (
    !companySnapshot.exists ||
    companySnapshot.data()?.isDeleted === true ||
    companySnapshot.data()?.status !== "ACTIVE"
  ) {
    fail("COMPANY_NOT_ACTIVE", "บริษัทไม่พร้อมใช้งาน", 404);
  }

  assertHistoryLimit(historySnapshot);

  const versions = historySnapshot.docs
    .map((snapshot) => ({
      id: snapshot.id,
      effectiveFrom: snapshot.data().effectiveFrom,
      workingWeekdays: snapshot.data().workingWeekdays,
      status: snapshot.data().status,
    }))
    .sort((a, b) => b.id.localeCompare(a.id));

  return {
    companyId,
    companyCode: companySnapshot.data().code,
    companyName:
      companySnapshot.data().nameTh ??
      companySnapshot.data().name ??
      companySnapshot.data().code,
    versions,
  };
}

export async function getCompanyWorkScheduleForRange({
  organizationId,
  companyId,
  startDate,
  endDate,
}) {
  if (!validDate(startDate) || !validDate(endDate) || endDate < startDate) {
    fail("WORK_SCHEDULE_RANGE_INVALID", "ช่วงวันที่ลาไม่ถูกต้อง", 400);
  }

  const history = await listCompanyWorkSchedules({
    organizationId,
    companyId,
  });

  const atStart = history.versions.find(
    (item) => item.effectiveFrom <= startDate,
  );

  const atEnd = history.versions.find((item) => item.effectiveFrom <= endDate);

  if (
    !atStart ||
    !atEnd ||
    atStart.status !== "ACTIVE" ||
    atEnd.status !== "ACTIVE"
  ) {
    fail(
      "WORK_SCHEDULE_NOT_CONFIGURED",
      "บริษัทยังไม่มีวันทำงานที่มีผลในช่วงที่เลือก",
    );
  }

  if (atStart.id !== atEnd.id) {
    fail(
      "WORK_SCHEDULE_CHANGED_IN_RANGE",
      "วันทำงานเปลี่ยนระหว่างช่วงที่ลา กรุณาแยกใบลา",
    );
  }

  if (!validWeekdays(atStart.workingWeekdays)) {
    fail("WORK_SCHEDULE_INVALID", "ข้อมูลวันทำงานของบริษัทไม่ถูกต้อง");
  }

  return {
    companyId,
    companyCode: history.companyCode,
    versionId: atStart.id,
    effectiveFrom: atStart.effectiveFrom,
    workingWeekdays: atStart.workingWeekdays,
  };
}
