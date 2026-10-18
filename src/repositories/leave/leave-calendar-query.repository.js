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
    publishedAt: toIsoString(data.publishedAt),
    publishedBy: data.publishedBy ?? null,
    updatedAt: toIsoString(data.updatedAt),
    updatedBy: data.updatedBy ?? null,
  };
}
