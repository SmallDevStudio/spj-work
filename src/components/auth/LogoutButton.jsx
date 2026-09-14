"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiArrowRightOnRectangle } from "react-icons/hi2";
import { toast } from "react-toastify";

import { signOutApplication } from "@/services/auth/client-auth.service";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      await signOutApplication();

      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่");

      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <HiArrowRightOnRectangle className="size-5" aria-hidden="true" />

      {isLoading ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
    </button>
  );
}
