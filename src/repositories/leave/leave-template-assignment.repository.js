import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function commitLeaveTemplateAssignments({
  organizationId,
  data,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef
    .collection("companies")
    .doc(data.companyId);

  const sharedTemplateRef = organizationRef
    .collection("leaveTemplates")
    .doc(data.templateCode);

  const legacyTemplateRef = companyRef
    .collection("leaveTemplates")
    .doc(data.templateCode);

  const employees = data.employeeIds.map((employeeId) => {
    const employeeRef = organizationRef.collection("employees").doc(employeeId);

    return {
      employeeId,
      employeeRef,
      assignmentRef: employeeRef
        .collection("leaveTemplateAssignments")
        .doc(data.effectiveFrom),
      auditRef: organizationRef.collection("auditLogs").doc(),
    };
  });

  let result;

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, sharedTemplateSnapshot, legacyTemplateSnapshot] =
      await Promise.all([
        transaction.get(companyRef),
        transaction.get(sharedTemplateRef),
        transaction.get(legacyTemplateRef),
      ]);

    const templateSnapshot = sharedTemplateSnapshot.exists
      ? sharedTemplateSnapshot
      : legacyTemplateSnapshot;

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
      !templateSnapshot.exists ||
      templateSnapshot.data()?.isDeleted === true ||
      templateSnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_NOT_ACTIVE",
        message: "Leave Template ไม่พร้อมใช้งาน",
        status: 404,
      });
    }

    const template = templateSnapshot.data();

    if (data.effectiveFrom < template.effectiveFrom) {
      throw new ApplicationError({
        code: "ASSIGNMENT_BEFORE_TEMPLATE_EFFECTIVE",
        message: "วันที่มอบสิทธิ์ต้องไม่ก่อนวันที่ Leave Template เริ่มใช้",
        status: 400,
      });
    }

    if (!template.currentVersionId) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_VERSION_MISSING",
        message: "ไม่พบ revision ของ Leave Template",
        status: 409,
      });
    }

    const versionRef = templateSnapshot.ref
      .collection("versions")
      .doc(template.currentVersionId);

    // อ่านทุก document ก่อนเริ่มเขียน
    const [versionSnapshot, ...snapshots] = await Promise.all([
      transaction.get(versionRef),
      ...employees.flatMap((item) => [
        transaction.get(item.employeeRef),
        transaction.get(item.assignmentRef),
      ]),
    ]);

    if (!versionSnapshot.exists) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_VERSION_MISSING",
        message: "ไม่พบ revision ของ Leave Template",
        status: 409,
      });
    }

    const templateVersion = versionSnapshot.data();

    if (
      (templateSnapshot.ref.path === legacyTemplateRef.path &&
        templateVersion.companyId !== data.companyId) ||
      templateVersion.code !== data.templateCode ||
      templateVersion.status !== "ACTIVE" ||
      templateVersion.effectiveFrom > data.effectiveFrom
    ) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_VERSION_INVALID",
        message: "Revision ของ Leave Template ไม่ตรงกับวันที่มอบสิทธิ์",
        status: 409,
      });
    }

    for (const [index, item] of employees.entries()) {
      const employeeSnapshot = snapshots[index * 2];
      const assignmentSnapshot = snapshots[index * 2 + 1];

      if (
        !employeeSnapshot.exists ||
        employeeSnapshot.data()?.isDeleted === true
      ) {
        throw new ApplicationError({
          code: "EMPLOYEE_NOT_FOUND",
          message: `ไม่พบพนักงานรายการที่ ${index + 1}`,
          status: 409,
        });
      }

      const employee = employeeSnapshot.data();

      if (employee.companyId !== data.companyId) {
        throw new ApplicationError({
          code: "EMPLOYEE_COMPANY_MISMATCH",
          message: `พนักงาน ${employee.employeeCode} ไม่ได้สังกัดบริษัทที่เลือก`,
          status: 409,
        });
      }

      if (assignmentSnapshot.exists) {
        throw new ApplicationError({
          code: "LEAVE_TEMPLATE_ASSIGNMENT_EXISTS",
          message: `พนักงาน ${employee.employeeCode} มีการมอบ template ในวันที่นี้แล้ว`,
          status: 409,
        });
      }
    }

    for (const [index, item] of employees.entries()) {
      const employee = snapshots[index * 2].data();

      const assignment = {
        organizationId,
        companyId: data.companyId,
        employeeId: item.employeeId,
        templateCode: data.templateCode,
        templateVersionId: versionRef.id,
        templateVersionPath: versionRef.path,
        templateRevision: templateVersion.revision,
        templateNameTh: templateVersion.nameTh,
        effectiveFrom: data.effectiveFrom,
        entries: templateVersion.entries,
        status: "ACTIVE",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
      };

      transaction.set(item.assignmentRef, assignment);

      transaction.set(item.auditRef, {
        organizationId,
        actor,
        action: "LEAVE_TEMPLATE_ASSIGN",
        entityType: "EMPLOYEE",
        entityId: item.employeeId,
        source: "WEB",
        summary:
          `Assigned leave template ${data.templateCode} ` +
          `to employee ${employee.employeeCode}.`,
        before: null,
        after: {
          companyId: data.companyId,
          templateCode: data.templateCode,
          templateVersionId: versionRef.id,
          templateVersionPath: versionRef.path,
          effectiveFrom: data.effectiveFrom,
        },
        metadata: {
          employeeCode: employee.employeeCode,
        },
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    result = {
      companyId: data.companyId,
      templateCode: data.templateCode,
      effectiveFrom: data.effectiveFrom,
      assignedCount: employees.length,
      employeeIds: data.employeeIds,
    };
  });

  return result;
}
