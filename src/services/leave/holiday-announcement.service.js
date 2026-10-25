import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { getCompanyById } from "@/repositories/company/company.repository";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";

export async function prepareHolidayAnnouncement({ currentSession, year, companyId }) {
  if (!currentSession.access.permissions.includes(PERMISSIONS.HOLIDAY_MANAGE)) {
    throw new ApplicationError({ code: "HOLIDAY_MANAGE_DENIED", message: "ไม่มีสิทธิ์พิมพ์ประกาศ", status: 403 });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100 ||
      typeof companyId !== "string" || !companyId || companyId.includes("/")) {
    throw new ApplicationError({ code: "HOLIDAY_PRINT_INVALID", message: "กรุณาเลือกปีและบริษัท", status: 400 });
  }
  const globalCalendarAccess = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR_ADMIN]
    .includes(currentSession.access.membership.role) &&
    currentSession.access.permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL);
  if (!globalCalendarAccess && !canAccessCompany(currentSession.access.membership.companyAccess, companyId)) {
    throw new ApplicationError({ code: "HOLIDAY_COMPANY_DENIED", message: "ไม่มีสิทธิ์บริษัทนี้", status: 403 });
  }

  const organizationId = currentSession.access.organization.id;
  const [calendar, company] = await Promise.all([
    getLeaveCalendarYear({ organizationId, year }),
    getCompanyById({ organizationId, companyId }),
  ]);
  if (!company || calendar?.status !== "PUBLISHED") {
    throw new ApplicationError({ code: "HOLIDAY_PRINT_NOT_READY", message: "ต้องเผยแพร่ปฏิทินก่อนพิมพ์ประกาศ", status: 409 });
  }

  const auditRef = adminFirestore.collection("organizations").doc(organizationId)
    .collection("auditLogs").doc();
  await auditRef.set({
    organizationId,
    actor: {
      uid: currentSession.identity.uid,
      email: currentSession.identity.email,
      role: currentSession.access.membership.role,
    },
    action: "LEAVE_CALENDAR_PRINT",
    entityType: "LEAVE_CALENDAR_YEAR",
    entityId: String(year),
    source: "WEB",
    summary: `Prepared holiday announcement for ${company.code} / ${year}`,
    after: { companyId, year, revision: calendar.revision, holidayCount: calendar.holidays.length },
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    year,
    revision: calendar.revision,
    company: { code: company.code, name: company.nameTh, logoUrl: company.logoUrl ?? null },
    holidays: calendar.holidays.map(({ date, nameTh }) => ({ date, nameTh })),
  };
}
