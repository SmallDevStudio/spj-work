"use client";

import { useMemo, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

const statusNames = {
  DRAFT: "ฉบับร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

function errorMessage(error) {
  return error?.response?.data?.error?.message ?? error?.message ?? "ดำเนินการไม่สำเร็จ";
}

export default function LeaveHistoryClient({ initial, companies, canDelete }) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const companyNames = Object.fromEntries(
    companies.map((company) => [company.id, company.nameTh || company.code]),
  );

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return items.filter((item) =>
      (!companyId || item.companyId === companyId) &&
      (!status || item.status === status) &&
      (includeDeleted || !item.isDeleted) &&
      (!term || [item.employeeCode, item.employeeId]
        .some((value) => value?.toLowerCase().includes(term))),
    );
  }, [items, companyId, status, search, includeDeleted]);

  async function loadPage(nextCursor, replace = false, showDeleted = includeDeleted) {
    setBusy(true);
    setError("");

    try {
      const response = await apiClient.get("/leave/requests", {
        params: {
          ...(nextCursor ? { cursor: nextCursor } : {}),
          ...(showDeleted ? { includeDeleted: "true" } : {}),
        },
      });

      const result = response.data.data;
      setItems((current) => replace ? result.items : [...current, ...result.items]);
      setCursor(result.nextCursor);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function showDetail(id) {
    setBusy(true);
    setError("");
    setNotice("");
    setReason("");

    try {
      const response = await apiClient.get(`/leave/requests/${encodeURIComponent(id)}`);
      setDetail(response.data.data.item);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!detail || reason.trim().length < 3 || busy) {
      setError("กรุณาระบุเหตุผลการลบอย่างน้อย 3 ตัวอักษร");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();
      const response = await apiClient.delete(
        `/leave/requests/${encodeURIComponent(detail.id)}`,
        {
          data: { reason: reason.trim() },
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const result = response.data.data.item;
      setItems((current) => current.map((item) =>
        item.id === detail.id ? { ...item, isDeleted: true, deletedReason: reason.trim() } : item,
      ));
      setDetail({ ...detail, isDeleted: true, deletedReason: reason.trim() });
      setNotice(
        `ลบใบลาแล้ว คืนยอดที่ใช้ ${result.restoredDays} วัน และปล่อยยอดที่จอง ${result.releasedPendingDays} วัน`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <h1 className="text-3xl font-black text-slate-950">ประวัติการลา</h1>
      <p className="mt-2 text-sm text-slate-600">
        ดูใบลาตามสิทธิ์บริษัท รายการที่ลบยังคงอยู่ใน Audit Log
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="ค้นหารหัสพนักงาน"
          aria-label="ค้นหารหัสพนักงาน"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}
          aria-label="กรองบริษัท" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">ทุกบริษัทที่มีสิทธิ์</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.nameTh || company.code}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}
          aria-label="กรองสถานะ" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">ทุกสถานะ</option>
          {Object.entries(statusNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
        </select>
        {canDelete ? (
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-3">
            <input type="checkbox" checked={includeDeleted} onChange={(event) => {
              setIncludeDeleted(event.target.checked);
              setDetail(null);
              loadPage(null, true, event.target.checked);
            }} />
            แสดงรายการที่ลบแล้ว
          </label>
        ) : null}
      </div>

      {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">พนักงาน</th><th className="px-4 py-3">บริษัท</th>
              <th className="px-4 py-3">วันลา</th><th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">จำนวนวัน</th><th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold">{item.employeeCode || item.employeeId}</td>
                <td className="px-4 py-3">{companyNames[item.companyId] || item.companyId}</td>
                <td className="px-4 py-3">{item.startDate} – {item.endDate}</td>
                <td className="px-4 py-3">{item.leaveTypeCode}</td>
                <td className="px-4 py-3">{item.requestedDays ?? "–"}</td>
                <td className="px-4 py-3">{item.isDeleted ? "ลบแล้ว" : statusNames[item.status] || item.status}</td>
                <td className="px-4 py-3"><button type="button" onClick={() => showDetail(item.id)} className="font-semibold text-sky-700 hover:underline">เปิดดู</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleItems.length === 0 ? <p className="p-5 text-sm text-slate-500">ไม่มีรายการในหน้าที่โหลด</p> : null}
      </div>

      {cursor ? <button type="button" disabled={busy} onClick={() => loadPage(cursor)}
        className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50">
        {busy ? "กำลังโหลด" : "โหลดรายการเพิ่มเติม"}
      </button> : null}

      {detail ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">ใบลา {detail.employeeCode || detail.employeeId}</h2>
            <button type="button" onClick={() => setDetail(null)} className="text-sm text-slate-500">ปิด</button>
          </div>
          <p className="mt-3 text-sm">{detail.startDate} – {detail.endDate} · {detail.requestedDays ?? "–"} วัน · {statusNames[detail.status] || detail.status}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">รายละเอียด: {detail.reason || "–"}</p>
          <h3 className="mt-5 font-semibold">ผลการพิจารณา</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {detail.approval?.steps?.map((step, index) => (
              <li key={`${step.key}-${index}`} className="rounded-xl bg-slate-50 p-3">
                {step.key === "HR" ? "HR" : "หัวหน้า"}: {step.status}
                {step.decidedByEmployeeId ? ` โดย ${step.decidedByEmployeeId}` : ""}
                {step.comment ? <p className="mt-1 whitespace-pre-wrap">ความเห็น: {step.comment}</p> : null}
                {step.financialDisposition ? <p className="mt-1">การจัดการวันเกิน: {step.financialDisposition} · {step.financialReason}</p> : null}
              </li>
            )) ?? <li>ยังไม่มีการพิจารณา</li>}
          </ul>
          {detail.isDeleted ? <p className="mt-4 text-sm text-rose-700">ลบแล้ว: {detail.deletedReason}</p> : null}
          {canDelete && !detail.isDeleted ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <label htmlFor="delete-leave-reason" className="block text-sm font-semibold text-rose-800">เหตุผลการลบใบลา</label>
              <textarea id="delete-leave-reason" value={reason} onChange={(event) => setReason(event.target.value)}
                maxLength={1000} rows={2} className="mt-2 w-full rounded-lg border border-rose-200 bg-white p-2 text-sm" />
              <button type="button" disabled={busy || reason.trim().length < 3} onClick={remove}
                className="mt-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                ลบใบลาและคืนยอดวันลา
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
