import "server-only";

import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions } from "@/constants/roles";
import {
  canAccessCompany,
  resolveCompanyAccess,
} from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

function validId(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    !value.includes("/")
  );
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function delegationId(companyId, employeeId) {
  return createHash("sha256")
    .update(`${companyId}\0${employeeId}`, "utf8")
    .digest("hex");
}

function hasWorkflowPermission(membership) {
  const direct = Array.isArray(membership.permissions)
    ? membership.permissions
    : [];

  const denied = Array.isArray(membership.deniedPermissions)
    ? membership.deniedPermissions
    : [];

  return (
    !denied.includes(PERMISSIONS.LEAVE_WORKFLOW_MANAGE) &&
    (getRolePermissions(membership.role).includes(
      PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
    ) ||
      direct.includes(PERMISSIONS.LEAVE_WORKFLOW_MANAGE))
  );
}

function requireActorAccess(membership, companyId) {
  if (
    !membership ||
    membership.isDeleted === true ||
    membership.status !== "ACTIVE" ||
    !hasWorkflowPermission(membership)
  ) {
    fail(
      "LEAVE_DELEGATION_PERMISSION_DENIED",
      "ไม่มีสิทธิ์จัดผู้ทำหน้าที่ HR แทน",
      403,
    );
  }

  let companyAccess;

  try {
    companyAccess = resolveCompanyAccess({
      role: membership.role,
      companyAccess: membership.companyAccess,
    });
  } catch {
    fail(
      "LEAVE_DELEGATION_COMPANY_ACCESS_DENIED",
      "สิทธิ์บริษัทของผู้ดำเนินการไม่ถูกต้อง",
      403,
    );
  }

  if (!canAccessCompany(companyAccess, companyId)) {
    fail(
      "LEAVE_DELEGATION_COMPANY_ACCESS_DENIED",
      "ไม่มีสิทธิ์จัดงานลาของบริษัทนี้",
      403,
    );
  }
}

export async function saveLeaveHrDelegation({
  organizationId,
  companyId,
  delegateEmployeeId,
  effectiveFrom,
  effectiveTo,
  actor,
}) {
  if (!validId(companyId) || !validId(delegateEmployeeId)) {
    fail("LEAVE_DELEGATION_INPUT_INVALID", "บริษัทหรือพนักงานไม่ถูกต้อง", 400);
  }

  if (
    !validDate(effectiveFrom) ||
    !validDate(effectiveTo) ||
    effectiveTo < effectiveFrom
  ) {
    fail("LEAVE_DELEGATION_DATES_INVALID", "ช่วงวันที่มอบหมายไม่ถูกต้อง", 400);
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef.collection("companies").doc(companyId);

  const employeeRef = organizationRef
    .collection("employees")
    .doc(delegateEmployeeId);

  const actorRef = organizationRef.collection("memberships").doc(actor.uid);

  const delegationRef = organizationRef
    .collection("leaveHrDelegations")
    .doc(delegationId(companyId, delegateEmployeeId));

  return adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, employeeSnapshot, actorSnapshot, previousSnapshot] =
      await Promise.all([
        transaction.get(companyRef),
        transaction.get(employeeRef),
        transaction.get(actorRef),
        transaction.get(delegationRef),
      ]);

    const company = companySnapshot.data();
    const employee = employeeSnapshot.data();
    const actorMembership = actorSnapshot.data();

    requireActorAccess(actorMembership, companyId);

    if (
      !companySnapshot.exists ||
      company?.isDeleted === true ||
      company.status !== "ACTIVE"
    ) {
      fail("LEAVE_DELEGATION_COMPANY_INACTIVE", "บริษัทนี้ไม่เปิดใช้งาน", 400);
    }

    if (
      !employeeSnapshot.exists ||
      employee?.isDeleted === true ||
      employee.employmentStatus !== "ACTIVE" ||
      employee.accessStatus !== "ACTIVE" ||
      !validId(employee.userId)
    ) {
      fail(
        "LEAVE_DELEGATE_EMPLOYEE_INACTIVE",
        "พนักงานผู้ทำแทนต้องเปิดใช้งานและเชื่อมบัญชีแล้ว",
        400,
      );
    }

    const delegateMembershipRef = organizationRef
      .collection("memberships")
      .doc(employee.userId);

    const delegateMembershipSnapshot = await transaction.get(
      delegateMembershipRef,
    );

    const delegateMembership = delegateMembershipSnapshot.data();

    if (
      !delegateMembershipSnapshot.exists ||
      delegateMembership?.isDeleted === true ||
      delegateMembership.status !== "ACTIVE" ||
      delegateMembership.employeeId !== delegateEmployeeId ||
      delegateMembership.deniedPermissions?.includes(PERMISSIONS.LEAVE_APPROVE)
    ) {
      fail(
        "LEAVE_DELEGATE_ACCOUNT_INVALID",
        "บัญชีผู้ทำแทนไม่พร้อมรับสิทธิ์อนุมัติลา",
        400,
      );
    }

    const previous = previousSnapshot.exists ? previousSnapshot.data() : null;

    const auditRef = organizationRef.collection("auditLogs").doc();

    transaction.set(
      delegationRef,
      {
        organizationId,
        companyId,
        delegateEmployeeId,
        delegateUid: employee.userId,
        effectiveFrom,
        effectiveTo,
        status: "ACTIVE",
        isDeleted: false,
        revision: (previous?.revision ?? 0) + 1,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
        ...(!previous
          ? {
              createdAt: FieldValue.serverTimestamp(),
              createdBy: actor.uid,
            }
          : {}),
      },
      { merge: true },
    );

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: actorMembership.role,
      },
      action: "LEAVE_HR_DELEGATION_SAVE",
      entityType: "LEAVE_HR_DELEGATION",
      entityId: delegationRef.id,
      source: "WEB",
      summary: `Assigned employee ${delegateEmployeeId} to HR leave approval for company ${companyId}.`,
      before: previous
        ? {
            status: previous.status,
            effectiveFrom: previous.effectiveFrom,
            effectiveTo: previous.effectiveTo,
          }
        : null,
      after: {
        status: "ACTIVE",
        effectiveFrom,
        effectiveTo,
      },
      metadata: { companyId, delegateEmployeeId },
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      id: delegationRef.id,
      companyId,
      delegateEmployeeId,
      effectiveFrom,
      effectiveTo,
      status: "ACTIVE",
    };
  });
}

