import "server-only";

import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { companyAccessUpdateSchema } from "@/modules/auth/company-access.schema";
import {
  getMembershipCompanyAccess,
  saveMembershipCompanyAccess,
} from "@/repositories/auth/company-access.repository";

function requireSuperadmin(currentSession) {
  if (currentSession.access.membership.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "COMPANY_ACCESS_MANAGE_DENIED",
      message: "เฉพาะ SUPERADMIN ที่กำหนดสิทธิ์รายบริษัทได้",
      status: 403,
    });
  }
}

function requireValidUid(uid) {
  if (
    typeof uid !== "string" ||
    !uid.trim() ||
    uid.length > 128 ||
    uid.includes("/")
  ) {
    throw new ApplicationError({
      code: "INVALID_USER_ID",
      message: "รหัสผู้ใช้งานไม่ถูกต้อง",
      status: 400,
    });
  }

  return uid.trim();
}

export async function getUserCompanyAccess({ currentSession, targetUid }) {
  requireSuperadmin(currentSession);

  return getMembershipCompanyAccess({
    organizationId: currentSession.access.organization.id,
    uid: requireValidUid(targetUid),
  });
}

export async function updateUserCompanyAccess({
  currentSession,
  targetUid,
  input,
}) {
  requireSuperadmin(currentSession);

  const uid = requireValidUid(targetUid);

  if (uid === currentSession.identity.uid) {
    throw new ApplicationError({
      code: "SUPERADMIN_SCOPE_FIXED",
      message: "SUPERADMIN เห็นทุกบริษัทโดยระบบ ไม่ต้องแก้ไขสิทธิ์ของตนเอง",
      status: 400,
    });
  }

  const parsed = companyAccessUpdateSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลสิทธิ์รายบริษัทไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  const companyAccess = {
    scope: parsed.data.scope,
    companyIds: parsed.data.scope === "ALL" ? [] : parsed.data.companyIds,
  };

  return saveMembershipCompanyAccess({
    organizationId: currentSession.access.organization.id,
    targetUid: uid,
    companyAccess,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
  });
}
