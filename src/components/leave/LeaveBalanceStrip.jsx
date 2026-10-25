"use client";

import { useEffect, useState } from "react";
import { HiOutlineBriefcase, HiOutlineHeart, HiOutlineSun } from "react-icons/hi2";

const cards = [
  { code: "SICK", label: "ลาป่วย", Icon: HiOutlineHeart, color: "bg-sky-50 text-sky-800" },
  { code: "PERSONAL", label: "ลากิจ", Icon: HiOutlineBriefcase, color: "bg-emerald-50 text-emerald-800" },
  { code: "ANNUAL", label: "พักร้อน", Icon: HiOutlineSun, color: "bg-amber-50 text-amber-800" },
];

function todayInBangkok() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (name) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function LeaveBalanceStrip({ enabled = true, onDate, compact = false }) {
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const date = onDate ?? todayInBangkok();
    Promise.all(cards.map(async ({ code }) => {
      const response = await fetch(`/api/v1/leave/balance?${new URLSearchParams({ leaveTypeCode: code, onDate: date })}`, { signal: controller.signal, credentials: "same-origin", cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error?.message ?? "โหลดวันลาคงเหลือไม่สำเร็จ");
      return [code, body.data.item];
    })).then((entries) => { if (!controller.signal.aborted) { setBalances(Object.fromEntries(entries)); setError(""); } })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, onDate]);

  return <div>
    <div className={`grid grid-cols-3 ${compact ? "gap-2" : "gap-2 sm:gap-3"}`}>
      {cards.map(({ code, label, Icon, color }) => {
        const balance = balances[code];
        const value = !enabled ? "—" : loading ? "…" : balance?.source === "NOT_CONFIGURED" ? "—" : balance?.remainingDays == null ? balance ? "ไม่จำกัด" : "—" : `${balance.remainingDays} วัน`;
        return <div key={code} className={`min-w-0 rounded-2xl p-3 sm:p-4 ${color}`}>
          <span className="flex size-9 items-center justify-center rounded-full bg-white/80"><Icon className="size-5" aria-hidden="true" /></span>
          <p className="mt-2 text-xs font-bold sm:text-sm">{label}</p>
          <p className="mt-1 text-base font-black sm:text-xl" aria-label={`${label}คงเหลือ ${value}`}>{value}</p>
        </div>;
      })}
    </div>
    {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    {!enabled && <p className="mt-2 text-xs text-slate-500">เชื่อมบัญชีกับข้อมูลพนักงานเพื่อดูวันลาคงเหลือ</p>}
  </div>;
}
