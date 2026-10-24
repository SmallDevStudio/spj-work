"use client";

import { useEffect, useState } from "react";
import {
  createCompanyWorkScheduleRequest,
  getCompanyScheduleErrorMessage,
  getCompanyWorkSchedulesRequest,
} from "@/services/company/company-work-schedule.api";

const DAYS = [
  { value: 0, label: "อา." }, { value: 1, label: "จ." }, { value: 2, label: "อ." },
  { value: 3, label: "พ." }, { value: 4, label: "พฤ." }, { value: 5, label: "ศ." },
  { value: 6, label: "ส." },
];

export function formatWorkingDays(days) {
  return DAYS.filter((day) => days?.includes(day.value)).map((day) => day.label).join(" ");
}

export default function CompanyWorkScheduleClient({ company, readOnly = false, onSaved }) {
  const [history, setHistory] = useState(null);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [workingWeekdays, setWorkingWeekdays] = useState(company.workSchedule?.workingWeekdays ??
    (company.code === "SPJ02" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getCompanyWorkSchedulesRequest(company.id).then((result) => {
      if (active) setHistory(result);
    }).catch((cause) => { if (active) setError(getCompanyScheduleErrorMessage(cause)); });
    return () => { active = false; };
  }, [company.id]);

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const days = [...workingWeekdays].sort((a, b) => a - b);
      await createCompanyWorkScheduleRequest({ companyId: company.id, effectiveFrom, workingWeekdays: days });
      setHistory(await getCompanyWorkSchedulesRequest(company.id));
      onSaved?.({ effectiveFrom, workingWeekdays: days });
      setEffectiveFrom("");
      setMessage("บันทึกวันทำงานของบริษัทแล้ว");
    } catch (cause) { setError(getCompanyScheduleErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  const latest = history?.versions?.[0] ?? company.workSchedule;
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-slate-950 dark:text-white">วันทำงาน</h2>
        <p className="mt-1 text-sm text-slate-500">ใช้คำนวณวันลาตามวันที่เวอร์ชันมีผล</p></div>
      {latest && <span className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
        {formatWorkingDays(latest.workingWeekdays)} · เริ่ม {latest.effectiveFrom}
      </span>}
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
    {!latest && !error && <p className="mt-4 text-sm text-slate-500">ยังไม่ได้กำหนดวันทำงาน</p>}
    {!readOnly && <form onSubmit={save} className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
      <h3 className="font-semibold text-slate-950 dark:text-white">{latest ? "เพิ่มเวอร์ชันวันทำงาน" : "กำหนดวันทำงานครั้งแรก"}</h3>
      <p className="mt-1 text-sm text-slate-500">การเปลี่ยนครั้งถัดไปต้องเริ่มใช้ในอนาคต ประวัติเดิมจะคงไว้เพื่อคำนวณใบลาย้อนหลัง</p>
      <label className="mt-4 block max-w-xs text-sm font-semibold text-slate-700 dark:text-slate-200">วันที่เริ่มใช้
        <input required type="date" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)}
          className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <fieldset className="mt-4"><legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">วันทำงาน</legend>
        <div className="mt-2 flex flex-wrap gap-2">{DAYS.map((day) => <label key={day.value} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm dark:border-slate-700 dark:text-white">
          <input type="checkbox" checked={workingWeekdays.includes(day.value)} onChange={() => setWorkingWeekdays((current) => current.includes(day.value) ? current.filter((value) => value !== day.value) : [...current, day.value])} />{day.label}
        </label>)}</div>
      </fieldset>
      <button type="submit" disabled={busy || !effectiveFrom || workingWeekdays.length === 0}
        className="mt-5 min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? "กำลังบันทึก" : "บันทึกวันทำงาน"}</button>
    </form>}
    {history?.versions?.length > 0 && <details className="mt-5 border-t border-slate-200 pt-4 text-sm dark:border-slate-800"><summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">ประวัติวันทำงาน ({history.versions.length})</summary>
      <ul className="mt-3 space-y-2">{history.versions.map((version) => <li key={version.id} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950 dark:text-white">{version.effectiveFrom} · {formatWorkingDays(version.workingWeekdays)}</li>)}</ul>
    </details>}
  </section>;
}
