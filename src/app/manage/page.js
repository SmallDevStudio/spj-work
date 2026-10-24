import Link from "next/link";

import { PERMISSIONS } from "@/constants/permissions";
import { requireCurrentSession } from "@/lib/auth/authorization";

export const metadata = { title: "จัดการระบบ | SPJ Work" };

const sections = [
  {
    title: "ข้อมูลพนักงาน",
    description: "ตรวจสอบและจัดการข้อมูลพนักงาน",
    href: "/manage/employee",
    permissions: [PERMISSIONS.EMPLOYEE_READ_ALL, PERMISSIONS.EMPLOYEE_READ],
  },
  {
    title: "แผนก",
    description: "ดูโครงสร้างและข้อมูลแผนก",
    href: "/manage/department",
    permissions: [PERMISSIONS.DEPARTMENT_READ],
  },
  {
    title: "การลา",
    description: "ประวัติการลา สิทธิ์วันลา วันหยุด และงานอนุมัติ",
    href: "/manage/leave",
    permissions: [PERMISSIONS.SERVICE_HR_ACCESS],
  },
  {
    title: "บริษัท",
    description: "ข้อมูลบริษัทและตารางวันทำงาน",
    href: "/manage/company",
    permissions: [PERMISSIONS.ORGANIZATION_MANAGE],
  },
  {
    title: "สิทธิ์เข้าถึง",
    description: "บทบาท สิทธิ์รายบริษัท และการมอบหน้าที่",
    href: "/manage/access",
    permissions: [
      PERMISSIONS.ORGANIZATION_MANAGE,
      PERMISSIONS.ROLE_MANAGE,
      PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
    ],
  },
];

export default async function ManagePage() {
  const session = await requireCurrentSession();
  const visible = sections.filter((section) =>
    section.permissions.some((permission) =>
      session.access.permissions.includes(permission),
    ),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-sm font-semibold text-amber-700">SPJ Work / Manage</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950">จัดการระบบ</h1>
      <p className="mt-2 text-sm text-slate-600">
        เลือกหมวดงานที่ต้องการจัดการ
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {section.description}
            </p>
            <span className="mt-5 inline-block text-sm font-bold text-amber-700">
              เปิดจัดการ →
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
