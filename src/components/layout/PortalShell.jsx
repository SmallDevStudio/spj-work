"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineBell,
  HiOutlineCalendarDays,
  HiOutlineChevronDown,
  HiOutlineHome,
  HiOutlineMagnifyingGlass,
  HiOutlineSquares2X2,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import UserMenu from "@/components/layout/UserMenu";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { getUserRoutes } from "@/constants/user-routes";

export default function PortalShell({ children, session }) {
  const pathname = usePathname();
  const [managementOpen, setManagementOpen] = useState(false);

  const permissions = session.permissions ?? [];
  const canAccessHr = permissions.includes(PERMISSIONS.SERVICE_HR_ACCESS);
  const canAccessSettings = permissions.includes(
    PERMISSIONS.ORGANIZATION_MANAGE,
  );
  const canAccessManagement = canAccessHr || canAccessSettings;

  const userId = session.user?.uid;
  const userRoutes = userId ? getUserRoutes(userId) : null;

  const mobileItems = [
    {
      label: "หน้าแรก",
      icon: HiOutlineHome,
      href: ROUTES.HOME,
      active: pathname === ROUTES.HOME,
    },
    {
      label: "การลา",
      icon: HiOutlineCalendarDays,
      href: userRoutes?.LEAVE ?? null,
      active: Boolean(
        userRoutes &&
        (pathname === userRoutes.LEAVE ||
          pathname.startsWith(`${userRoutes.LEAVE}/`)),
      ),
    },
    {
      label: "Services",
      icon: HiOutlineSquares2X2,
      href: "/#portal-services-title",
      active: false,
    },
    {
      label: "แจ้งเตือน",
      icon: HiOutlineBell,
      href: userRoutes?.NOTIFICATIONS ?? null,
      active: pathname === userRoutes?.NOTIFICATIONS,
    },
    {
      label: "โปรไฟล์",
      icon: HiOutlineUser,
      href: userRoutes?.PROFILE ?? null,
      active: pathname === userRoutes?.PROFILE,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 max-lg:bg-slate-950 max-lg:text-white">
        <div className="mx-auto flex h-[72px] w-full max-w-[1536px] items-center gap-6 px-5 sm:px-7 xl:px-12">
          <Link
            href={ROUTES.HOME}
            aria-label="SPJ Work หน้าแรก"
            className="flex shrink-0 items-center whitespace-nowrap text-[1.55rem] font-black tracking-[-0.06em] sm:text-[1.9rem]"
          >
            <span>SPJ</span>
            <span className="ml-1 text-amber-400">Work</span>
          </Link>

          <nav
            aria-label="เมนูหลัก"
            className="hidden h-full items-center gap-2 xl:flex"
          >
            <Link
              href={ROUTES.HOME}
              aria-current={pathname === ROUTES.HOME ? "page" : undefined}
              className={`relative flex h-full items-center gap-2 px-4 text-sm font-semibold transition ${
                pathname === ROUTES.HOME
                  ? "text-slate-950 after:absolute after:inset-x-3 after:bottom-0 after:h-1 after:rounded-t-full after:bg-amber-400 dark:text-white max-lg:text-white"
                  : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white max-lg:text-slate-200"
              }`}
            >
              <HiOutlineHome className="size-5" aria-hidden="true" />
              My Portal
            </Link>

            {canAccessManagement ? (
              <div className="relative flex h-full items-center">
                <button
                  type="button"
                  aria-expanded={managementOpen}
                  aria-haspopup="menu"
                  onClick={() => setManagementOpen((open) => !open)}
                  className="flex h-full items-center gap-2 px-4 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white max-lg:text-slate-200"
                >
                  <HiOutlineUserGroup className="size-5" aria-hidden="true" />
                  Management
                  <HiOutlineChevronDown
                    className={`size-4 transition-transform ${
                      managementOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {managementOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="ปิดเมนู Management"
                      onClick={() => setManagementOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <div
                      role="menu"
                      className="absolute top-[calc(100%-2px)] left-0 z-40 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      {canAccessHr ? (
                        <Link
                          role="menuitem"
                          href="/manage"
                          onClick={() => setManagementOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          HR Management
                        </Link>
                      ) : null}

                      {canAccessSettings ? (
                        <Link
                          role="menuitem"
                          href="/settings"
                          onClick={() => setManagementOpen(false)}
                          className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          ตั้งค่าองค์กร
                        </Link>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 xl:flex dark:border-slate-700 dark:bg-slate-800">
              <HiOutlineMagnifyingGlass
                className="size-5 shrink-0"
                aria-hidden="true"
              />
              <span className="truncate text-xs">
                ค้นหาข้อมูล ข่าวสาร หรือบริการ...
              </span>
              <span className="sr-only">ระบบค้นหากำลังเตรียม</span>
            </div>

            {canAccessManagement ? (
              <Link
                href={canAccessHr ? ROUTES.MANAGE_HR : ROUTES.MANAGE_SETTINGS}
                aria-label="เข้าสู่ Management"
                className="flex size-10 items-center justify-center rounded-xl text-white xl:hidden"
              >
                <HiOutlineUserGroup className="size-6" aria-hidden="true" />
              </Link>
            ) : null}

            {userRoutes ? (
              <Link
                href={userRoutes.NOTIFICATIONS}
                aria-label="การแจ้งเตือน"
                className="flex size-10 items-center justify-center text-slate-700 dark:text-slate-200 max-lg:text-white"
              >
                <HiOutlineBell className="size-6" aria-hidden="true" />
              </Link>
            ) : null}

            <div className="hidden h-7 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

            <UserMenu session={session} />
          </div>
        </div>
      </header>

      <div className="pb-20 xl:pb-0">{children}</div>

      <nav
        aria-label="เมนูบริการของพนักงาน"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl xl:hidden dark:border-slate-800 dark:bg-slate-900/95"
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;

          const itemClass = `flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium sm:min-h-[72px] sm:text-xs ${
            item.active
              ? "text-amber-600 dark:text-amber-400"
              : item.href
                ? "text-slate-600 dark:text-slate-300"
                : "text-slate-400 dark:text-slate-600"
          }`;

          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={itemClass}
            >
              <Icon className="size-6" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ) : (
            <span key={item.label} aria-disabled="true" className={itemClass}>
              <Icon className="size-6" aria-hidden="true" />
              <span>{item.label}</span>
            </span>
          );
        })}
      </nav>
    </div>
  );
}
