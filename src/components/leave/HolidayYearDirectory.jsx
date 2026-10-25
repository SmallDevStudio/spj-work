"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlinePrinter } from "react-icons/hi2";

import ManagePageHero from "@/components/layout/ManagePageHero";
import TablePagination from "@/components/common/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import {
  getHolidayCalendarErrorMessage,
  getHolidayCalendarRequest,
  publishHolidayCalendarRequest,
} from "@/services/leave/leave-calendar.api";

const currentYear = Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok", year: "numeric",
}).format(new Date()));

export default function HolidayYearDirectory({ years }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [newYear, setNewYear] = useState(currentYear);
  const [busyYear, setBusyYear] = useState(null);
  const [error, setError] = useState("");
  const pagination = useTablePagination(years);

  function createYear(event) {
    event.preventDefault();
    if (!Number.isInteger(newYear) || newYear < 2000 || newYear > 2100) return;
    router.push(`/manage/leave/holidays/new?year=${newYear}`);
  }

  async function publish(year) {
    if (!window.confirm(`ตรวจรายการวันหยุดปี พ.ศ. ${year + 543} ครบแล้ว และต้องการเผยแพร่ใช่ไหม?`)) return;
    setBusyYear(year);
    setError("");
    try {
      const item = await getHolidayCalendarRequest(year);
      const revision = item?.pendingDraft?.revision ?? item?.revision;
      if (!revision || (!item?.pendingDraft && item?.status !== "DRAFT")) {
        throw new Error("ยังไม่มีฉบับร่างให้เผยแพร่");
      }
      await publishHolidayCalendarRequest({ year, expectedRevision: revision, confirmedComplete: true });
      router.refresh();
    } catch (cause) {
      setError(getHolidayCalendarErrorMessage(cause));
    } finally {
      setBusyYear(null);
    }
  }

  return <main className="mx-auto w-full max-w-7xl space-y-6">
    <ManagePageHero eyebrow="Leave Management" title="ปฏิทินวันหยุด" description="รายการวันหยุดรายปี เลือกแก้ไข เผยแพร่ หรือพิมพ์ประกาศได้จากตาราง"
      action={<button type="button" onClick={() => setShowCreate((old) => !old)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950"><HiOutlinePlus className="size-5" />เพิ่มปีปฏิทิน</button>} />

    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

    {showCreate && <form onSubmit={createYear} className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="text-sm font-semibold text-slate-700">ปี ค.ศ.
        <input type="number" required min="2000" max="2100" value={newYear} onChange={(event) => setNewYear(Number(event.target.value))} className="mt-2 block min-h-11 w-32 rounded-xl border border-slate-300 bg-white px-3" />
      </label>
      <button type="submit" className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950">ไปหน้าเพิ่มวันหยุด</button>
      <button type="button" onClick={() => setShowCreate(false)} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold">ยกเลิก</button>
    </form>}

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <h2 className="font-bold text-slate-950 dark:text-white">วันหยุด</h2>
        <span className="text-sm text-slate-500">{years.length} ปี</span>
      </div>
      {years.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">ยังไม่มีปีปฏิทิน กด “เพิ่มปีปฏิทิน” เพื่อเริ่มต้น</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr>
            <th scope="col" className="px-5 py-4 font-semibold">วันหยุด</th>
            <th scope="col" className="px-5 py-4 font-semibold">จำนวนวันหยุด</th>
            <th scope="col" className="px-5 py-4 font-semibold">สถานะ</th>
            <th scope="col" className="px-5 py-4 text-right font-semibold">จัดการ</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{pagination.items.map((item) => <tr key={item.year} className="text-slate-700 hover:bg-slate-50/70 dark:text-slate-200 dark:hover:bg-slate-800/50">
            <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-950 dark:text-white">{item.year} - พ.ศ. {item.year + 543}</td>
            <td className="px-5 py-4">{item.holidayCount} วัน</td>
            <td className="px-5 py-4">{item.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}{item.hasPendingDraft ? " · มีฉบับแก้ไข" : ""}</td>
            <td className="whitespace-nowrap px-5 py-4 text-right">
              <Link href={`/manage/leave/holidays/${item.year}`} className="font-semibold text-sky-700 dark:text-sky-300">แก้ไข</Link>
              {(item.status === "DRAFT" || item.hasPendingDraft) ? <button type="button" disabled={busyYear !== null} onClick={() => publish(item.year)} className="ml-4 font-semibold text-amber-700 disabled:opacity-50 dark:text-amber-300">เผยแพร่</button> : <span className="ml-4 text-slate-400" title="เผยแพร่แล้ว">เผยแพร่แล้ว</span>}
              {item.status === "PUBLISHED" ? <Link href={`/manage/leave/holidays/print?year=${item.year}`} target="_blank" rel="noopener noreferrer" aria-label={`เปิดหน้าพิมพ์ประกาศปี ${item.year + 543}`} className="ml-4 inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-200"><HiOutlinePrinter className="size-4" />พิมพ์</Link> : <span className="ml-4 text-slate-400" title="เผยแพร่ก่อนจึงพิมพ์ได้">พิมพ์</span>}
            </td>
          </tr>)}</tbody>
        </table></div>}
      <TablePagination id="holiday-years" pagination={pagination} />
    </section>
    <Link href="/manage/leave" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700"><HiOutlineArrowLeft className="size-4" />กลับหน้าจัดการการลา</Link>
  </main>;
}
