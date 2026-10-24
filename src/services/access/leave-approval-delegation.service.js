import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  listLeaveApprovalDelegationsForCompany,
} from "@/repositories/access/leave-approval-delegation.repository";
import {
  revokeLeaveHrDelegation,
  saveLeaveHrDelegation,
} from "@/repositories/access/leave-approval-delegation-write.repository";

function actor(session) {
  return { uid: session.identity.uid, email: session.identity.email };
}

export async function getLeaveApprovalDelegations(session, companyId) {
  if (!companyId || companyId.length > 128 || companyId.includes("/")) {
    throw new ApplicationError({
      code: "LEAVE_DELEGATION_COMPANY_REQUIRED",
      message: "กรุณาเลือกบริษัท",
      status: 400,
    });
  }

  if (!canAccessCompany(session.access.membership.companyAccess, companyId)) {
    throw new ApplicationError({
      code: "LEAVE_DELEGATION_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์ดูการมอบหมายของบริษัทนี้",
      status: 403,
    });
  }

  return listLeaveApprovalDelegationsForCompany({
    organizationId: session.access.organization.id,
    companyId,
  });
}

export function createLeaveApprovalDelegation(session, input) {
  return saveLeaveHrDelegation({
    organizationId: session.access.organization.id,
    companyId: input?.companyId,
    delegateEmployeeId: input?.delegateEmployeeId,
    effectiveFrom: input?.effectiveFrom,
    effectiveTo: input?.effectiveTo,
    actor: actor(session),
  });
}

export function removeLeaveApprovalDelegation(session, input) {
  return revokeLeaveHrDelegation({
    organizationId: session.access.organization.id,
    companyId: input?.companyId,
    delegateEmployeeId: input?.delegateEmployeeId,
    actor: actor(session),
  });
}
