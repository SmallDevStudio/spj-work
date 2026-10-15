"use client";

import { usePathname } from "next/navigation";
import { HiBars3 } from "react-icons/hi2";

import ThemeToggle from "@/components/layout/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";

const pageTitles = [
  {
    path: "/app/me/profile",
    eyebrow: "My Services",
    title: "ข้อมูลของฉัน",
  },
  {
    path: "/app/me/leave",
    eyebrow: "My Services",
    title: "การลาของฉัน",
  },
  {
    path: "/app/me/calendar",
    eyebrow: "My Services",
    title: "ปฏิทินของฉัน",
  },
  {
    path: "/app/me/announcements",
    eyebrow: "My Services",
    title: "ประกาศ",
  },
  {
    path: "/app/me",
    eyebrow: "Employee Self-Service",
    title: "บริการของฉัน",
  },
  {
    path: "/manage/hr/employees",
    eyebrow: "HR Management",
    title: "ข้อมูลพนักงาน",
  },
  {
    path: "/manage/hr/departments",
    eyebrow: "HR Management",
    title: "ข้อมูลแผนก",
  },
  {
    path: "/manage/hr/leave",
    eyebrow: "HR Management",
    title: "จัดการการลา",
  },
  {
    path: "/manage/hr/calendar",
    eyebrow: "HR Management",
    title: "ปฏิทินบริษัท",
  },
  {
    path: "/manage/hr/announcements",
    eyebrow: "HR Management",
    title: "ประกาศ",
  },
  {
    path: "/manage/hr/reports",
    eyebrow: "HR Reports",
    title: "รายงาน",
  },
  {
    path: "/manage/hr/settings",
    eyebrow: "HR Settings",
    title: "ตั้งค่า HR",
  },
  {
    path: "/manage/hr/audit-logs",
    eyebrow: "Security & Compliance",
    title: "Audit Log",
  },
  {
    path: "/manage/hr",
    eyebrow: "HR Management",
    title: "ภาพรวม HR",
  },
  {
    path: "/dashboard",
    eyebrow: "SPJ Work",
    title: "กำลังเปลี่ยนเส้นทาง",
  },
];

const workspaceDefaults = {
  me: {
    eyebrow: "Employee Self-Service",
    title: "บริการของฉัน",
  },
  hr: {
    eyebrow: "HR Management",
    title: "บริหารทรัพยากรบุคคล",
  },
};

function getPageTitle(pathname, workspace) {
  return (
    pageTitles.find(
      (page) =>
        pathname === page.path ||
        (page.path !== "/app/me" &&
          page.path !== "/manage/hr" &&
          pathname.startsWith(`${page.path}/`)),
    ) ??
    workspaceDefaults[workspace] ?? {
      eyebrow: "SPJ Work",
      title: "ระบบบริหารงานภายใน",
    }
  );
}

export default function Header({ onOpenSidebar, session, workspace = "me" }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname, workspace);

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
