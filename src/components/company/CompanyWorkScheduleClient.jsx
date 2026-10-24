"use client";

import { useState } from "react";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
} from "react-icons/hi2";

import {
  createCompanyWorkScheduleRequest,
  getCompanyScheduleErrorMessage,
  getCompanyWorkSchedulesRequest,
} from "@/services/company/company-work-schedule.api";

const DAYS = [
  { value: 0, label: "อาทิตย์" },
  { value: 1, label: "จันทร์" },
  { value: 2, label: "อังคาร" },
  { value: 3, label: "พุธ" },
  { value: 4, label: "พฤหัสบดี" },
  { value: 5, label: "ศุกร์" },
  { value: 6, label: "เสาร์" },
];

function defaultDays(companyCode) {
  return companyCode === "SPJ02" ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
}

function formatDays(days) {
  return DAYS.filter((day) => days?.includes(day.value))
    .map((day) => day.label)
    .join(", ");
}

export default function CompanyWorkScheduleClient({
  companies,
  initialCompanyId,
  initialHistory,
}) {
  const [companyId, setCompanyId] = useState(initialCompanyId);

  const [history, setHistory] = useState(initialHistory);

  const [effectiveFrom, setEffectiveFrom] = useState("");

  const [workingWeekdays, setWorkingWeekdays] = useState(() =>
    defaultDays(
      companies.find((company) => company.id === initialCompanyId)?.code,
    ),
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedCompany = companies.find((company) => company.id === companyId);

  async function changeCompany(nextCompanyId) {
    if (!nextCompanyId || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const nextHistory = await getCompanyWorkSchedulesRequest(nextCompanyId);

      setCompanyId(nextCompanyId);
      setHistory(nextHistory);
      setEffectiveFrom("");

      const nextCompany = companies.find(
        (company) => company.id === nextCompanyId,
      );

      setWorkingWeekdays(defaultDays(nextCompany?.code));
    } catch (requestError) {
      setError(getCompanyScheduleErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function toggleDay(day) {
    setWorkingWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
    setMessage("");
  }

  async function saveSchedule(event) {
    event.preventDefault();

    if (!companyId || !effectiveFrom || workingWeekdays.length === 0) {
      setError("กรุณาเลือกวันที่เริ่มใช้และวันทำงาน");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await createCompanyWorkScheduleRequest({
        companyId,
        effectiveFrom,
        workingWeekdays,
      });

      const nextHistory = await getCompanyWorkSchedulesRequest(companyId);

      setHistory(nextHistory);
      setEffectiveFrom("");
      setMessage(`บันทึกวันทำงานของ ${selectedCompany?.code} แล้ว`);
    } catch (requestError) {
      setError(getCompanyScheduleErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (companies.length === 0) {
    return (
      <main className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        ไม่พบบริษัทที่บัญชีนี้มีสิทธิ์จัดการ
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
            <HiOutlineBuildingOffice2 className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-400">
              Company Settings
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              วันทำงานของบริษัท
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              กำหนดวันทำงานแยกบริษัท เพื่อคำนวณวันลาให้ถูกต้อง
            </p>
          </div>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <label className="block">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
            บริษัท
          </span>
          <select
            value={companyId}
            disabled={busy}
            onChange={(event) => changeCompany(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.code} — {company.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <form
        onSubmit={saveSchedule}
        className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="flex items-center gap-2 font-bold text-slate-950 dark:text-white">
          <HiOutlineCalendarDays className="size-5" aria-hidden="true" />
          เพิ่มช่วงวันที่เริ่มใช้
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          ครั้งแรกกำหนดวันเริ่มใช้ย้อนหลังได้
          การเปลี่ยนครั้งต่อไปต้องเป็นวันในอนาคต
        </p>

        <label className="mt-5 block max-w-xs">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            วันที่เริ่มใช้
          </span>
          <input
            type="date"
            required
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            วันทำงาน
          </legend>

          <div className="mt-3 flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm dark:border-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={workingWeekdays.includes(day.value)}
                  disabled={busy}
                  onChange={() => toggleDay(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={busy || !effectiveFrom || workingWeekdays.length === 0}
            className="min-h-12 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก..." : "บันทึกวันทำงาน"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-bold text-slate-950 dark:text-white">
          ประวัติการตั้งค่า · {selectedCompany?.code}
        </h2>

        {history?.versions?.length ? (
          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {history.versions.map((version) => (
              <div key={version.id} className="py-4">
                <p className="font-semibold text-slate-950 dark:text-white">
                  เริ่มใช้ {version.effectiveFrom}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDays(version.workingWeekdays)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            ยังไม่เคยตั้งวันทำงานของบริษัทนี้
          </p>
        )}
      </section>
    </main>
  );
}
