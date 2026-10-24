"use client";

import { useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function daysToInput(value) {
  return value === null || value === undefined ? "" : String(value);
}

function inputToDays(value) {
  return value === "" ? null : Number(value);
}

function getErrorMessage(error) {
  const details = error?.response?.data?.error?.details;

  if (Array.isArray(details) && details.length > 0) {
    return details.map((item) => item.message).join(", ");
  }

  return (
    error?.response?.data?.error?.message ?? error?.message ?? "บันทึกไม่สำเร็จ"
  );
}

export default function LeaveTypeEditor({ item, companyId, onClose, onSaved }) {
  const [form, setForm] = useState({
    nameTh: item.nameTh,
    description: item.description ?? "",
    countingBasis: item.countingBasis,
    payTreatment: item.payTreatment,
    entitlementDays: daysToInput(item.entitlementDays),
    paidDaysCap: daysToInput(item.paidDaysCap),
    reasonRequired: item.reasonRequired,
    effectiveFrom: "",
    status: item.status,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.put(
        `/leave/types/${encodeURIComponent(item.code)}`,
        {
          companyId,
          code: item.code,
          nameTh: form.nameTh.trim(),
          description: form.description.trim() || null,
          countingBasis: form.countingBasis,
          payTreatment: form.payTreatment,
          entitlementDays: inputToDays(form.entitlementDays),
          paidDaysCap: inputToDays(form.paidDaysCap),
          reasonRequired: form.reasonRequired,
          effectiveFrom: form.effectiveFrom,
          status: form.status,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const updated = response.data?.data?.item;

      if (!updated) {
        throw new Error("ระบบไม่ได้ส่งข้อมูลที่บันทึกกลับมา");
      }

      onSaved(updated);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-type-editor-title"
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="leave-type-editor-title"
              className="text-xl font-bold text-slate-950 dark:text-white"
            >
              แก้ประเภทการลา: {item.nameTh}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Revision ปัจจุบัน {item.revision ?? 1} เริ่มใช้{" "}
              {item.effectiveFrom}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="ปิด"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ปิด
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block text-sm font-semibold">
            ชื่อประเภทการลา
            <input
              required
              maxLength={150}
              name="nameTh"
              value={form.nameTh}
              onChange={change}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <label className="block text-sm font-semibold">
            รายละเอียด
            <textarea
              name="description"
              rows={2}
              maxLength={500}
              value={form.description}
              onChange={change}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              วิธีนับวันลา
              <select
                name="countingBasis"
                value={form.countingBasis}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="WORKING_DAYS">วันทำงาน</option>
                <option value="CALENDAR_DAYS">วันปฏิทิน</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              การรับค่าจ้าง
              <select
                name="payTreatment"
                value={form.payTreatment}
                onChange={change}
                disabled={item.code === "UNPAID"}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="PAID">รับค่าจ้าง</option>
                <option value="PARTIALLY_PAID">รับค่าจ้างบางส่วน</option>
                <option value="UNPAID">ไม่รับค่าจ้าง</option>
                <option value="PER_POLICY">ตามนโยบาย</option>
              </select>
            </label>

            <label className="block text-sm font-semibold">
              จำนวนวันตามนโยบาย
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                name="entitlementDays"
                value={form.entitlementDays}
                onChange={change}
                placeholder="เว้นว่างหากกำหนดใน Leave Template"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-semibold">
              วันจ่ายค่าจ้างสูงสุด
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                name="paidDaysCap"
                value={form.paidDaysCap}
                onChange={change}
                disabled={item.code === "UNPAID"}
                placeholder="เว้นว่างหากกำหนดในนโยบาย"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-semibold">
              Revision ใหม่เริ่มใช้วันที่ *
              <input
                type="date"
                required
                name="effectiveFrom"
                value={form.effectiveFrom}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="block text-sm font-semibold">
              สถานะ
              <select
                name="status"
                value={form.status}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="ACTIVE">ใช้งาน</option>
                <option value="INACTIVE">ไม่ใช้งาน</option>
              </select>
            </label>
          </div>

          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="reasonRequired"
              checked={form.reasonRequired}
              onChange={change}
              className="size-5 accent-amber-500"
            />
            ต้องกรอกรายละเอียดเมื่อยื่นลา
          </label>

          <p className="text-xs leading-5 text-slate-500">
            วันที่เริ่มใช้ต้องหลัง {item.effectiveFrom}
            และ revision เดิมจะยังอยู่ในประวัติ
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold dark:border-slate-700"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก revision ใหม่"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
