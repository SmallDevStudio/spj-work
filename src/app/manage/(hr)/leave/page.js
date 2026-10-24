import Link from "next/link";
import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { serverEnv } from "@/config/env.server";
import { requireAnyPermission } from "@/lib/auth/authorization";
import ManagePageHero from "@/components/layout/ManagePageHero";

export const metadata = {
  title: "จัดการการลา | SPJ Work",
};

const sections = [
  {
    title: "ประวัติการลา",
    description: "ค้นหาใบลา ดูผลอนุมัติ และตรวจรายการย้อนหลัง",
    href: "/manage/leave/history",
    permission: PERMISSIONS.LEAVE_READ_ALL,
  },
  {
    title: "ประเภทการลา",
    description: "กำหนดประเภทและเงื่อนไขการลา",
    href: "/manage/leave/settings",
    permission: PERMISSIONS.LEAVE_POLICY_MANAGE,
  },
  {
    title: "Leave Templates",
    description: "กำหนดสิทธิ์วันลาแม่แบบ",
    href: "/manage/leave/templates",
    permission: PERMISSIONS.LEAVE_BALANCE_MANAGE,
  },
  {
    title: "มอบ Template",
    description: "ผูกสิทธิ์วันลากับพนักงาน",
    href: "/manage/leave/assignments",
    permission: PERMISSIONS.LEAVE_BALANCE_MANAGE,
  },
  {
    title: "วันหยุด",
    description: "จัดการปฏิทินวันหยุดที่ใช้คำนวณใบลา",
    href: "/manage/leave/holidays",
    permission: PERMISSIONS.HOLIDAY_MANAGE,
  },
  {
    title: "โอนงาน HR ค้าง",
    description: "เลือกใบลาหลายใบและย้ายผู้รับงาน",
    href: "/manage/leave/takeover",
    permission: PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
  },
];

export default async function ManageLeavePage() {
  const session = await requireAnyPermission([
    PERMISSIONS.LEAVE_MANAGE,
    PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
    PERMISSIONS.LEAVE_BALANCE_MANAGE,
    PERMISSIONS.LEAVE_POLICY_MANAGE,
  ]).catch(() => null);

  if (!session) {
    redirect("/manage");
  }

  const visibleSections = sections.filter((item) =>
    session.access.permissions.includes(item.permission),
  );

  const showDevTest =
    process.env.NODE_ENV === "development" &&
    process.env.LEAVE_DEV_TEST_ENABLED === "true" &&
    /(?:-dev|-test)$/.test(serverEnv.firebaseAdminProjectId) &&
    session.access.membership.role === ROLES.SUPERADMIN;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <ManagePageHero eyebrow="Leave Management" title="จัดการการลา" description="ตั้งค่าประเภทการลา สิทธิ์วันลา ปฏิทิน และงานอนุมัติค้าง" />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleSections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md"
          >
            <h2 className="text-lg font-bold text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
            <span className="mt-5 inline-block text-sm font-bold text-amber-700">
              เปิดจัดการ →
            </span>
          </Link>
        ))}
      </div>

      {showDevTest ? (
        <Link
          href="/manage/leave/dev-test"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-amber-50 px-5 text-sm font-bold text-amber-900"
        >
          เปิด Leave Dev Test →
        </Link>
      ) : null}

      {session.access.permissions.includes(PERMISSIONS.LEAVE_APPROVE) &&
      session.access.membership.employeeId ? (
        <Link
          href={`/${encodeURIComponent(session.identity.uid)}/leave/approvals`}
          className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-sky-700 px-5 text-sm font-bold text-white"
        >
          เปิดงานอนุมัติของฉัน
        </Link>
      ) : null}
    </main>
  );
}
