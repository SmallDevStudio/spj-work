"use client";

import { useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

const initialForm = {
  code: "",
  nameTh: "",
  description: "",
  countingBasis: "WORKING_DAYS",
  payTreatment: "PER_POLICY",
  entitlementDays: "",
  paidDaysCap: "",
  reasonRequired: true,
  effectiveFrom: "",
  status: "ACTIVE",
};

function getErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length) {
    return apiError.details.map((detail) => detail.message).join(", ");
  }

  return apiError?.message ?? error?.message ?? "เพิ่มประเภทการลาไม่สำเร็จ";
}

export default function LeaveTypeCreate({ companyId, onClose, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value, checked, type } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "code"
            ? value.toUpperCase()
            : value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/leave/types",
        {
          companyId,
          code: form.code.trim(),
          nameTh: form.nameTh.trim(),
          description: form.description.trim() || null,
          countingBasis: form.countingBasis,
          payTreatment: form.payTreatment,
          entitlementDays:
            form.entitlementDays === "" ? null : Number(form.entitlementDays),
          paidDaysCap:
            form.payTreatment === "UNPAID"
              ? 0
              : form.paidDaysCap === ""
                ? null
                : Number(form.paidDaysCap),
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

      const item = response.data?.data?.item;

      if (!item) {
        throw new Error("ระบบไม่ได้ส่งประเภทการลาที่สร้างกลับมา");
      }

      onCreated(item);
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
        aria-labelledby="leave-type-create-title"
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="leave-type-create-title"
              className="text-xl font-bold text-slate-950 dark:text-white"
            >
              เพิ่มประเภทการลา
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              สร้างประเภทใหม่สำหรับบริษัทที่เลือก
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              รหัสประเภท *
              <input
                required
                name="code"
                maxLength={40}
                pattern="[A-Z][A-Z0-9_]{1,39}"
                value={form.code}
                onChange={change}
                placeholder="เช่น FAMILY_CARE"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold">
              ชื่อประเภท *
              <input
                required
                name="nameTh"
                maxLength={150}
                value={form.nameTh}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

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
            <label className="text-sm font-semibold">
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

            <label className="text-sm font-semibold">
              การรับค่าจ้าง
              <select
                name="payTreatment"
                value={form.payTreatment}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="PER_POLICY">ตามนโยบาย</option>
                <option value="PAID">รับค่าจ้าง</option>
                <option value="PARTIALLY_PAID">รับค่าจ้างบางส่วน</option>
                <option value="UNPAID">ไม่รับค่าจ้าง</option>
              </select>
            </label>

            <label className="text-sm font-semibold">
              จำนวนวันตามนโยบาย
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                name="entitlementDays"
                value={form.entitlementDays}
                onChange={change}
                placeholder="เว้นว่างหากยังไม่กำหนด"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold">
              วันจ่ายค่าจ้างสูงสุด
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                name="paidDaysCap"
                value={form.payTreatment === "UNPAID" ? "0" : form.paidDaysCap}
                onChange={change}
                disabled={form.payTreatment === "UNPAID"}
                placeholder="เว้นว่างหากยังไม่กำหนด"
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold">
              วันที่เริ่มใช้ *
              <input
                type="date"
                required
                name="effectiveFrom"
                value={form.effectiveFrom}
                onChange={change}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold">
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
              {saving ? "กำลังบันทึก..." : "เพิ่มประเภทการลา"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
