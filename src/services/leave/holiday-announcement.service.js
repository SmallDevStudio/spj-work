import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { getCompanyById } from "@/repositories/company/company.repository";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getLeaveCalendarYear } from "@/repositories/leave/leave-calendar-query.repository";

export async function getHolidayAnnouncement({ currentSession, year, companyId, executiveEmployeeId }) {
  if (!currentSession.access.permissions.includes(PERMISSIONS.HOLIDAY_MANAGE)) {
    throw new ApplicationError({ code: "HOLIDAY_MANAGE_DENIED", message: "ไม่มีสิทธิ์พิมพ์ประกาศ", status: 403 });
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100 ||
      typeof companyId !== "string" || !companyId || companyId.includes("/") ||
      typeof executiveEmployeeId !== "string" || !executiveEmployeeId || executiveEmployeeId.includes("/")) {
    throw new ApplicationError({ code: "HOLIDAY_PRINT_INVALID", message: "กรุณาเลือกปี บริษัท และผู้บริหาร", status: 400 });
  }
  const globalCalendarAccess = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR_ADMIN]
    .includes(currentSession.access.membership.role) &&
    currentSession.access.permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL);
  if (!globalCalendarAccess && !canAccessCompany(currentSession.access.membership.companyAccess, companyId)) {
    throw new ApplicationError({ code: "HOLIDAY_COMPANY_DENIED", message: "ไม่มีสิทธิ์บริษัทนี้", status: 403 });
  }

  const organizationId = currentSession.access.organization.id;
  const [calendar, company, executive] = await Promise.all([
    getLeaveCalendarYear({ organizationId, year }),
    getCompanyById({ organizationId, companyId }),
    getEmployeeById({ organizationId, employeeId: executiveEmployeeId }),
  ]);
  if (!company || calendar?.status !== "PUBLISHED") {
    throw new ApplicationError({ code: "HOLIDAY_PRINT_NOT_READY", message: "ต้องเผยแพร่ปฏิทินก่อนพิมพ์ประกาศ", status: 409 });
  }
  if (!executive || executive.isDeleted === true || executive.employmentStatus !== "ACTIVE" ||
      !executive.companyId || (!globalCalendarAccess &&
        !canAccessCompany(currentSession.access.membership.companyAccess, executive.companyId)) ||
      ![executive.firstName, executive.lastName, executive.displayName].some(Boolean)) {
    throw new ApplicationError({ code: "HOLIDAY_EXECUTIVE_INVALID", message: "ไม่พบผู้บริหารที่ใช้งานได้ในสิทธิ์ของคุณ", status: 409 });
  }

  return {
    year,
    revision: calendar.revision,
    company: { code: company.code, name: company.nameTh, logoUrl: company.logoUrl ?? null },
    executive: {
      id: executive.id,
      name: [executive.firstName, executive.lastName].filter(Boolean).join(" ") || executive.displayName,
      positionTitle: executive.positionTitle ?? null,
    },
    holidays: calendar.holidays.map(({ date, nameTh }) => ({ date, nameTh })),
  };
}

export async function prepareHolidayAnnouncement({ currentSession, year, companyId, executiveEmployeeId, expectedRevision }) {
  const item = await getHolidayAnnouncement({ currentSession, year, companyId, executiveEmployeeId });
  if (item.revision !== expectedRevision) {
    throw new ApplicationError({ code: "HOLIDAY_PRINT_REVISION_CHANGED", message: "ปฏิทินเปลี่ยนแปลง กรุณาเปิดตัวอย่างใหม่", status: 409 });
  }

  const organizationId = currentSession.access.organization.id;

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
    summary: `Requested print of holiday announcement for ${item.company.code} / ${year}`,
    after: { companyId, executiveEmployeeId, year, revision: item.revision, holidayCount: item.holidays.length },
    createdAt: FieldValue.serverTimestamp(),
  });

  return item;
}
