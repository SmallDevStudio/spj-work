import "server-only";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { listCompanies } from "@/repositories/company/company.repository";
import { listDepartments } from "@/repositories/department/organization-structure.repository";
import { canAccessCompany } from "@/lib/auth/company-access";
import { PERMISSIONS } from "@/constants/permissions";

const MAX_REQUESTS = 500;
const MAX_TEAM_MEMBERS = 150;

function parseMonth(month) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_MONTH_INVALID",
      message: "เดือนที่ขอดูไม่ถูกต้อง",
      status: 400,
    });
  }

  const [year, monthNumber] = month.split("-").map(Number);

  if (year < 2000 || year > 2100) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_MONTH_INVALID",
      message: "ปีที่ขอดูไม่ถูกต้อง",
      status: 400,
    });
  }

  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  return {
    startDate: `${month}-01`,
    endDate: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export async function readTeamLeaveCalendar({ currentSession, month }) {
  const { startDate, endDate } = parseMonth(month);

  const organizationId = currentSession.access.organization.id;
  const employeeId = currentSession.access.membership.employeeId;
  const userId = currentSession.identity.uid;
  const canViewAll = currentSession.access.permissions.includes(PERMISSIONS.LEAVE_READ_ALL);

  if (!employeeId) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_EMPLOYEE_REQUIRED",
      message: "บัญชียังไม่ได้ผูกข้อมูลพนักงาน",
      status: 403,
    });
  }

  const viewer = await getEmployeeById({
    organizationId,
    employeeId,
  });

  if (
    !viewer ||
    viewer.isDeleted === true ||
    viewer.userId !== userId ||
    !viewer.companyId ||
    (!viewer.departmentId && !canViewAll)
  ) {
    // ยังไม่มีแผนกก็ไม่มีทีมให้แสดง ไม่ขยายขอบเขตไปทั้งบริษัท
    if (
      viewer &&
      viewer.isDeleted !== true &&
      viewer.userId === userId &&
      viewer.companyId &&
      !viewer.departmentId
    ) {
      return [];
    }

    throw new ApplicationError({
      code: "LEAVE_CALENDAR_EMPLOYEE_INVALID",
      message: "ข้อมูลพนักงานยังไม่พร้อมแสดงปฏิทินทีม",
      status: 403,
    });
  }

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyIds = canViewAll
    ? (await listCompanies({ organizationId, limit: 100 }))
        .filter((company) => canAccessCompany(currentSession.access.membership.companyAccess, company.id))
        .map((company) => company.id)
    : [viewer.companyId];
  const snapshots = await Promise.all(companyIds.map((companyId) => organizationRef
    .collection("leaveRequests")
    .where("companyId", "==", companyId)
    .where("status", "==", "APPROVED")
    .where("endDate", ">=", startDate)
    .where("startDate", "<=", endDate)
    .limit(MAX_REQUESTS + 1)
    .get()));

  if (snapshots.reduce((total, snapshot) => total + snapshot.size, 0) > MAX_REQUESTS) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_TOO_MANY_REQUESTS",
      message: "รายการในช่วงเดือนนี้มีจำนวนมาก กรุณาติดต่อผู้ดูแลระบบ",
      status: 409,
    });
  }

  const requests = snapshots.flatMap((snapshot) => snapshot.docs)
    .map((document) => ({
      id: document.id,
      ...document.data(),
    }))
    .filter(
      (request) =>
        request.isDeleted !== true &&
        request.employeeId !== employeeId &&
        companyIds.includes(request.companyId) &&
        request.status === "APPROVED",
    );

  const teamEmployeeIds = [
    ...new Set(requests.map((request) => request.employeeId)),
  ].filter(
    (id) =>
      typeof id === "string" &&
      id.length > 0 &&
      id.length <= 128 &&
      !id.includes("/"),
  );

  if (teamEmployeeIds.length > MAX_TEAM_MEMBERS) {
    throw new ApplicationError({
      code: "LEAVE_CALENDAR_TEAM_TOO_LARGE",
      message: "จำนวนพนักงานในปฏิทินเดือนนี้เกินขนาดที่รองรับ",
      status: 409,
    });
  }

  const employeeSnapshots = await Promise.all(
    teamEmployeeIds.map((id) =>
      organizationRef.collection("employees").doc(id).get(),
    ),
  );

  const visibleEmployees = new Map(
    employeeSnapshots
      .filter((employee) => {
        const data = employee.data();

        return (
          employee.exists &&
          data?.isDeleted !== true &&
          companyIds.includes(data?.companyId) &&
          (canViewAll ? Boolean(data?.departmentId) : data?.departmentId === viewer.departmentId)
        );
      })
      .map((employee) => {
        const data = employee.data();

        return [
          employee.id,
          {
            firstName:
              typeof data.firstName === "string" ? data.firstName.trim() : "",
          departmentId: data.departmentId,
          },
        ];
      }),
  );

  const departments = canViewAll ? await listDepartments({ organizationId, limit: 100 }) : [];
  const departmentNames = new Map(departments.map((department) => [department.id, department.nameTh]));

  return requests.flatMap((request) => {
    const colleague = visibleEmployees.get(request.employeeId);

    if (
      !colleague?.firstName ||
      typeof request.startDate !== "string" ||
      typeof request.endDate !== "string"
    ) {
      return [];
    }

    // ห้ามเพิ่ม leaveTypeCode, reason, comment, approval หรือ status
    // ลงในผลลัพธ์นี้
    return [
      {
        name: colleague.firstName,
        startDate: request.startDate,
        endDate: request.endDate,
        ...(canViewAll ? { departmentId: colleague.departmentId, departmentName: departmentNames.get(colleague.departmentId) ?? "แผนก" } : {}),
      },
    ];
  });
}
