"use client";

import { usePathname } from "next/navigation";
import { HiBars3 } from "react-icons/hi2";

import ThemeToggle from "@/components/layout/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";

const pageTitles = [
  {
    path: "/settings",
    eyebrow: "SPJ Work",
    title: "ตั้งค่าแอป",
  },
  {
    path: "/manage/company/work-schedules",
    eyebrow: "Company Management",
    title: "วันทำงานบริษัท",
  },
  {
    path: "/manage/company/employee-migration",
    eyebrow: "Company Management",
    title: "ย้ายข้อมูลบริษัทพนักงาน",
  },
  {
    path: "/manage/company/readiness",
    eyebrow: "Company Management",
    title: "ตรวจความพร้อมข้อมูลบริษัท",
  },
  {
    path: "/manage/access/company-assignments",
    eyebrow: "User Management",
    title: "สิทธิ์เข้าถึงบริษัท",
  },
  {
    path: "/manage/access/employee-roles",
    eyebrow: "Access Management",
    title: "Role พนักงาน",
  },
  {
    path: "/manage/access/delegations/leave-approval",
    eyebrow: "Access Management",
    title: "มอบสิทธิ์อนุมัติลา",
  },
  {
    path: "/manage/leave/assignments",
    eyebrow: "Leave Management",
    title: "กำหนด Leave Template",
  },
  {
    path: "/manage/leave/holidays",
    eyebrow: "Leave Management",
    title: "วันหยุด",
  },
  {
    path: "/manage/leave/settings",
    eyebrow: "Leave Management",
    title: "ตั้งค่าประเภทการลา",
  },
  {
    path: "/manage/leave/templates",
    eyebrow: "Leave Management",
    title: "Leave Templates",
  },
  {
    path: "/manage/employee",
    eyebrow: "HR Management",
    title: "ข้อมูลพนักงาน",
  },
  {
    path: "/manage/department",
    eyebrow: "HR Management",
    title: "ข้อมูลแผนก",
  },
  {
    path: "/manage/company",
    eyebrow: "Company Management",
    title: "ข้อมูลบริษัท",
  },
  {
    path: "/manage/access",
    eyebrow: "Access Management",
    title: "จัดการสิทธิ์",
  },
  {
    path: "/manage/leave",
    eyebrow: "Leave Management",
    title: "จัดการการลา",
  },
  {
    path: "/manage",
    eyebrow: "SPJ Work",
    title: "หน้าจัดการ",
  },
];

function getPageTitle(pathname) {
  return (
    pageTitles.find(
      (page) =>
        pathname === page.path ||
        (page.path !== "/manage" && pathname.startsWith(`${page.path}/`)),
    ) ?? {
      eyebrow: "SPJ Work",
      title: "หน้าจัดการ",
    }
  );
}

export default function Header({ onOpenSidebar, session }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex min-h-20 items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="เปิดเมนู"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <HiBars3 className="size-6" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
              {pageTitle.eyebrow}
            </p>

            <h1 className="truncate text-lg font-bold text-slate-950 dark:text-white sm:text-xl">
              {pageTitle.title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <UserMenu session={session} />
        </div>
      </div>
    </header>
  );
}
