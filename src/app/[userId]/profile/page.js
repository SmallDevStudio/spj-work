import Link from "next/link";
import { notFound } from "next/navigation";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getDepartmentById } from "@/repositories/department/organization-structure.repository";
import { getCompanyById } from "@/repositories/company/company.repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อมูลของฉัน | SPJ Work" };

export default async function EmployeeProfilePage({ params }) {
  const { userId } = await params;
  const session = await requirePermission(PERMISSIONS.EMPLOYEE_READ_OWN);
  if (session.identity.uid !== userId) notFound();

  const organizationId = session.access.organization.id;
  const employeeId = session.access.membership.employeeId;
  const employee = employeeId ? await getEmployeeById({ organizationId, employeeId }) : null;
  const linked = employee && employee.isDeleted !== true && employee.userId === userId;
  const [company, department] = linked ? await Promise.all([
    employee.companyId ? getCompanyById({ organizationId, companyId: employee.companyId }) : null,
    employee.departmentId ? getDepartmentById({ organizationId, departmentId: employee.departmentId }) : null,
  ]) : [null, null];

  const details = linked ? [
    ["รหัสพนักงาน", employee.employeeCode],
    ["ชื่อ - นามสกุล", [employee.firstName, employee.lastName].filter(Boolean).join(" ")],
    ["อีเมลงาน", employee.workEmail],
    ["บริษัท", company?.nameTh],
    ["แผนก", department?.nameTh],
    ["ตำแหน่ง", employee.positionTitle],
    ["เบอร์โทร", employee.phoneNumber],
  ] : [];

  return <main className="mx-auto max-w-4xl px-4 py-6 sm:px-7 sm:py-8">
    <Link href="/" className="text-sm font-semibold text-sky-700">← กลับหน้าหลัก</Link>
    <header className="mt-5 rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8"><p className="text-sm font-semibold uppercase tracking-wider text-amber-400">My Profile</p><h1 className="mt-2 text-3xl font-black">ข้อมูลของฉัน</h1><p className="mt-2 text-sm text-slate-300">ข้อมูลพนักงานที่เชื่อมกับบัญชีที่กำลังใช้งาน</p></header>
    {linked ? <section className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <dl className="divide-y divide-slate-100">{details.map(([label, value]) => <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:gap-4"><dt className="text-sm text-slate-500">{label}</dt><dd className="break-words text-sm font-semibold text-slate-950">{value || "ยังไม่ระบุ"}</dd></div>)}</dl>
    </section> : <section className="mt-5 rounded-3xl border border-amber-200 bg-white p-6 text-sm text-slate-700">บัญชีนี้ยังไม่ได้ผูกกับข้อมูลพนักงาน กรุณาติดต่อ HR เพื่อตรวจสอบ</section>}
  </main>;
}
