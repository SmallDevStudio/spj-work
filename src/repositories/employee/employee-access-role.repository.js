import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions, ROLES } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

const ASSIGNABLE_ROLES = new Set([
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.APPROVER,
  ROLES.HR_OFFICER,
  ROLES.HR_ADMIN,
  ROLES.IT_OFFICER,
  ROLES.IT_ADMIN,
  ROLES.ADMIN,
]);

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

function hasRoleManagePermission(membership) {
  const denied = Array.isArray(membership.deniedPermissions)
    ? membership.deniedPermissions
    : [];

  const direct = Array.isArray(membership.permissions)
    ? membership.permissions
    : [];

  return (
    !denied.includes(PERMISSIONS.ROLE_MANAGE) &&
    (getRolePermissions(membership.role).includes(PERMISSIONS.ROLE_MANAGE) ||
      direct.includes(PERMISSIONS.ROLE_MANAGE))
  );
}

export async function setEmployeeAccessRole({
  organizationId,
  employeeId,
  role,
  actor,
}) {
  if (
    typeof employeeId !== "string" ||
    !employeeId ||
    employeeId.length > 128 ||
    employeeId.includes("/")
  ) {
    fail("EMPLOYEE_ID_INVALID", "รหัสพนักงานไม่ถูกต้อง", 400);
  }

  if (!ASSIGNABLE_ROLES.has(role)) {
    fail("EMPLOYEE_ACCESS_ROLE_INVALID", "ไม่รองรับสิทธิ์ในระบบที่เลือก", 400);
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const actorMembershipRef = organizationRef
    .collection("memberships")
    .doc(actor.uid);

  return adminFirestore.runTransaction(async (transaction) => {
    const [employeeSnapshot, actorSnapshot] = await Promise.all([
      transaction.get(employeeRef),
      transaction.get(actorMembershipRef),
    ]);

    const employee = employeeSnapshot.data();
    const actorMembership = actorSnapshot.data();

    if (
      !employeeSnapshot.exists ||
      employee?.isDeleted === true ||
      !employee.companyId
    ) {
      fail("EMPLOYEE_NOT_FOUND", "ไม่พบพนักงานที่กำหนดบริษัทแล้ว", 404);
    }

    if (
      !actorSnapshot.exists ||
      actorMembership?.isDeleted === true ||
      actorMembership.status !== "ACTIVE" ||
      !hasRoleManagePermission(actorMembership)
    ) {
      fail(
        "EMPLOYEE_ROLE_MANAGE_DENIED",
        "ไม่มีสิทธิ์กำหนด role ให้พนักงาน",
        403,
      );
    }

    let actorCompanyAccess;

    try {
      actorCompanyAccess = resolveCompanyAccess({
        role: actorMembership.role,
        companyAccess: actorMembership.companyAccess,
      });
    } catch {
      fail(
        "EMPLOYEE_COMPANY_ACCESS_DENIED",
        "สิทธิ์บริษัทของผู้ดำเนินการไม่ถูกต้อง",
        403,
      );
    }

    if (!canAccessCompany(actorCompanyAccess, employee.companyId)) {
      fail(
        "EMPLOYEE_COMPANY_ACCESS_DENIED",
        "ไม่มีสิทธิ์จัดการพนักงานของบริษัทนี้",
        403,
      );
    }

    if (employee.userId === actor.uid) {
      fail(
        "EMPLOYEE_SELF_ROLE_CHANGE_DENIED",
        "ไม่สามารถเปลี่ยน role ของบัญชีตัวเองจากหน้านี้",
        403,
      );
    }

    const membershipRef = employee.userId
      ? organizationRef.collection("memberships").doc(employee.userId)
      : null;

    const membershipSnapshot = membershipRef
      ? await transaction.get(membershipRef)
      : null;

    const membership = membershipSnapshot?.data() ?? null;

    if (membershipRef) {
      if (
        !membershipSnapshot.exists ||
        membership.isDeleted === true ||
        membership.status !== "ACTIVE" ||
        membership.employeeId !== employeeId
      ) {
        fail(
          "EMPLOYEE_MEMBERSHIP_INVALID",
          "บัญชีที่เชื่อมกับพนักงานไม่ถูกต้อง กรุณาตรวจสอบก่อนเปลี่ยน role",
        );
      }

      if (membership.role === ROLES.SUPERADMIN) {
        fail(
          "SUPERADMIN_ROLE_CHANGE_DENIED",
          "ไม่สามารถเปลี่ยน SUPERADMIN ผ่านรายการพนักงาน",
          403,
        );
      }

      let targetCompanyAccess;

      try {
        targetCompanyAccess = resolveCompanyAccess({
          role: membership.role,
          companyAccess: membership.companyAccess,
        });
      } catch {
        fail(
          "EMPLOYEE_COMPANY_ACCESS_INVALID",
          "สิทธิ์บริษัทของพนักงานไม่ถูกต้อง",
        );
      }

      if (!canAccessCompany(targetCompanyAccess, employee.companyId)) {
        fail(
          "EMPLOYEE_HOME_COMPANY_ACCESS_REQUIRED",
          "พนักงานต้องเข้าถึงบริษัทที่ตนสังกัดก่อนเปลี่ยน role",
        );
      }
    }

    const oldRole = membership?.role ?? employee.role ?? null;
    const auditRef = organizationRef.collection("auditLogs").doc();

    transaction.update(employeeRef, {
      role,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    if (membershipRef) {
      transaction.update(membershipRef, {
        role,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });
    }

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: actorMembership.role,
      },
      action: "EMPLOYEE_ACCESS_ROLE_UPDATE",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      source: "WEB",
      summary: `Changed employee access role to ${role}.`,
      before: { role: oldRole },
      after: {
        role,
        membershipUpdated: Boolean(membershipRef),
      },
      metadata: {
        companyId: employee.companyId,
        targetUid: employee.userId ?? null,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      employeeId,
      role,
      membershipUpdated: Boolean(membershipRef),
    };
  });
}
