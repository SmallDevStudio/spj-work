"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineHome,
  HiOutlineMegaphone,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiXMark,
} from "react-icons/hi2";

import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils/cn";

const navigationItems = [
  {
    name: "ภาพรวม",
    href: "/dashboard",
    icon: HiOutlineHome,
    permission: PERMISSIONS.DASHBOARD_READ,
    enabled: true,
  },
  {
    name: "พนักงาน",
    href: "/dashboard/employees",
    icon: HiOutlineUserGroup,
    permission: PERMISSIONS.EMPLOYEE_READ,
    enabled: false,
  },
  {
    name: "การลา",
    href: "/dashboard/leave",
    icon: HiOutlineClipboardDocumentCheck,
    permission: PERMISSIONS.LEAVE_READ_OWN,
    enabled: false,
  },
  {
    name: "ปฏิทิน",
    href: "/dashboard/calendar",
    icon: HiOutlineCalendarDays,
    permission: PERMISSIONS.CALENDAR_READ_OWN,
    enabled: false,
  },
  {
    name: "ประกาศ",
    href: "/dashboard/announcements",
    icon: HiOutlineMegaphone,
    permission: PERMISSIONS.ANNOUNCEMENT_READ,
    enabled: false,
  },
  {
    name: "รายงาน",
    href: "/dashboard/reports",
    icon: HiOutlineChartBarSquare,
    permission: PERMISSIONS.LEAVE_REPORT_READ,
    enabled: false,
  },
  {
    name: "Audit Log",
    href: "/dashboard/audit-logs",
    icon: HiOutlineShieldCheck,
    permission: PERMISSIONS.AUDIT_READ,
    enabled: false,
  },
];

function getInitials(name, email) {
  const source = name?.trim() || email?.trim() || "SPJ";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function Sidebar({ isOpen, onClose, session }) {
  const pathname = usePathname();

  const availableNavigation = navigationItems.filter((item) =>
    session.permissions.includes(item.permission),
  );

  const initials = getInitials(session.user?.name, session.user?.email);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="ปิดเมนู"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        )}
      >
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 font-black text-slate-950">
              SPJ
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950 dark:text-white">
                SPJ Work
              </p>

              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                HR Management
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
          >
            <HiXMark className="size-6" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            เมนูหลัก
          </p>

          <ul className="space-y-1.5">
            {availableNavigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              if (!item.enabled) {
                return (
                  <li key={item.href}>
                    <div className="flex min-h-12 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-400 dark:text-slate-600">
                      <Icon className="size-5 shrink-0" aria-hidden="true" />

                      <span className="flex-1">{item.name}</span>

                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold dark:bg-slate-900">
                        เร็ว ๆ นี้
                      </span>
                    </div>
                  </li>
                );
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                      isActive
                        ? "bg-amber-400 text-slate-950 shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />

                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white dark:bg-amber-400 dark:text-slate-950">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {session.user?.name ?? session.user?.email}
              </p>

              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {session.role}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
