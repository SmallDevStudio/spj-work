"use client";

import Link from "next/link";
import { useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ"
  );
}

export default function LeaveHrTakeoverClient({ companies, employees }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [oldEmployeeId, setOldEmployeeId] = useState("");
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [preview, setPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function resetPreview() {
    setPreview(null);
    setSelectedIds([]);
    setError("");
    setSuccess("");
  }

  async function loadPreview() {
    if (!companyId || !oldEmployeeId) {
      setError("กรุณาเลือกบริษัทและ HR คนเดิม");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setSelectedIds([]);

    try {
      const response = await apiClient.get("/leave/approver-transfers", {
        params: {
          companyId,
          oldEmployeeId,
        },
      });

      setPreview(response.data?.data?.preview ?? null);
    } catch (requestError) {
      setPreview(null);
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function toggle(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function selectFirstBatch() {
    setSelectedIds((preview?.items ?? []).slice(0, 50).map((item) => item.id));
  }

  async function applyTakeover() {
    if (!newEmployeeId || selectedIds.length === 0 || selectedIds.length > 50) {
      setError("กรุณาเลือกผู้รับงานคนใหม่และใบลาไม่เกิน 50 ใบ");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/leave/approver-transfers",
        {
          companyId,
          oldEmployeeId,
          newEmployeeId,
          requestIds: selectedIds,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const transferred = response.data?.data?.result?.transferred;

      setSuccess(`โอนงาน HR สำเร็จ ${transferred} ใบ`);

      const nextResponse = await apiClient.get("/leave/approver-transfers", {
        params: { companyId, oldEmployeeId },
      });

      setPreview(nextResponse.data?.data?.preview ?? null);
      setSelectedIds([]);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setPreview(null);
      setSelectedIds([]);
    } finally {
      setSaving(false);
    }
  }

  const names = Object.fromEntries(
    employees.map((item) => [item.id, `${item.name} (${item.code})`]),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <div className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <Link
          href="/manage/leave"
          className="text-sm font-semibold text-amber-400 hover:underline"
        >
          ← กลับไปจัดการการลา
        </Link>

        <h1 className="mt-5 text-2xl font-black tracking-tight sm:text-3xl">
          โอนงาน HR ค้าง
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          ใช้เมื่อ HR คนเดิมลาออกหรือไม่สามารถรับงานได้
          การโอนจะเปลี่ยนเฉพาะผู้รับงานฝั่ง HR
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error} กรุณาโหลด preview ใหม่หากรายการเปลี่ยน
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-7">
        <label className="text-sm font-semibold text-slate-800">
          บริษัท
          <select
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              resetPreview();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-slate-800">
          HR คนเดิม
          <select
            value={oldEmployeeId}
            onChange={(event) => {
              setOldEmployeeId(event.target.value);
              resetPreview();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
          >
            <option value="">เลือกพนักงาน</option>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={loadPreview}
            disabled={loading}
            className="min-h-11 w-full rounded-xl bg-slate-900 px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "กำลังค้นหา..." : "ค้นงานค้าง"}
          </button>
        </div>
      </section>

      {preview ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">
              งานที่รอโอน {preview.total} ใบ
            </h2>

            {preview.total > 0 ? (
              <button
                type="button"
                onClick={selectFirstBatch}
                className="text-sm font-semibold text-sky-700 hover:underline"
              >
                เลือก 50 ใบแรก
              </button>
            ) : null}
          </div>

          {preview.total === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              ไม่มีใบลาที่รอ HR คนนี้
            </p>
          ) : (
            <>
              <div className="mt-4 max-h-[30rem] space-y-2 overflow-y-auto">
                {preview.items.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      disabled={
                        saving ||
                        (!selectedIds.includes(item.id) &&
                          selectedIds.length >= 50)
                      }
                      className="mt-1 size-5 accent-amber-500"
                    />

                    <span className="text-sm text-slate-700">
                      <strong className="text-slate-950">
                        {item.employeeCode || item.id}
                      </strong>
                      {" · "}
                      {item.startDate} ถึง {item.endDate}
                      {" · "}
                      {item.requestedDays} วัน
                    </span>
                  </label>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <label className="block text-sm font-semibold text-slate-800">
                  ผู้รับงาน HR คนใหม่
                  <select
                    value={newEmployeeId}
                    onChange={(event) => setNewEmployeeId(event.target.value)}
                    className="mt-2 min-h-11 w-full max-w-lg rounded-xl border border-slate-300 bg-white px-3"
                  >
                    <option value="">เลือกพนักงาน</option>
                    {employees
                      .filter(
                        (item) => item.linked && item.id !== oldEmployeeId,
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {names[item.id]}
                        </option>
                      ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={applyTakeover}
                  disabled={
                    saving || !newEmployeeId || selectedIds.length === 0
                  }
                  className="mt-4 min-h-11 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  {saving
                    ? "กำลังโอน..."
                    : `ยืนยันโอน ${selectedIds.length} ใบ`}
                </button>
              </div>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
