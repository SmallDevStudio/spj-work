import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const MAX_DELEGATIONS_PER_EMPLOYEE = 100;

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function isCurrentlyActive(item, onDate) {
  return (
    item.status === "ACTIVE" &&
    item.isDeleted !== true &&
    typeof item.effectiveFrom === "string" &&
    typeof item.effectiveTo === "string" &&
    item.effectiveFrom <= onDate &&
    onDate <= item.effectiveTo
  );
}

export async function listActiveLeaveHrDelegations({
  organizationId,
  employeeId,
  companyId = null,
  transaction = null,
  onDate = bangkokToday(),
}) {
  if (!organizationId || !employeeId) {
    return [];
  }

  const query = adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveHrDelegations")
    .where("delegateEmployeeId", "==", employeeId)
    .limit(MAX_DELEGATIONS_PER_EMPLOYEE + 1);

  const snapshot = transaction
    ? await transaction.get(query)
    : await query.get();

  if (snapshot.size > MAX_DELEGATIONS_PER_EMPLOYEE) {
    throw new ApplicationError({
      code: "LEAVE_HR_DELEGATION_LIMIT",
      message: "จำนวนรายการมอบหมายงานลาเกินขนาดที่รองรับ",
      status: 409,
    });
  }

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .filter(
      (item) =>
        item.organizationId === organizationId &&
        item.delegateEmployeeId === employeeId &&
        isCurrentlyActive(item, onDate) &&
        (!companyId || item.companyId === companyId),
    );
}

export async function listActiveLeaveHrDelegationsForCompany({
  organizationId,
  companyId,
  onDate = bangkokToday(),
}) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveHrDelegations")
    .where("companyId", "==", companyId)
    .limit(501)
    .get();

  if (snapshot.size > 500) {
    throw new ApplicationError({
      code: "LEAVE_HR_COMPANY_DELEGATION_LIMIT",
      message: "จำนวนผู้ทำหน้าที่ HR แทนของบริษัทเกินขนาดที่รองรับ",
      status: 409,
    });
  }

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter(
      (item) =>
        item.organizationId === organizationId &&
        item.companyId === companyId &&
        isCurrentlyActive(item, onDate),
    );
}

export async function listLeaveApprovalDelegationsForCompany({
  organizationId,
  companyId,
}) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveHrDelegations")
    .where("companyId", "==", companyId)
    .limit(501)
    .get();

  if (snapshot.size > 500) {
    throw new ApplicationError({
      code: "LEAVE_DELEGATION_LIST_LIMIT",
      message: "จำนวนรายการมอบหมายเกินขนาดที่หน้านี้รองรับ",
      status: 409,
    });
  }

  return snapshot.docs
    .filter((doc) => doc.data().organizationId === organizationId)
    .map((doc) => ({
      id: doc.id,
      companyId: doc.data().companyId,
      delegateEmployeeId: doc.data().delegateEmployeeId,
      effectiveFrom: doc.data().effectiveFrom,
      effectiveTo: doc.data().effectiveTo,
      status: doc.data().status,
    }))
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}
