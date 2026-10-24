"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function message(error) {
  return error?.response?.data?.error?.message ?? error?.message ?? "ดำเนินการไม่สำเร็จ";
}

async function csrfHeaders() {
  const { csrfToken, headerName } = await getCsrfCredentials();
  return {
    "Content-Type": "application/json",
    [headerName]: csrfToken,
  };
}

export default function LeaveDevTestClient({ initialRun, userId }) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    dayPart: "FULL_DAY",
    countingBasis: "WORKING_DAYS",
    workWeek: "SPJ01",
    holidays: "",
    entitlementDays: 2,
    alreadyUsedDays: 0,
  });
  const [comment, setComment] = useState("ทดสอบการพิจารณาใบลา");
  const [financialDisposition, setFinancialDisposition] = useState("DEDUCT_PAY");
  const [financialReason, setFinancialReason] = useState("ทดสอบการจัดการวันลาเกินสิทธิ์");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function start(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await apiClient.post("/leave/dev-tests", {
        startDate: form.startDate,
        endDate: form.endDate,
        dayPart: form.dayPart,
        countingBasis: form.countingBasis,
        workingWeekdays: form.workWeek === "SPJ02"
          ? [1, 2, 3, 4, 5, 6]
          : [1, 2, 3, 4, 5],
        holidays: form.holidays.split(",").map((value) => value.trim()).filter(Boolean),
        entitlementDays: Number(form.entitlementDays),
        alreadyUsedDays: Number(form.alreadyUsedDays),
      }, { headers: await csrfHeaders() });

      const item = response.data.data.item;
      setRun(item);
      router.replace(`/manage/leave/dev-test?runId=${encodeURIComponent(item.id)}`);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function decide(track, decision) {
    setBusy(true);
    setError("");

    try {
      const response = await apiClient.post(
        `/leave/dev-tests/${encodeURIComponent(run.id)}/decisions`,
        {
          track,
          decision,
          comment,
          financialDisposition: track === "HR" && decision === "APPROVE"
            ? financialDisposition : null,
          financialReason: track === "HR" && decision === "APPROVE"
            ? financialReason : null,
        },
        { headers: await csrfHeaders() },
      );
      setRun(response.data.data.item);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");

    try {
      const response = await apiClient.delete(
        `/leave/dev-tests/${encodeURIComponent(run.id)}`,
        { headers: await csrfHeaders() },
      );
      setRun(response.data.data.item);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <Link href="/manage/leave" className="text-sm font-semibold text-sky-700">← กลับการลา</Link>
      <h1 className="mt-4 text-3xl font-black">Leave Dev Test</h1>
      <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
        จำลองพนักงาน หัวหน้า และ HR ในชุดข้อมูลทดสอบแยกจากใบลาจริง
        แต่ใช้กฎนับวันและการอนุมัติเดียวกัน เหตุการณ์แจ้งเตือนจะเข้าบัญชี SUPERADMIN ของคุณ
      </p>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}

      <form onSubmit={start} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-sm">วันเริ่มลา<input required type="date" name="startDate" value={form.startDate} onChange={change} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-sm">วันสิ้นสุด<input required type="date" name="endDate" value={form.endDate} onChange={change} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-sm">วันทำงานจำลอง<select name="workWeek" value={form.workWeek} onChange={change} className="mt-1 block w-full rounded-lg border p-2"><option value="SPJ01">SPJ01 จ–ศ</option><option value="SPJ02">SPJ02 จ–ส</option></select></label>
        <label className="text-sm">วิธีนับ<select name="countingBasis" value={form.countingBasis} onChange={change} className="mt-1 block w-full rounded-lg border p-2"><option value="WORKING_DAYS">วันทำงาน</option><option value="CALENDAR_DAYS">วันปฏิทิน</option></select></label>
        <label className="text-sm">ช่วงวัน<select name="dayPart" value={form.dayPart} onChange={change} className="mt-1 block w-full rounded-lg border p-2"><option value="FULL_DAY">เต็มวัน</option><option value="MORNING">ครึ่งวันเช้า</option><option value="AFTERNOON">ครึ่งวันบ่าย</option></select></label>
        <label className="text-sm">วันหยุดจำลอง คั่นด้วยจุลภาค<input name="holidays" value={form.holidays} onChange={change} placeholder="2026-12-10,2026-12-31" className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-sm">สิทธิ์วันลา<input type="number" min="0" max="366" step="0.5" name="entitlementDays" value={form.entitlementDays} onChange={change} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <label className="text-sm">ใช้ไปก่อนหน้า<input type="number" min="0" max="366" step="0.5" name="alreadyUsedDays" value={form.alreadyUsedDays} onChange={change} className="mt-1 block w-full rounded-lg border p-2" /></label>
        <button disabled={busy} className="rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">สร้างใบลาทดสอบ</button>
      </form>

      {run ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">รายการทดสอบ {run.id}</h2>
            <Link href={`/${encodeURIComponent(userId)}/notifications`} className="text-sm font-semibold text-sky-700">ดูการแจ้งเตือน →</Link>
          </div>
          <p className="mt-3 text-sm">สถานะ: <strong>{run.isDeleted ? "DELETED" : run.status}</strong> · นับ {run.requestedDays} วัน · ครอบคลุม {run.coveredDays} วัน · เกิน {run.excessDays} วัน</p>
          <p className="mt-2 text-sm">คงเหลือ {run.balance.remainingDays} วัน · หลังกันใบที่รอ {run.balance.remainingAfterPendingDays} วัน</p>
          <p className="mt-2 text-xs text-slate-500">วันที่นับ: {run.countedDates.join(", ")} · วันที่ไม่นับ: {run.excludedDates.join(", ") || "ไม่มี"}</p>
          <label className="mt-5 block text-sm">ความคิดเห็น<textarea value={comment} onChange={(event) => setComment(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
          {run.excessDays > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">การจัดการวันเกิน<select value={financialDisposition} onChange={(event) => setFinancialDisposition(event.target.value)} className="mt-1 block w-full rounded-lg border p-2"><option value="DEDUCT_PAY">หักเงิน</option><option value="PAID_EXCEPTION">ยกเว้นโดยรับค่าจ้าง</option></select></label>
              <label className="text-sm">เหตุผล HR<input value={financialReason} onChange={(event) => setFinancialReason(event.target.value)} className="mt-1 block w-full rounded-lg border p-2" /></label>
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {run.status === "PENDING_APPROVAL" && !run.isDeleted ? run.approval.steps.map((step) =>
              step.status === "PENDING" ? (
                <div key={step.key || step.order} className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => decide(step.key || "MANAGER", "APPROVE")} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">{step.key || "MANAGER"} อนุมัติ</button>
                  <button type="button" disabled={busy} onClick={() => decide(step.key || "MANAGER", "REJECT")} className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800">{step.key || "MANAGER"} ไม่อนุมัติ</button>
                </div>
              ) : null,
            ) : null}
            {!run.isDeleted ? <button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">ลบรายการทดสอบและคืนยอด</button> : null}
          </div>
          <ul className="mt-5 space-y-2 text-sm">
            {run.approval.steps.map((step) => <li key={step.key || step.order}>{step.key || "MANAGER"}: {step.status} {step.decidedByEmployeeId || ""}</li>)}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
