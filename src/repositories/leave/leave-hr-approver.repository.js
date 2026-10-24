import "server-only";

import { PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions, ROLES } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { listActiveLeaveHrDelegationsForCompany } from "@/repositories/access/leave-approval-delegation.repository";

const HR_ROLES = new Set([ROLES.HR_ADMIN, ROLES.HR_OFFICER]);

function hasApprovePermission(membership) {
  const direct = Array.isArray(membership.permissions)
    ? membership.permissions
    : [];

  const denied = Array.isArray(membership.deniedPermissions)
    ? membership.deniedPermissions
    : [];

  return (
    !denied.includes(PERMISSIONS.LEAVE_APPROVE) &&
    (getRolePermissions(membership.role).includes(PERMISSIONS.LEAVE_APPROVE) ||
      direct.includes(PERMISSIONS.LEAVE_APPROVE))
  );
}

function hrRoleCanAccessCompany(membership, companyId) {
  if (!HR_ROLES.has(membership.role)) {
    return false;
  }

  try {
    return canAccessCompany(
      resolveCompanyAccess({
        role: membership.role,
        companyAccess: membership.companyAccess,
      }),
      companyId,
    );
  } catch {
    return false;
  }
}

export async function listHrLeaveApproverEmployeeIds({
  organizationId,
  companyId,
  requesterEmployeeId,
}) {
  if (!organizationId || !companyId || !requesterEmployeeId) {
    throw new ApplicationError({
      code: "LEAVE_HR_APPROVER_INPUT_INVALID",
      message: "ข้อมูลสำหรับค้นหาผู้อนุมัติ HR ไม่ครบ",
      status: 400,
    });
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const activeDelegations = await listActiveLeaveHrDelegationsForCompany({
    organizationId,
    companyId,
  });

  const delegationByEmployeeId = new Map(
    activeDelegations.map((item) => [item.delegateEmployeeId, item]),
  );

  const candidates = [];
  let cursor = null;
  let scanned = 0;

  while (true) {
    let query = organizationRef
      .collection("memberships")
      .orderBy("__name__")
      .limit(100);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();
    scanned += page.size;

    if (scanned > 1000) {
      throw new ApplicationError({
        code: "LEAVE_HR_MEMBERSHIP_LIMIT",
        message: "จำนวนสมาชิกเกินขนาดที่ค้นหาผู้อนุมัติได้",
        status: 409,
      });
    }

    for (const snapshot of page.docs) {
      const membership = snapshot.data();
      const employeeId = membership.employeeId;

      if (
        membership.isDeleted === true ||
        membership.status !== "ACTIVE" ||
        !employeeId ||
        employeeId === requesterEmployeeId ||
        membership.deniedPermissions?.includes(PERMISSIONS.LEAVE_APPROVE)
      ) {
        continue;
      }

      const delegated = delegationByEmployeeId.get(employeeId);

      const canActAsHr =
        (hrRoleCanAccessCompany(membership, companyId) &&
          hasApprovePermission(membership)) ||
        delegated?.delegateUid === snapshot.id;

      if (canActAsHr) {
        candidates.push({
          uid: snapshot.id,
          employeeId,
        });
      }
    }

    cursor = page.docs.at(-1) ?? null;

    if (page.size < 100) {
      break;
    }
  }

  const employeeSnapshots = await Promise.all(
    candidates.map(({ employeeId }) =>
      organizationRef.collection("employees").doc(employeeId).get(),
    ),
  );

  const approverEmployeeIds = candidates
    .filter(({ uid, employeeId }, index) => {
      const snapshot = employeeSnapshots[index];
      const employee = snapshot.data();

      return (
        snapshot.exists &&
        snapshot.id === employeeId &&
        employee?.isDeleted !== true &&
        employee.employmentStatus === "ACTIVE" &&
        employee.accessStatus === "ACTIVE" &&
        employee.userId === uid
      );
    })
    .map(({ employeeId }) => employeeId);

  const uniqueIds = [...new Set(approverEmployeeIds)];

  if (uniqueIds.length === 0) {
    throw new ApplicationError({
      code: "LEAVE_HR_APPROVER_NOT_CONFIGURED",
      message:
        "ยังไม่มี HR หรือผู้ทำหน้าที่ HR แทนที่รับอนุมัติใบลาของบริษัทนี้ได้",
      status: 409,
    });
  }

  return uniqueIds;
}
