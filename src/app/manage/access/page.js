import Link from "next/link";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/constants/permissions";
import { requireAnyPermission } from "@/lib/auth/authorization";
import ManagePageHero from "@/components/layout/ManagePageHero";

export const metadata = { title: "จัดการสิทธิ์ | SPJ Work" };

const sections = [
  {
    title: "Role พนักงาน",
    description: "กำหนดบทบาทหลักของบัญชีพนักงาน",
    href: "/manage/access/employee-roles",
    permission: PERMISSIONS.ROLE_MANAGE,
  },
  {
    title: "สิทธิ์รายบริษัท",
    description: "กำหนดว่าบัญชีใดเข้าถึงข้อมูลบริษัทใด",
    href: "/manage/access/company-assignments",
    permission: PERMISSIONS.ORGANIZATION_MANAGE,
  },
  {
    title: "มอบสิทธิ์อนุมัติลา",
    description: "มอบหมายผู้ทำหน้าที่แทนตามบริษัทและช่วงเวลา",
    href: "/manage/access/delegations/leave-approval",
    permission: PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
  },
];

export default async function ManageAccessPage() {
  const session = await requireAnyPermission(
    sections.map((section) => section.permission),
  ).catch(() => null);

  if (!session) {
    redirect("/manage");
  }

  const visible = sections.filter((section) =>
    session.access.permissions.includes(section.permission),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <ManagePageHero eyebrow="Access Management" title="จัดการสิทธิ์" description="บทบาทหลัก สิทธิ์รายบริษัท และการมอบหน้าที่แทน" />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-slate-950">
              {section.title}
            </h2>
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
