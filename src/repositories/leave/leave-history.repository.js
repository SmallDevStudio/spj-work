import "server-only";

import { adminFirestore } from "@/lib/firebase/admin";
import { ApplicationError } from "@/lib/errors/application-error";
import { canAccessCompany } from "@/lib/auth/company-access";

const PAGE_SIZE = 50;
const READ_SIZE = 100;

function timestamp(value) {
  return value?.toDate?.()?.toISOString() ?? null;
}

export async function getManagedLeaveRequest({
  organizationId,
  companyAccess,
  requestId,
  includeDeleted = false,
}) {
  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests")
    .doc(requestId)
    .get();

  const request = snapshot.data();

  if (
    !snapshot.exists ||
    request?.organizationId !== organizationId ||
    !canAccessCompany(companyAccess, request.companyId) ||
    (request.isDeleted === true && !includeDeleted)
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_NOT_FOUND",
      message: "ไม่พบใบลา",
      status: 404,
    });
  }

  return {
    id: snapshot.id,
    companyId: request.companyId,
    employeeId: request.employeeId,
    employeeCode: request.employeeCode ?? null,
    leaveTypeCode: request.leaveTypeCode,
    startDate: request.startDate,
    endDate: request.endDate,
    dayPart: request.dayPart,
    countedDates: request.countedDates ?? [],
    excludedDates: request.excludedDates ?? [],
    requestedDays: request.requestedDays ?? null,
    reason: request.reason ?? "",
    status: request.status,
    isDeleted: request.isDeleted === true,
    deletedReason: request.deletedReason ?? null,
    createdAt: timestamp(request.createdAt),
    submittedAt: timestamp(request.submittedAt),
    deletedAt: timestamp(request.deletedAt),
    approval: request.approval
      ? {
          mode: request.approval.mode ?? "SEQUENTIAL",
          steps: (request.approval.steps ?? []).map((step) => ({
            key: step.key ?? "MANAGER",
            order: step.order ?? null,
            status: step.status,
            decidedByEmployeeId: step.decidedByEmployeeId ?? null,
            decidedAt: timestamp(step.decidedAt),
            comment: step.comment ?? null,
            financialDisposition: step.financialDisposition ?? null,
            financialReason: step.financialReason ?? null,
          })),
        }
      : null,
  };
}

export async function listLeaveHistory({
  organizationId,
  companyAccess,
  cursor = null,
  includeDeleted = false,
}) {
  const collection = adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests");

  let lastSnapshot = null;

  if (cursor) {
    lastSnapshot = await collection.doc(cursor).get();

    if (!lastSnapshot.exists) {
      return { items: [], nextCursor: null };
    }
  }

  const items = [];
  let hasMore = false;

  while (items.length < PAGE_SIZE) {
    let query = collection.orderBy("createdAt", "desc").limit(READ_SIZE);

    if (lastSnapshot) query = query.startAfter(lastSnapshot);

    const page = await query.get();

    for (const snapshot of page.docs) {
      lastSnapshot = snapshot;
      const request = snapshot.data();

      const visible =
        request.organizationId === organizationId &&
        request.companyId &&
        (companyAccess.scope === "ALL" ||
          companyAccess.companyIds.includes(request.companyId));

      if (!visible || (!includeDeleted && request.isDeleted === true)) {
        continue;
      }

      items.push({
        id: snapshot.id,
        companyId: request.companyId,
        employeeId: request.employeeId,
        employeeCode: request.employeeCode ?? null,
        leaveTypeCode: request.leaveTypeCode,
        startDate: request.startDate,
        endDate: request.endDate,
        dayPart: request.dayPart,
        requestedDays: request.requestedDays ?? null,
        status: request.status,
        isDeleted: request.isDeleted === true,
        submittedAt: timestamp(request.submittedAt),
        createdAt: timestamp(request.createdAt),
        deletedAt: timestamp(request.deletedAt),
        deletedReason: request.isDeleted === true ? request.deletedReason ?? null : null,
      });

      if (items.length === PAGE_SIZE) break;
    }

    hasMore = page.size === READ_SIZE || items.length === PAGE_SIZE;
    if (items.length === PAGE_SIZE || page.size < READ_SIZE) break;
  }

  return {
    items,
    nextCursor: hasMore ? lastSnapshot?.id ?? null : null,
  };
}
