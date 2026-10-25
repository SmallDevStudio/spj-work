"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowPath,
  HiOutlineCalendarDays,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi2";

import {
  getHolidayCalendarErrorMessage,
  getHolidayCalendarRequest,
  previewGoogleHolidaysRequest,
  publishHolidayCalendarRequest,
  saveHolidayCalendarDraftRequest,
} from "@/services/leave/leave-calendar.api";

const EMPTY_HOLIDAY = {
  date: "",
  nameTh: "",
  kind: "COMPANY",
};

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function sortedHolidays(holidays) {
  return [...holidays].sort((a, b) => a.date.localeCompare(b.date));
}

export default function LeaveCalendarSettingsClient({
  initialYear,
  initialItem,
  allowPublishedEdits = true,
}) {
  const router = useRouter();
  const year = initialYear;
  const [item, setItem] = useState(initialItem);
  const [holidays, setHolidays] = useState(
    sortedHolidays(initialItem?.pendingDraft?.holidays ?? initialItem?.holidays ?? []),
  );
  const [newHoliday, setNewHoliday] = useState(EMPTY_HOLIDAY);
  const [preview, setPreview] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmedComplete, setConfirmedComplete] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // The published calendar remains live; the editor writes a pending revision.
  const published = item?.status === "PUBLISHED" && !allowPublishedEdits;
  const selectedSet = new Set(selectedDates);

  function markChanged() {
    setDirty(true);
    setConfirmedComplete(false);
    setMessage("");
  }

  async function loadGooglePreview() {
    if (busy || published) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await previewGoogleHolidaysRequest(year);

      setPreview(result);
      setSelectedDates([]);
      setMessage(
        `พบรายการเสนอ ${result.candidates.length} วันที่ กรุณาเลือกเฉพาะวันที่บริษัทหยุดจริง`,
      );
    } catch (requestError) {
      setError(getHolidayCalendarErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  function toggleCandidate(date) {
    setSelectedDates((current) =>
      current.includes(date)
        ? current.filter((value) => value !== date)
        : [...current, date],
    );
  }

  function addSelectedCandidates() {
    if (published || !preview || selectedDates.length === 0) {
      return;
    }

    const existingDates = new Set(holidays.map((holiday) => holiday.date));

    const additions = preview.candidates
      .filter(
        (candidate) =>
          selectedSet.has(candidate.date) && !existingDates.has(candidate.date),
      )
      .map((candidate) => ({
        date: candidate.date,
        nameTh: candidate.nameTh,
        kind: "THAI_PUBLIC",
      }));

    if (additions.length === 0) {
      setMessage("วันที่เลือกมีอยู่ในฉบับร่างแล้ว");
      return;
    }

    setHolidays((current) => sortedHolidays([...current, ...additions]));
    setSelectedDates([]);
    markChanged();
    setMessage(
      `เพิ่ม ${additions.length} วันเข้าในฉบับร่างแล้ว กรุณาตรวจชื่อและวันที่ก่อนบันทึก`,
    );
  }

  function addManualHoliday() {
    if (published) return;

    const nameTh = newHoliday.nameTh.trim();

    if (
      !newHoliday.date ||
      Number(newHoliday.date.slice(0, 4)) !== year ||
      !nameTh
    ) {
      setError("กรุณากรอกวันที่และชื่อวันหยุดในปีที่เลือก");
      return;
    }

    if (holidays.some((holiday) => holiday.date === newHoliday.date)) {
      setError("วันที่นี้อยู่ในรายการแล้ว");
      return;
    }

    setHolidays((current) =>
      sortedHolidays([...current, { ...newHoliday, nameTh }]),
    );
    setNewHoliday(EMPTY_HOLIDAY);
    setError("");
    markChanged();
  }

  function updateHoliday(date, field, value) {
    if (published) return;

    setHolidays((current) =>
      current.map((holiday) =>
        holiday.date === date ? { ...holiday, [field]: value } : holiday,
      ),
    );
    markChanged();
  }

  function removeHoliday(date) {
    if (published) return;

    setHolidays((current) =>
      current.filter((holiday) => holiday.date !== date),
    );
    markChanged();
  }

  async function saveDraft() {
    if (busy || published) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await saveHolidayCalendarDraftRequest({
        year,
        holidays: holidays.map((holiday) => ({
          date: holiday.date,
          nameTh: holiday.nameTh.trim(),
          kind: holiday.kind,
        })),
      });

      const savedItem = await getHolidayCalendarRequest(year);
      setItem(savedItem);
      setDirty(false);
      setConfirmedComplete(false);
      setMessage(`บันทึกฉบับร่าง revision ${result.revision} แล้ว`);
    } catch (requestError) {
      setError(getHolidayCalendarErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (busy || dirty || !(item?.pendingDraft?.revision ?? item?.revision) || !confirmedComplete) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await publishHolidayCalendarRequest({
        year,
        expectedRevision: item.pendingDraft?.revision ?? item.revision,
        confirmedComplete: true,
      });

      const publishedItem = await getHolidayCalendarRequest(year);

      setItem(publishedItem);
      setHolidays(sortedHolidays(publishedItem?.holidays ?? []));
      setPreview(null);
      setSelectedDates([]);
      setConfirmedComplete(false);
      setMessage(`เผยแพร่ปฏิทินปี ${year} แล้ว`);
      router.push("/manage/leave/holidays");
      router.refresh();
    } catch (requestError) {
      setError(getHolidayCalendarErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
            <HiOutlineCalendarDays className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
              Leave Management
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              ปฏิทินวันหยุด
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              เลือกวันหยุดไทยจาก Google และเพิ่มวันหยุดพิเศษของบริษัท
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              ปี {year} · พ.ศ. {year + 543}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {item?.pendingDraft
                ? `มีฉบับแก้ไข revision ${item.pendingDraft.revision} · ฉบับเผยแพร่ยังใช้งานอยู่`
                : item?.status === "PUBLISHED"
                ? `เผยแพร่แล้ว revision ${item.revision} · บันทึกเพื่อสร้างฉบับแก้ไข`
                : item
                  ? `ฉบับร่าง revision ${item.revision}`
                  : "ยังไม่มีฉบับร่าง"}
            </p>
          </div>

          <Link href="/manage/leave/holidays" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold">กลับรายการปี</Link>
        </div>
      </section>

      {!published && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950 dark:text-white">
                ดึงรายการจาก Google
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                รายการที่ดึงมายังไม่เป็นวันหยุด ต้องเลือกและบันทึกเอง
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={loadGooglePreview}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 disabled:opacity-50"
            >
              <HiOutlineArrowPath className="size-5" aria-hidden="true" />
              ดึงจาก Google
            </button>
          </div>

          {preview && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                รายการเสนอ {preview.candidates.length} วัน · เลือกแล้ว{" "}
                {selectedDates.length} วัน
              </p>

              <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                {preview.candidates.map((candidate) => {
                  const alreadyAdded = holidays.some(
                    (holiday) => holiday.date === candidate.date,
                  );

                  return (
                    <label
                      key={candidate.date}
                      className="flex items-start gap-3 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedSet.has(candidate.date) || alreadyAdded
                        }
                        disabled={alreadyAdded}
                        onChange={() => toggleCandidate(candidate.date)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {candidate.date}
                        </span>
                        <span className="ml-2 text-slate-600 dark:text-slate-300">
                          {candidate.nameTh}
                        </span>
                        {alreadyAdded && (
                          <span className="ml-2 text-emerald-600">
                            มีในฉบับร่างแล้ว
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={busy || selectedDates.length === 0}
                onClick={addSelectedCandidates}
                className="mt-4 min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                เพิ่มวันที่เลือกลงฉบับร่าง
              </button>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-bold text-slate-950 dark:text-white">
          วันหยุดที่ใช้จริง ({holidays.length})
        </h2>

        {!published && (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto]">
            <input
              aria-label="วันที่หยุด"
              type="date"
              min={`${year}-01-01`}
              max={`${year}-12-31`}
              value={newHoliday.date}
              onChange={(event) =>
                setNewHoliday((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              className={inputClass}
            />
            <input
              aria-label="ชื่อวันหยุด"
              placeholder="ชื่อวันหยุดพิเศษ"
              maxLength={200}
              value={newHoliday.nameTh}
              onChange={(event) =>
                setNewHoliday((current) => ({
                  ...current,
                  nameTh: event.target.value,
                }))
              }
              className={inputClass}
            />
            <select
              aria-label="ประเภทวันหยุด"
              value={newHoliday.kind}
              onChange={(event) =>
                setNewHoliday((current) => ({
                  ...current,
                  kind: event.target.value,
                }))
              }
              className={inputClass}
            >
              <option value="COMPANY">วันหยุดบริษัท</option>
              <option value="THAI_PUBLIC">วันหยุดไทย</option>
            </select>
            <button
              type="button"
              onClick={addManualHoliday}
              disabled={busy}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              <HiOutlinePlus className="size-4" aria-hidden="true" />
              เพิ่ม
            </button>
          </div>
        )}

        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {holidays.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              ยังไม่มีวันหยุดที่เลือก
            </p>
          ) : (
            holidays.map((holiday) => (
              <div
                key={holiday.date}
                className="grid gap-3 py-3 sm:grid-cols-[8rem_1fr_10rem_auto] sm:items-center"
              >
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {holiday.date}
                </span>

                <input
                  aria-label={`ชื่อวันหยุด ${holiday.date}`}
                  value={holiday.nameTh}
                  maxLength={200}
                  disabled={busy || published}
                  onChange={(event) =>
                    updateHoliday(holiday.date, "nameTh", event.target.value)
                  }
                  className={inputClass}
                />

                <select
                  aria-label={`ประเภทวันหยุด ${holiday.date}`}
                  value={holiday.kind}
                  disabled={busy || published}
                  onChange={(event) =>
                    updateHoliday(holiday.date, "kind", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="THAI_PUBLIC">วันหยุดไทย</option>
                  <option value="COMPANY">วันหยุดบริษัท</option>
                </select>

                {!published && (
                  <button
                    type="button"
                    aria-label={`ลบวันหยุด ${holiday.date}`}
                    disabled={busy}
                    onClick={() => removeHoliday(holiday.date)}
                    className="flex size-11 items-center justify-center rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <HiOutlineTrash className="size-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {!published && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={confirmedComplete}
                disabled={
                  busy || dirty || !(item?.pendingDraft?.revision ?? item?.revision) || holidays.length === 0
                }
                onChange={(event) => setConfirmedComplete(event.target.checked)}
                className="mt-1"
              />
              ตรวจวันหยุดที่เลือกสำหรับปีนี้ครบแล้ว
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={saveDraft}
                disabled={busy}
                className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold disabled:opacity-50"
              >
                บันทึกฉบับร่าง
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={
                  busy || dirty || !confirmedComplete || !(item?.pendingDraft?.revision ?? item?.revision)
                }
                className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                เผยแพร่ปฏิทิน
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
