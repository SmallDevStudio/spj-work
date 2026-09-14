"use client";

import { useState } from "react";
import { HiChevronDown, HiOutlineUserCircle } from "react-icons/hi2";

import LogoutButton from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils/cn";

function getInitials(name, email) {
  const source = name?.trim() || email?.trim() || "SPJ";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function UserMenu({ session }) {
  const [isOpen, setIsOpen] = useState(false);

  const initials = getInitials(session.user?.name, session.user?.email);

  return (
    <div className="relative">
      {isOpen ? (
        <button
          type="button"
          aria-label="ปิดเมนูผู้ใช้งาน"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 cursor-default"
        />
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="relative z-50 flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white dark:bg-amber-400 dark:text-slate-950">
          {initials}
        </span>

        <span className="hidden max-w-36 truncate text-sm font-semibold md:block">
          {session.user?.name ?? session.user?.email}
        </span>

        <HiChevronDown
          className={cn("size-4 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-950/15 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-start gap-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-950">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <HiOutlineUserCircle className="size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                {session.user?.name ?? "ผู้ใช้งาน SPJ Work"}
              </p>

              <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                {session.user?.email}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {session.role}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <LogoutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}