export async function revokeLeaveHrDelegation({
  organizationId,
  companyId,
  delegateEmployeeId,
  actor,
}) {
  if (!validId(companyId) || !validId(delegateEmployeeId)) {
    fail("LEAVE_DELEGATION_INPUT_INVALID", "บริษัทหรือพนักงานไม่ถูกต้อง", 400);
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const actorRef = organizationRef.collection("memberships").doc(actor.uid);

  const delegationRef = organizationRef
    .collection("leaveHrDelegations")
    .doc(delegationId(companyId, delegateEmployeeId));

  return adminFirestore.runTransaction(async (transaction) => {
    const [actorSnapshot, delegationSnapshot] = await Promise.all([
      transaction.get(actorRef),
      transaction.get(delegationRef),
    ]);

    const actorMembership = actorSnapshot.data();
    const delegation = delegationSnapshot.data();

    requireActorAccess(actorMembership, companyId);

    if (
      !delegationSnapshot.exists ||
      delegation?.organizationId !== organizationId ||
      delegation.companyId !== companyId ||
      delegation.delegateEmployeeId !== delegateEmployeeId ||
      delegation.status !== "ACTIVE"
    ) {
      fail("LEAVE_DELEGATION_NOT_ACTIVE", "ไม่พบการมอบหมายที่เปิดใช้งาน", 404);
    }

    const auditRef = organizationRef.collection("auditLogs").doc();

    transaction.update(delegationRef, {
      status: "REVOKED",
      revision: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditRef, {
      organizationId,
      actor: {
        uid: actor.uid,
        email: actor.email ?? null,
        role: actorMembership.role,
      },
      action: "LEAVE_HR_DELEGATION_REVOKE",
      entityType: "LEAVE_HR_DELEGATION",
      entityId: delegationRef.id,
      source: "WEB",
      summary: `Revoked HR leave delegation for employee ${delegateEmployeeId}.`,
      before: {
        status: delegation.status,
        effectiveFrom: delegation.effectiveFrom,
        effectiveTo: delegation.effectiveTo,
      },
      after: { status: "REVOKED" },
      metadata: { companyId, delegateEmployeeId },
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      id: delegationRef.id,
      status: "REVOKED",
    };
  });
}
