"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineChevronDown,
  HiOutlineSquares2X2,
  HiXMark,
} from "react-icons/hi2";

import { ROLE_LABELS } from "@/constants/roles";
import { WORKSPACE_SETTINGS } from "@/constants/workspace-navigation";
import { cn } from "@/lib/utils/cn";

function getInitials(name, email) {
  const source = name?.trim() || email?.trim() || "SPJ";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function hasAnyPermission(userPermissions, requiredPermissions) {
  if (!Array.isArray(userPermissions) || !Array.isArray(requiredPermissions)) {
    return false;
  }

  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission),
  );
}

function isNavigationActive(pathname, href, homeHref) {
  if (href === homeHref) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  isOpen,
  onClose,
  session,
  workspace = "hr",
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState({});

  const currentWorkspace =
    WORKSPACE_SETTINGS[workspace] ?? WORKSPACE_SETTINGS.hr;

  const availableNavigation = currentWorkspace.navigation.filter((item) =>
    hasAnyPermission(session.permissions, item.permissions),
  );

  const initials = getInitials(session.user?.name, session.user?.email);
  const roleLabel = ROLE_LABELS[session.role]?.th ?? session.role;

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
            href={currentWorkspace.homeHref}
            onClick={onClose}
            className="flex min-w-0 items-center gap-3"
          >
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl font-black shadow-sm",
                currentWorkspace.brandClassName,
              )}
            >
              SPJ
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-950 dark:text-white">
                SPJ Work
              </p>

              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {currentWorkspace.shortName}
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

        <div className="px-4 pt-4">
          <Link
            href="/"
            onClick={onClose}
            className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <HiOutlineArrowLeft className="size-5" aria-hidden="true" />
            <span>กลับไปเลือกบริการ</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {currentWorkspace.name}
          </p>

          <ul className="space-y-1.5">
            {availableNavigation.map((item) => {
              const Icon = item.icon;

              const isActive = isNavigationActive(
                pathname,
                item.href,
                currentWorkspace.homeHref,
              );
              const children = item.children?.filter((child) =>
                hasAnyPermission(session.permissions, child.permissions),
              ) ?? [];
              const hasChildren = children.length > 0;
              const expandedAtPath = expanded[item.href];
              const isExpanded = hasChildren && (
                expandedAtPath?.pathname === pathname ? expandedAtPath.value : isActive
              );

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
                  <div className={cn(
                    "flex items-center rounded-xl transition",
                    isActive
                      ? currentWorkspace.activeClassName
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                  )}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 text-sm font-semibold"
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? "ย่อ" : "ขยาย"}เมนู${item.name}`}
                        aria-expanded={isExpanded}
                        aria-controls={`submenu-${item.href.replaceAll("/", "-")}`}
                        onClick={() => setExpanded((current) => ({
                          ...current,
                          [item.href]: { pathname, value: !isExpanded },
                        }))}
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-amber-500"
                      >
                        <HiOutlineChevronDown className={cn("size-4 transition-transform", isExpanded && "rotate-180")} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {hasChildren && isExpanded ? (
                    <ul id={`submenu-${item.href.replaceAll("/", "-")}`} className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
                      {children.map((child) => {
                        const childActive = isNavigationActive(pathname, child.href, currentWorkspace.homeHref);
                        return (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              aria-current={pathname === child.href ? "page" : undefined}
                              className={cn(
                                "flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition",
                                childActive
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
                              )}
                            >
                              {child.name}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
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
                {roleLabel}
              </p>
            </div>
          </div>

          <Link
            href="/"
            onClick={onClose}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <HiOutlineSquares2X2 className="size-4" aria-hidden="true" />
            <span>SPJ Work Portal</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
