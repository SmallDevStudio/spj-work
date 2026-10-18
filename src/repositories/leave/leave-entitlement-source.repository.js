import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { getLeaveCycleForDate } from "@/modules/leave/leave-cycle";

function latestEffective(docs, onDate) {
  return (
    docs
      .map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }))
      .filter(
        (item) => item.status === "ACTIVE" && item.effectiveFrom <= onDate,
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
  );
}

export async function getLeaveEntitlementSource({
  organizationId,
  employeeId,
  leaveTypeCode,
  onDate,
  resetMonthDay = "01-01",
}) {
  const cycle = getLeaveCycleForDate({
    date: onDate,
    resetMonthDay,
  });

  const employeeRef = adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("employees")
    .doc(employeeId);

  const [
    employeeSnapshot,
    ledgerSnapshot,
    assignmentSnapshot,
    overrideSnapshot,
  ] = await Promise.all([
    employeeRef.get(),
    employeeRef.collection("leaveLedgerEntries").limit(501).get(),
    employeeRef.collection("leaveTemplateAssignments").limit(101).get(),
    employeeRef.collection("leaveEntitlementOverrides").limit(101).get(),
  ]);

  if (!employeeSnapshot.exists || employeeSnapshot.data()?.isDeleted === true) {
    throw new ApplicationError({
      code: "EMPLOYEE_NOT_FOUND",
      message: "ไม่พบข้อมูลพนักงาน",
      status: 404,
    });
  }

  if (
    ledgerSnapshot.size > 500 ||
    assignmentSnapshot.size > 100 ||
    overrideSnapshot.size > 100
  ) {
    throw new ApplicationError({
      code: "LEAVE_ENTITLEMENT_HISTORY_LIMIT",
      message: "ประวัติสิทธิวันลาเกินขนาดที่รองรับ กรุณาติดต่อผู้ดูแลระบบ",
      status: 409,
    });
  }

  const companyId = employeeSnapshot.data().companyId;

  const openings = ledgerSnapshot.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }))
    .filter(
      (entry) =>
        entry.eventType === "OPENING_BALANCE" &&
        entry.leaveTypeCode === leaveTypeCode &&
        entry.periodStart <= cycle.periodEnd &&
        cycle.periodStart <= entry.periodEnd,
    );

  if (openings.length > 1) {
    throw new ApplicationError({
      code: "LEAVE_OPENING_PERIOD_OVERLAP",
      message: "พบยอดวันลานำเข้าซ้ำกันในรอบปีนี้",
      status: 409,
    });
  }

  if (openings.length === 1) {
    const opening = openings[0];

    if (
      opening.periodStart !== cycle.periodStart ||
      opening.periodEnd !== cycle.periodEnd
    ) {
      throw new ApplicationError({
        code: "LEAVE_OPENING_CYCLE_MISMATCH",
        message: "รอบปีของยอดนำเข้าไม่ตรงกับการตั้งค่าวันเริ่มรอบปี",
        status: 409,
      });
    }

    if (opening.companyId !== companyId) {
      throw new ApplicationError({
        code: "LEAVE_OPENING_COMPANY_MISMATCH",
        message: "บริษัทของยอดนำเข้าไม่ตรงกับข้อมูลพนักงาน",
        status: 409,
      });
    }

    return {
      source: "OPENING_BALANCE",
      employeeId,
      companyId,
      leaveTypeCode,
      ...cycle,
      sourceId: opening.id,
      effectiveDate: opening.effectiveDate,
      openingBalanceDays: opening.balanceDeltaDays,
      historicalUsedDays: opening.historicalUsedDays ?? 0,
      entitlementDays: null,
      templateCode: null,
    };
  }

  const assignment = latestEffective(
    assignmentSnapshot.docs.filter(
      (snapshot) => snapshot.data().companyId === companyId,
    ),
    onDate,
  );

  if (!assignment) {
    return {
      source: "NOT_CONFIGURED",
      employeeId,
      companyId,
      leaveTypeCode,
      ...cycle,
      sourceId: null,
      openingBalanceDays: null,
      historicalUsedDays: null,
      entitlementDays: null,
      templateCode: null,
    };
  }

  const entry = assignment.entries?.find(
    (item) => item.leaveTypeCode === leaveTypeCode,
  );

  if (!entry) {
    return {
      source: "NOT_CONFIGURED",
      employeeId,
      companyId,
      leaveTypeCode,
      ...cycle,
      sourceId: assignment.id,
      openingBalanceDays: null,
      historicalUsedDays: null,
      entitlementDays: null,
      templateCode: assignment.templateCode,
    };
  }

  const override = latestEffective(
    overrideSnapshot.docs.filter(
      (snapshot) =>
        snapshot.data().companyId === companyId &&
        snapshot.data().leaveTypeCode === leaveTypeCode,
    ),
    onDate,
  );

  return {
    source: override ? "INDIVIDUAL_OVERRIDE" : "LEAVE_TEMPLATE",
    employeeId,
    companyId,
    leaveTypeCode,
    ...cycle,
    sourceId: override?.id ?? assignment.id,
    openingBalanceDays: null,
    historicalUsedDays: null,
    entitlementDays:
      override?.entitlementDays ?? entry.resolvedEntitlementDays ?? null,
    templateCode: assignment.templateCode,
    templateVersionPath: assignment.templateVersionPath,
  };
}
