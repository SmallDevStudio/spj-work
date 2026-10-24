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
import { listActiveLeaveHrDelegations } from "@/repositories/leave/leave-hr-delegation.repository";

const MAX_TRANSFER = 50;

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

function canManage(membership, companyId) {
  if (
    !membership ||
    membership.status !== "ACTIVE" ||
    membership.isDeleted === true ||
    membership.deniedPermissions?.includes(PERMISSIONS.LEAVE_WORKFLOW_MANAGE)
  ) {
    return false;
  }

  const rolePermissions = getRolePermissions(membership.role);
  const directPermissions = Array.isArray(membership.permissions)
    ? membership.permissions
    : [];

  if (
    !rolePermissions.includes(PERMISSIONS.LEAVE_WORKFLOW_MANAGE) &&
    !directPermissions.includes(PERMISSIONS.LEAVE_WORKFLOW_MANAGE)
  ) {
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

function pendingHrStep(request) {
  if (
    request.status !== "PENDING_APPROVAL" ||
    request.approval?.mode !== "PARALLEL_ALL"
  ) {
    return null;
  }

  return (
    request.approval.steps?.find(
      (step) => step.key === "HR" && step.status === "PENDING",
    ) ?? null
  );
}

export async function previewLeaveHrTakeover({
  organizationId,
  companyId,
  oldEmployeeId,
  companyAccess,
}) {
  if (!validId(companyId) || !validId(oldEmployeeId)) {
    fail("LEAVE_TAKEOVER_INPUT_INVALID", "ข้อมูลโอนงานไม่ถูกต้อง", 400);
  }

  if (!canAccessCompany(companyAccess, companyId)) {
    fail(
      "LEAVE_TAKEOVER_COMPANY_DENIED",
      "ไม่มีสิทธิ์จัดงานลาของบริษัทนี้",
      403,
    );
  }

  const snapshot = await adminFirestore
    .collection("organizations")
    .doc(organizationId)
    .collection("leaveRequests")
    .where("status", "==", "PENDING_APPROVAL")
    .limit(1001)
    .get();

  if (snapshot.size > 1000) {
    fail("LEAVE_TAKEOVER_PREVIEW_LIMIT", "ใบลาค้างเกินขนาดที่ preview ได้");
  }

  const items = snapshot.docs
    .flatMap((doc) => {
      const request = doc.data();
      const hrStep = pendingHrStep(request);

      if (
        request.isDeleted === true ||
        request.companyId !== companyId ||
        !hrStep?.approverEmployeeIds?.includes(oldEmployeeId)
      ) {
        return [];
      }

      return [
        {
          id: doc.id,
          employeeCode: request.employeeCode ?? null,
          startDate: request.startDate,
          endDate: request.endDate,
          requestedDays: request.requestedDays,
          hrApproverEmployeeIds: hrStep.approverEmployeeIds,
        },
      ];
    })
    .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));

  return {
    total: items.length,
    maxPerTransfer: MAX_TRANSFER,
    items,
  };
}

