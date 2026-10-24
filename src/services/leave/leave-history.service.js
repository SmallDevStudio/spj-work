import "server-only";

import { z } from "zod";

import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { deleteLeaveRequest } from "@/repositories/leave/leave-delete.repository";
import {
  getManagedLeaveRequest,
  listLeaveHistory,
} from "@/repositories/leave/leave-history.repository";

const deletionSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
}).strict();

function requireHistoryAccess(session) {
  if (!session.access.permissions.includes(PERMISSIONS.LEAVE_READ_ALL)) {
    throw new ApplicationError({
      code: "LEAVE_HISTORY_DENIED",
      message: "ไม่มีสิทธิ์ดูประวัติการลาทั้งหมด",
      status: 403,
    });
  }
}

export function getManagedLeaveHistory({ session, cursor, includeDeleted }) {
  requireHistoryAccess(session);

  if (cursor && (cursor.length > 128 || cursor.includes("/"))) {
    throw new ApplicationError({
      code: "LEAVE_HISTORY_CURSOR_INVALID",
      message: "ตัวชี้หน้ารายการไม่ถูกต้อง",
      status: 400,
    });
  }

  const canDelete = [ROLES.SUPERADMIN, ROLES.ADMIN].includes(
    session.access.membership.role,
  );

  return listLeaveHistory({
    organizationId: session.access.organization.id,
    companyAccess: session.access.membership.companyAccess,
    cursor,
    includeDeleted: canDelete && includeDeleted === true,
  });
}

export function removeManagedLeaveRequest({ session, requestId, input }) {
  if (
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 128 ||
    requestId.includes("/")
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_ID_INVALID",
      message: "รหัสใบลาไม่ถูกต้อง",
      status: 400,
    });
  }

  const parsed = deletionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "LEAVE_DELETE_REASON_REQUIRED",
      message: "กรุณาระบุเหตุผลการลบ 3–1000 ตัวอักษร",
      status: 400,
    });
  }

  return deleteLeaveRequest({
    organizationId: session.access.organization.id,
    requestId,
    reason: parsed.data.reason,
    actor: {
      uid: session.identity.uid,
      email: session.identity.email,
    },
  });
}

export function readManagedLeaveRequest({ session, requestId }) {
  requireHistoryAccess(session);

  if (
    typeof requestId !== "string" ||
    !requestId ||
    requestId.length > 128 ||
    requestId.includes("/")
  ) {
    throw new ApplicationError({
      code: "LEAVE_REQUEST_ID_INVALID",
      message: "รหัสใบลาไม่ถูกต้อง",
      status: 400,
    });
  }

  return getManagedLeaveRequest({
    organizationId: session.access.organization.id,
    companyAccess: session.access.membership.companyAccess,
    requestId,
    includeDeleted: [ROLES.SUPERADMIN, ROLES.ADMIN].includes(
      session.access.membership.role,
    ),
  });
}
