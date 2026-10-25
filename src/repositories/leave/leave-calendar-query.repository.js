import "server-only";

import { adminFirestore } from "@/lib/firebase/admin";

function toIsoString(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  return null;
}

export async function getLeaveCalendarYear({ organizationId, year }) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveCalendarYears")
    .doc(String(year))
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  return {
    year,
    status: data.status,
    revision: data.revision,
    workingWeekdays: data.workingWeekdays ?? [],
    holidays: data.holidays ?? [],
    holidayDates: data.holidayDates ?? [],
    publishedAt: toIsoString(data.publishedAt),
    publishedBy: data.publishedBy ?? null,
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: data.updatedBy ?? null,
    pendingDraft: data.pendingDraft ? {
      revision: data.pendingDraft.revision,
      holidays: data.pendingDraft.holidays ?? [],
      savedAt: toIsoString(data.pendingDraft.savedAt),
      savedBy: data.pendingDraft.savedBy ?? null,
    } : null,
  };
}

export async function listLeaveCalendarYears({ organizationId }) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveCalendarYears")
    .limit(101)
    .get();

  return snapshot.docs
    .filter((doc) => /^\d{4}$/.test(doc.id) && doc.data().organizationId === organizationId)
    .map((doc) => {
      const data = doc.data();
      return {
        year: Number(doc.id),
        status: data.status,
        revision: data.revision,
        holidayCount: data.pendingDraft?.holidays?.length ?? data.holidays?.length ?? data.holidayDates?.length ?? 0,
        hasPendingDraft: Boolean(data.pendingDraft),
        updatedAt: toIsoString(data.updatedAt),
        publishedAt: toIsoString(data.publishedAt),
      };
    })
    .sort((a, b) => b.year - a.year);
}