export async function applyLeaveHrTakeover({
  organizationId,
  companyId,
  oldEmployeeId,
  newEmployeeId,
  requestIds,
  actor,
}) {
  if (
    !validId(companyId) ||
    !validId(oldEmployeeId) ||
    !validId(newEmployeeId) ||
    oldEmployeeId === newEmployeeId ||
    !Array.isArray(requestIds) ||
    requestIds.length === 0 ||
    requestIds.length > MAX_TRANSFER ||
    requestIds.some((id) => !validId(id)) ||
    new Set(requestIds).size !== requestIds.length
  ) {
    fail(
      "LEAVE_TAKEOVER_INPUT_INVALID",
      "เลือกใบลา 1–50 ใบและผู้รับงานคนใหม่ให้ถูกต้อง",
      400,
    );
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const actorRef = organizationRef.collection("memberships").doc(actor.uid);

  const targetEmployeeRef = organizationRef
    .collection("employees")
    .doc(newEmployeeId);

  const leaveRefs = requestIds.map((id) =>
    organizationRef.collection("leaveRequests").doc(id),
  );

  return adminFirestore.runTransaction(async (transaction) => {
    const [actorSnapshot, targetEmployeeSnapshot, ...leaveSnapshots] =
      await Promise.all([
        transaction.get(actorRef),
        transaction.get(targetEmployeeRef),
        ...leaveRefs.map((ref) => transaction.get(ref)),
      ]);

    const actorMembership = actorSnapshot.data();
    const targetEmployee = targetEmployeeSnapshot.data();

    if (!canManage(actorMembership, companyId)) {
      fail(
        "LEAVE_TAKEOVER_ACCESS_DENIED",
        "ไม่มีสิทธิ์โอนงานลาของบริษัทนี้",
        403,
      );
    }

    if (
      !targetEmployeeSnapshot.exists ||
      targetEmployee?.isDeleted === true ||
      targetEmployee.employmentStatus !== "ACTIVE" ||
      targetEmployee.accessStatus !== "ACTIVE" ||
      !validId(targetEmployee.userId)
    ) {
      fail(
        "LEAVE_TAKEOVER_TARGET_INACTIVE",
        "พนักงานผู้รับงานคนใหม่ไม่พร้อมใช้งาน",
      );
    }

    const targetMembershipRef = organizationRef
      .collection("memberships")
      .doc(targetEmployee.userId);

    const [targetMembershipSnapshot, activeDelegations] = await Promise.all([
      transaction.get(targetMembershipRef),
      listActiveLeaveHrDelegations({
        organizationId,
        employeeId: newEmployeeId,
        companyId,
        transaction,
      }),
    ]);

    const targetMembership = targetMembershipSnapshot.data();

    if (
      !targetMembershipSnapshot.exists ||
      targetMembership?.isDeleted === true ||
      targetMembership.status !== "ACTIVE" ||
      targetMembership.employeeId !== newEmployeeId ||
      targetMembership.deniedPermissions?.includes(PERMISSIONS.LEAVE_APPROVE)
    ) {
      fail(
        "LEAVE_TAKEOVER_TARGET_ACCESS_DENIED",
        "บัญชีผู้รับงานคนใหม่ไม่พร้อมอนุมัติลา",
      );
    }

    let normalHrAccess = false;

    if ([ROLES.HR_ADMIN, ROLES.HR_OFFICER].includes(targetMembership.role)) {
      try {
        normalHrAccess = canAccessCompany(
          resolveCompanyAccess({
            role: targetMembership.role,
            companyAccess: targetMembership.companyAccess,
          }),
          companyId,
        );
      } catch {
        normalHrAccess = false;
      }
    }

    const delegatedAccess = activeDelegations.some(
      (item) => item.delegateUid === targetEmployee.userId,
    );

    if (!normalHrAccess && !delegatedAccess) {
      fail(
        "LEAVE_TAKEOVER_TARGET_NOT_HR",
        "ผู้รับงานคนใหม่ยังไม่ได้รับสิทธิ์ HR หรือ delegation ของบริษัทนี้",
      );
    }

    // อ่านทุกเอกสารครบแล้ว จึงเริ่มตรวจและเขียน
    const updates = leaveSnapshots.map((snapshot, index) => {
      const request = snapshot.data();
      const hrStep = pendingHrStep(request);
      const managerStep = request?.approval?.steps?.find(
        (step) => step.key === "MANAGER",
      );

      if (
        !snapshot.exists ||
        request?.isDeleted === true ||
        request.companyId !== companyId ||
        !hrStep?.approverEmployeeIds?.includes(oldEmployeeId) ||
        !managerStep ||
        request.employeeId === newEmployeeId ||
        managerStep.approverEmployeeIds?.includes(newEmployeeId)
      ) {
        fail(
          "LEAVE_TAKEOVER_PREVIEW_STALE",
          `ใบลา ${requestIds[index]} เปลี่ยนสถานะหรือผู้รับงานแล้ว กรุณา preview ใหม่`,
        );
      }

      const previousIds = hrStep.approverEmployeeIds;

      const nextIds = [
        ...new Set([
          ...previousIds.filter((id) => id !== oldEmployeeId),
          newEmployeeId,
        ]),
      ];

      return {
        ref: leaveRefs[index],
        id: requestIds[index],
        request,
        previousIds,
        nextIds,
        steps: request.approval.steps.map((step) =>
          step.key === "HR"
            ? {
                ...step,
                approverEmployeeIds: nextIds,
              }
            : step,
        ),
      };
    });

    for (const item of updates) {
      const auditRef = organizationRef.collection("auditLogs").doc();

      const outboxRef = organizationRef.collection("notificationOutbox").doc();

      transaction.update(item.ref, {
        approval: {
          ...item.request.approval,
          steps: item.steps,
        },
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
        revision: FieldValue.increment(1),
      });

      transaction.set(auditRef, {
        organizationId,
        actor: {
          uid: actor.uid,
          email: actor.email ?? null,
          role: actorMembership.role,
        },
        action: "LEAVE_HR_APPROVER_TAKEOVER",
        entityType: "LEAVE_REQUEST",
        entityId: item.id,
        source: "WEB",
        summary: `Transferred HR approval from ${oldEmployeeId} to ${newEmployeeId}.`,
        before: {
          hrApproverEmployeeIds: item.previousIds,
        },
        after: {
          hrApproverEmployeeIds: item.nextIds,
        },
        metadata: {
          companyId,
          requesterEmployeeId: item.request.employeeId,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(outboxRef, {
        organizationId,
        companyId,
        type: "LEAVE_HR_APPROVER_REASSIGNED",
        status: "PENDING",
        leaveRequestId: item.id,
        previousApproverEmployeeIds: item.previousIds,
        newApproverEmployeeId: newEmployeeId,
        actorUid: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      transferred: updates.length,
      requestIds: updates.map((item) => item.id),
    };
  });
}
