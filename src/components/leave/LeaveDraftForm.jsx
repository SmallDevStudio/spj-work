"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export default function LeaveDraftForm({ leaveTypes, initialDate, leaveHref }) {
  const router = useRouter();

  const [form, setForm] = useState({
    leaveTypeCode: "",
    startDate: initialDate,
    endDate: initialDate,
    dayPart: "FULL_DAY",
    reason: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "startDate" && (!current.endDate || current.endDate < value)
        ? { endDate: value }
        : {}),
    }));
  }

  async function saveDraft(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      await apiClient.post("/leave/requests/drafts", form, {
        headers: {
          "Content-Type": "application/json",
          [headerName]: csrfToken,
        },
      });

      router.push(leaveHref);
      router.refresh();
    } catch (caught) {
      const message =
        caught?.response?.data?.error?.message ??
        "บันทึกฉบับร่างไม่สำเร็จ กรุณาลองอีกครั้ง";

      setError(message);
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-7 sm:py-8">
      <Link
        href={leaveHref}
        className="text-sm font-semibold text-sky-700 hover:underline"
      >
        ← กลับไปการลาของฉัน
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
          เขียนใบลา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          บันทึกเป็นฉบับร่างก่อน แล้วกลับมาตรวจสอบข้อมูลเพื่อส่งอนุมัติ
        </p>
      </div>

      <form
        onSubmit={saveDraft}
        className="mt-6 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div>
          <label
            htmlFor="leave-type"
            className="block text-sm font-semibold text-slate-700"
          >
            ประเภทการลา
          </label>

          <select
            id="leave-type"
            required
            value={form.leaveTypeCode}
            onChange={(event) => update("leaveTypeCode", event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">เลือกประเภทการลา</option>
            {leaveTypes.map((item) => (
              <option key={item.code} value={item.code}>
                {item.nameTh}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="leave-start"
              className="block text-sm font-semibold text-slate-700"
            >
              วันเริ่มลา
            </label>
            <input
              id="leave-start"
              type="date"
              required
              value={form.startDate}
              onChange={(event) => update("startDate", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3"
            />
          </div>

          <div>
            <label
              htmlFor="leave-end"
              className="block text-sm font-semibold text-slate-700"
            >
              วันสิ้นสุดการลา
            </label>
            <input
              id="leave-end"
              type="date"
              required
              min={form.startDate || undefined}
              value={form.endDate}
              onChange={(event) => update("endDate", event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="leave-day-part"
            className="block text-sm font-semibold text-slate-700"
          >
            ช่วงเวลา
          </label>
          <select
            id="leave-day-part"
            value={form.dayPart}
            onChange={(event) => update("dayPart", event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="FULL_DAY">เต็มวัน</option>
            <option
              value="MORNING"
              disabled={Boolean(
                form.startDate &&
                form.endDate &&
                form.startDate !== form.endDate,
              )}
            >
              ครึ่งวันเช้า
            </option>
            <option
              value="AFTERNOON"
              disabled={Boolean(
                form.startDate &&
                form.endDate &&
                form.startDate !== form.endDate,
              )}
            >
              ครึ่งวันบ่าย
            </option>
          </select>
        </div>

        <div>
          <label
            htmlFor="leave-reason"
            className="block text-sm font-semibold text-slate-700"
          >
            รายละเอียดการลา
          </label>
          <textarea
            id="leave-reason"
            required={form.leaveTypeCode === "OTHER"}
            rows={4}
            maxLength={2000}
            value={form.reason}
            onChange={(event) => update("reason", event.target.value)}
            placeholder="กรอกรายละเอียดที่ต้องการแจ้งผู้อนุมัติ"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
          <p className="mt-1 text-xs text-slate-500">
            {form.leaveTypeCode === "OTHER" ? "การลาอื่น ๆ ต้องระบุรายละเอียด · " : ""}รายละเอียดนี้ไม่แสดงต่อเพื่อนร่วมงานใน Calendar
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href={leaveHref}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700"
          >
            ยกเลิก
          </Link>

          <button
            type="submit"
            disabled={saving || leaveTypes.length === 0}
            className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกฉบับร่าง"}
          </button>
        </div>
      </form>
    </main>
  );
}
