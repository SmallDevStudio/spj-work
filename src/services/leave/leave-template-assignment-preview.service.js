import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { leaveTemplateAssignmentSchema } from "@/modules/leave/leave-template-assignment.schema";

export async function previewLeaveTemplateAssignment({
  currentSession,
  input,
}) {
  const parsed = leaveTemplateAssignmentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลการมอบ Leave Template ไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const data = parsed.data;

  if (
    !canAccessCompany(
      currentSession.access.membership.companyAccess,
      data.companyId,
    )
  ) {
    throw new ApplicationError({
      code: "LEAVE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์จัดการสิทธิ์ลาของบริษัทนี้",
      status: 403,
    });
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(currentSession.access.organization.id);

  const companyRef = organizationRef
    .collection("companies")
    .doc(data.companyId);

  const sharedTemplateRef = organizationRef
    .collection("leaveTemplates")
    .doc(data.templateCode);

  const legacyTemplateRef = companyRef
    .collection("leaveTemplates")
    .doc(data.templateCode);

  const [companySnapshot, sharedTemplateSnapshot, legacyTemplateSnapshot] =
    await Promise.all([
      companyRef.get(),
      sharedTemplateRef.get(),
      legacyTemplateRef.get(),
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

  const versionSnapshot = await versionRef.get();
  const version = versionSnapshot.exists ? versionSnapshot.data() : null;

  if (
    !version ||
    (templateSnapshot.ref.path === legacyTemplateRef.path &&
      version.companyId !== data.companyId) ||
    version.code !== data.templateCode ||
    version.status !== "ACTIVE" ||
    version.effectiveFrom > data.effectiveFrom
  ) {
    throw new ApplicationError({
      code: "LEAVE_TEMPLATE_VERSION_INVALID",
      message: "Revision ของ Leave Template ไม่ตรงกับวันที่มอบสิทธิ์",
      status: 409,
    });
  }

  const rows = await Promise.all(
    data.employeeIds.map(async (employeeId) => {
      const employeeRef = organizationRef
        .collection("employees")
        .doc(employeeId);

      const assignmentRef = employeeRef
        .collection("leaveTemplateAssignments")
        .doc(data.effectiveFrom);

      const [employeeSnapshot, assignmentSnapshot] = await Promise.all([
        employeeRef.get(),
        assignmentRef.get(),
      ]);

      const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;

      if (!employee || employee.isDeleted === true) {
        return {
          employeeId,
          eligible: false,
          issue: "ไม่พบพนักงาน",
        };
      }

      if (employee.companyId !== data.companyId) {
        return {
          employeeId,
          eligible: false,
          issue: "พนักงานไม่ได้สังกัดบริษัทที่เลือก",
        };
      }

      if (assignmentSnapshot.exists) {
        return {
          employeeId,
          employeeCode: employee.employeeCode,
          displayName: employee.displayName,
          eligible: false,
          issue: "มีการมอบ Leave Template ในวันที่นี้แล้ว",
        };
      }

      return {
        employeeId,
        employeeCode: employee.employeeCode,
        displayName: employee.displayName,
        eligible: true,
        issue: null,
      };
    }),
  );

  return {
    companyId: data.companyId,
    templateCode: data.templateCode,
    templateName: template.nameTh,
    templateVersionId: versionRef.id,
    templateVersionPath: versionRef.path,
    effectiveFrom: data.effectiveFrom,
    eligibleCount: rows.filter((row) => row.eligible).length,
    blockedCount: rows.filter((row) => !row.eligible).length,
    rows,
  };
}
