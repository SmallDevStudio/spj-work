import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
  readJsonRequest,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import {
  revokeLeaveHrDelegation,
  saveLeaveHrDelegation,
} from "@/repositories/leave/leave-hr-delegation-write.repository";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

function actorFromSession(session) {
  return {
    uid: session.identity.uid,
    email: session.identity.email,
  };
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const input = await readJsonRequest(request);

    const item = await saveLeaveHrDelegation({
      organizationId: session.access.organization.id,
      companyId: input?.companyId,
      delegateEmployeeId: input?.delegateEmployeeId,
      effectiveFrom: input?.effectiveFrom,
      effectiveTo: input?.effectiveTo,
      actor: actorFromSession(session),
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}

export async function DELETE(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const input = await readJsonRequest(request);

    const item = await revokeLeaveHrDelegation({
      organizationId: session.access.organization.id,
      companyId: input?.companyId,
      delegateEmployeeId: input?.delegateEmployeeId,
      actor: actorFromSession(session),
    });

    return createSuccessResponse({ item });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}

export async function GET(request) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_WORKFLOW_MANAGE);

    const companyId = new URL(request.url).searchParams.get("companyId");

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

    const snapshot = await adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id)
      .collection("leaveHrDelegations")
      .where("companyId", "==", companyId)
      .limit(501)
      .get();

    if (snapshot.size > 500) {
      throw new ApplicationError({
        code: "LEAVE_DELEGATION_LIST_LIMIT",
        message: "จำนวนรายการมอบหมายเกินขนาดที่หน้านี้รองรับ",
        status: 409,
      });
    }

    const items = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        companyId: doc.data().companyId,
        delegateEmployeeId: doc.data().delegateEmployeeId,
        effectiveFrom: doc.data().effectiveFrom,
        effectiveTo: doc.data().effectiveTo,
        status: doc.data().status,
      }))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));

    return createSuccessResponse({ items });
  } catch (error) {
    return createApiErrorResponse(error, "Leave HR Delegation API");
  }
}
