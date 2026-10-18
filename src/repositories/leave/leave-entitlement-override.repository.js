import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function createLeaveEntitlementOverride({
  organizationId,
  data,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const employeeRef = organizationRef
    .collection("employees")
    .doc(data.employeeId);

  const overrideId = `${data.leaveTypeCode}_${data.effectiveFrom}`;

  const overrideRef = employeeRef
    .collection("leaveEntitlementOverrides")
    .doc(overrideId);

  const auditRef = organizationRef.collection("auditLogs").doc();

  let result;

  await adminFirestore.runTransaction(async (transaction) => {
    const assignmentsQuery = employeeRef
      .collection("leaveTemplateAssignments")
      .orderBy("__name__")
      .limit(101);

    const [employeeSnapshot, existingOverride, assignmentSnapshots] =
      await Promise.all([
        transaction.get(employeeRef),
        transaction.get(overrideRef),
        transaction.get(assignmentsQuery),
      ]);

    if (
      !employeeSnapshot.exists ||
      employeeSnapshot.data()?.isDeleted === true
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_NOT_FOUND",
        message: "ไม่พบข้อมูลพนักงาน",
        status: 404,
      });
    }

    const employee = employeeSnapshot.data();

    if (employee.companyId !== data.companyId) {
      throw new ApplicationError({
        code: "EMPLOYEE_COMPANY_MISMATCH",
        message: "พนักงานไม่ได้สังกัดบริษัทที่เลือก",
        status: 403,
      });
    }

    if (existingOverride.exists) {
      throw new ApplicationError({
        code: "LEAVE_OVERRIDE_EXISTS",
        message:
          "มีการปรับสิทธิ์ประเภทนี้ในวันที่เลือกแล้ว กรุณาเลือกวันที่เริ่มใช้ใหม่",
        status: 409,
      });
    }

    if (assignmentSnapshots.size > 100) {
      throw new ApplicationError({
        code: "LEAVE_ASSIGNMENT_LIMIT",
        message: "มีประวัติการมอบ template มากเกินขนาดที่รองรับ",
        status: 409,
      });
    }

    const assignment = assignmentSnapshots.docs
      .map((snapshot) => snapshot.data())
      .filter(
        (item) =>
          item.effectiveFrom <= data.effectiveFrom &&
          item.status === "ACTIVE" &&
          item.companyId === data.companyId,
      )
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

    if (!assignment) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_NOT_ASSIGNED",
        message: "พนักงานยังไม่มี Leave Template ที่มีผลในวันที่เลือก",
        status: 409,
      });
    }

    const templateEntry = assignment.entries?.find(
      (entry) => entry.leaveTypeCode === data.leaveTypeCode,
    );

    if (!templateEntry) {
      throw new ApplicationError({
        code: "LEAVE_TYPE_NOT_IN_TEMPLATE",
        message: "ประเภทการลานี้ไม่มีใน Leave Template ของพนักงาน",
        status: 409,
      });
    }

    if (data.leaveTypeCode === "MATERNITY" && data.entitlementDays < 120) {
      throw new ApplicationError({
        code: "MATERNITY_BELOW_MINIMUM",
        message: "สิทธิลาคลอดต้องไม่น้อยกว่า 120 วัน",
        status: 400,
      });
    }

    const record = {
      organizationId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      leaveTypeCode: data.leaveTypeCode,
      effectiveFrom: data.effectiveFrom,
      entitlementDays: data.entitlementDays,
      reason: data.reason,
      source: "INDIVIDUAL_OVERRIDE",
      templateCode: assignment.templateCode,
      templateVersionId: assignment.templateVersionId,
      templateEffectiveFrom: assignment.effectiveFrom,
      previousTemplateDays: templateEntry.resolvedEntitlementDays ?? null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: actor.uid,
    };

    transaction.set(overrideRef, record);

    transaction.set(auditRef, {
      organizationId,
      actor,
      action: "LEAVE_ENTITLEMENT_OVERRIDE_CREATE",
      entityType: "EMPLOYEE",
      entityId: data.employeeId,
      source: "WEB",
      summary:
        `Set ${data.leaveTypeCode} entitlement override ` +
        `for employee ${employee.employeeCode}.`,
      before: {
        templateDays: templateEntry.resolvedEntitlementDays ?? null,
      },
      after: {
        companyId: data.companyId,
        leaveTypeCode: data.leaveTypeCode,
        effectiveFrom: data.effectiveFrom,
        entitlementDays: data.entitlementDays,
        reason: data.reason,
      },
      metadata: {
        templateCode: assignment.templateCode,
        templateVersionId: assignment.templateVersionId,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    result = {
      id: overrideId,
      companyId: data.companyId,
      employeeId: data.employeeId,
      leaveTypeCode: data.leaveTypeCode,
      effectiveFrom: data.effectiveFrom,
      entitlementDays: data.entitlementDays,
      reason: data.reason,
    };
  });

  return result;
}
