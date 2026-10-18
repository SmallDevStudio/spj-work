import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function createLeaveOpeningBalance({
  organizationId,
  data,
  leaveTypeVersion,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef
    .collection("companies")
    .doc(data.companyId);

  const employeeRef = organizationRef
    .collection("employees")
    .doc(data.employeeId);

  const versionRef = adminFirestore.doc(leaveTypeVersion.versionPath);

  // รหัสเดียวกันสำหรับพนักงาน + ประเภท + รอบปี:
  // import ซ้ำจะไม่สร้างยอดตั้งต้นซ้ำ
  const ledgerId =
    `${data.periodStart}_${data.periodEnd}_` + `${data.leaveTypeCode}_OPENING`;

  const ledgerRef = employeeRef.collection("leaveLedgerEntries").doc(ledgerId);
  const ledgerQuery = employeeRef.collection("leaveLedgerEntries").limit(501);

  const auditRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const [
      companySnapshot,
      employeeSnapshot,
      versionSnapshot,
      existingLedger,
      ledgerSnapshot,
    ] = await Promise.all([
      transaction.get(companyRef),
      transaction.get(employeeRef),
      transaction.get(versionRef),
      transaction.get(ledgerRef),
      transaction.get(ledgerQuery),
    ]);

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทไม่ได้เปิดใช้งาน",
        status: 400,
      });
    }

    if (
      !employeeSnapshot.exists ||
      employeeSnapshot.data()?.isDeleted === true ||
      employeeSnapshot.data()?.companyId !== data.companyId
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_COMPANY_MISMATCH",
        message: "ไม่พบพนักงานในบริษัทที่เลือก",
        status: 404,
      });
    }

    if (
      !versionSnapshot.exists ||
      versionSnapshot.data()?.status !== "ACTIVE" ||
      versionSnapshot.data()?.effectiveFrom > data.cutoverDate
    ) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_VERSION_INVALID",
        message: "ประเภทการลาไม่มีผลในวันที่เริ่มใช้ระบบ",
        status: 409,
      });
    }

    if (existingLedger.exists) {
      throw new ApplicationError({
        code: "LEAVE_OPENING_ALREADY_EXISTS",
        message: "มีการบันทึกยอดตั้งต้นของประเภทนี้ในรอบนี้แล้ว",
        status: 409,
      });
    }

    if (ledgerSnapshot.size > 500) {
      throw new ApplicationError({
        code: "LEAVE_LEDGER_TOO_LARGE",
        message: "รายการวันลาของพนักงานมากเกินขนาดที่ระบบตรวจรอบยกมาซ้ำได้",
        status: 409,
      });
    }

    const hasOverlappingOpening = ledgerSnapshot.docs.some((snapshot) => {
      const entry = snapshot.data();

      return (
        entry.eventType === "OPENING_BALANCE" &&
        entry.leaveTypeCode === data.leaveTypeCode &&
        typeof entry.periodStart === "string" &&
        typeof entry.periodEnd === "string" &&
        entry.periodStart <= data.periodEnd &&
        data.periodStart <= entry.periodEnd
      );
    });

    if (hasOverlappingOpening) {
      throw new ApplicationError({
        code: "LEAVE_OPENING_PERIOD_OVERLAP",
        message: "มีการบันทึกยอดตั้งต้นของประเภทนี้ในรอบวันที่ทับซ้อนแล้ว",
        status: 409,
      });
    }

    const record = {
      organizationId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      leaveTypeCode: data.leaveTypeCode,
      leaveTypeVersionId: leaveTypeVersion.id,
      leaveTypeVersionPath: leaveTypeVersion.versionPath,
      eventType: "OPENING_BALANCE",
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      effectiveDate: data.cutoverDate,
      balanceDeltaDays: data.openingBalanceDays,
      historicalUsedDays: data.historicalUsedDays,
      note: data.note,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    };

    transaction.set(ledgerRef, record);

    transaction.set(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_OPENING_BALANCE_CREATE",
      entityType: "EMPLOYEE",
      entityId: data.employeeId,
      source: "WEB",
      summary:
        `Imported opening leave balance for ` +
        `${employeeSnapshot.data().employeeCode}.`,
      before: null,
      after: {
        companyId: data.companyId,
        leaveTypeCode: data.leaveTypeCode,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        cutoverDate: data.cutoverDate,
        openingBalanceDays: data.openingBalanceDays,
        historicalUsedDays: data.historicalUsedDays,
      },
      metadata: { ledgerId },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    id: ledgerId,
    employeeId: data.employeeId,
    companyId: data.companyId,
    leaveTypeCode: data.leaveTypeCode,
    periodStart: data.periodStart,
    periodEnd: data.periodEnd,
    cutoverDate: data.cutoverDate,
    openingBalanceDays: data.openingBalanceDays,
    historicalUsedDays: data.historicalUsedDays,
  };
}
