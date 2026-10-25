import Link from "next/link";
import { notFound } from "next/navigation";

import EmployeeLeaveCalendar from "@/components/leave/EmployeeLeaveCalendar";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { requirePermission } from "@/lib/auth/authorization";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { listOwnLeaveRequests } from "@/repositories/leave/employee-leave-calendar.repository";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การลาของฉัน | SPJ Work",
};

export default async function EmployeeLeavePage({ params }) {
  const { userId } = await params;
  const currentSession = await requirePermission(PERMISSIONS.LEAVE_READ_OWN);

  if (userId !== currentSession.identity.uid) {
    notFound();
  }

  const { access } = currentSession;
  const organizationId = access.organization.id;
  const employeeId = access.membership.employeeId;

  if (!employeeId) {
    if (
      [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.HR_ADMIN, ROLES.EXECUTIVE].includes(access.membership.role) &&
      access.permissions.includes(PERMISSIONS.LEAVE_CALENDAR_READ_ALL)
    ) {
      return (
        <EmployeeLeaveCalendar
          userId={userId}
          requests={[]}
          canCreateLeave={false}
          canManageHolidays={access.permissions.includes(PERMISSIONS.HOLIDAY_MANAGE)}
        />
      );
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-7">
        <Link href="/" className="text-sm font-semibold text-sky-700 hover:underline">
          ← กลับหน้าหลัก
        </Link>
        <section className="mt-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">ยังไม่สามารถเปิดข้อมูลการลาได้</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            บัญชีของคุณยังไม่ได้ผูกกับข้อมูลพนักงาน กรุณาติดต่อ HR
            หรือผู้ดูแลระบบเพื่อตรวจสอบบัญชี
          </p>
        </section>
      </main>
    );
  }

  const employee = await getEmployeeById({
    organizationId,
    employeeId,
  });

  if (!employee || employee.isDeleted === true || employee.userId !== userId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-7">
        <Link
          href="/"
          className="text-sm font-semibold text-sky-700 hover:underline"
        >
          ← กลับหน้าหลัก
        </Link>

        <section className="mt-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            ต้องตรวจสอบการเชื่อมบัญชีพนักงาน
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Membership มีรหัสพนักงานแล้ว แต่ข้อมูล Employee
            ยังไม่เชื่อมกลับมายังบัญชีนี้อย่างถูกต้อง
            กรุณาให้ผู้ดูแลตรวจสอบก่อนแสดงข้อมูลวันลา
          </p>
        </section>
      </main>
    );
  }

  const requests = await listOwnLeaveRequests({
    organizationId,
    employeeId,
    userId,
  });

  return (
    <EmployeeLeaveCalendar userId={userId} requests={requests} canManageHolidays={access.permissions.includes(PERMISSIONS.HOLIDAY_MANAGE)} />
  );
}
