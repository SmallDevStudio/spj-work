"use client";

import Link from "next/link";
import { HiOutlineSquares2X2 } from "react-icons/hi2";

import ThemeToggle from "@/components/layout/ThemeToggle";
import UserMenu from "@/components/layout/UserMenu";
import { ROLE_LABELS } from "@/constants/roles";

export default function PortalShell({ children, session }) {
  const roleLabel = ROLE_LABELS[session.role]?.th ?? session.role;
  const organizationName =
    session.organization?.name ??
    session.organization?.displayName ??
    "Superjeew Co., Ltd.";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/app" className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-sm">
              <HiOutlineSquares2X2 className="size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-base font-black tracking-tight text-slate-950 dark:text-white">
                SPJ Work
              </p>

              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {organizationName}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="max-w-52 truncate text-sm font-semibold text-slate-950 dark:text-white">
                {session.user?.name ?? session.user?.email}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {roleLabel}
              </p>
            </div>

            <ThemeToggle />
            <UserMenu session={session} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
