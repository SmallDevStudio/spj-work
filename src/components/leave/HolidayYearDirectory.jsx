"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { HiOutlineArrowLeft, HiOutlinePlus, HiOutlinePrinter } from "react-icons/hi2";
import ManagePageHero from "@/components/layout/ManagePageHero";
import {
  getHolidayCalendarErrorMessage,
  getHolidayCalendarRequest,
  prepareHolidayAnnouncementRequest,
  publishHolidayCalendarRequest,
} from "@/services/leave/leave-calendar.api";

const currentYear = Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok", year: "numeric",
}).format(new Date()));

function thaiDay(date) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

export default function HolidayYearDirectory({ years, companies }) {
  const router = useRouter();
  const [newYear, setNewYear] = useState(currentYear);
  const [selectedYear, setSelectedYear] = useState(null);
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [printData, setPrintData] = useState(null);
  const [busyYear, setBusyYear] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!printData) return;
    const timer = window.setTimeout(() => window.print(), 100);
    return () => window.clearTimeout(timer);
  }, [printData]);

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
    } catch (requestError) {
      setError(getHolidayCalendarErrorMessage(requestError));
    } finally {
      setBusyYear(null);
    }
  }

  async function print() {
    if (!selectedYear || !companyId) return;
    setBusyYear(selectedYear);
    setError("");
    try {
      const data = await prepareHolidayAnnouncementRequest({ year: selectedYear, companyId });
      setPrintData(data);
    } catch (requestError) {
      setError(getHolidayCalendarErrorMessage(requestError));
    } finally {
      setBusyYear(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <div className="print:hidden">
        <ManagePageHero eyebrow="Leave Management" title="ปฏิทินวันหยุด" description="จัดการวันหยุดเป็นรายปี ตรวจฉบับร่าง แล้วเผยแพร่ก่อนใช้งานและออกประกาศ" />
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 print:hidden">{error}</p>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
        <h2 className="text-lg font-bold text-slate-950">เพิ่มปีปฏิทิน</h2>
        <p className="mt-1 text-sm text-slate-500">สร้างปีใหม่แล้วเลือกวันหยุดจาก Google หรือเพิ่มเองในหน้าถัดไป</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">ปี ค.ศ.
            <input type="number" min="2000" max="2100" value={newYear} onChange={(event) => setNewYear(Number(event.target.value))} className="ml-2 min-h-11 w-28 rounded-xl border border-slate-300 px-3" />
          </label>
          <button type="button" disabled={!Number.isInteger(newYear) || newYear < 2000 || newYear > 2100} onClick={() => router.push(`/manage/leave/holidays/new?year=${newYear}`)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"><HiOutlinePlus className="size-5" />เพิ่มปี พ.ศ. {Number.isFinite(newYear) ? newYear + 543 : "—"}</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm print:hidden">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-950">ปีที่สร้างแล้ว ({years.length})</h2></div>
        {years.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">ยังไม่มีปฏิทินวันหยุด</p> :
          <div className="divide-y divide-slate-100">{years.map((item) => (
            <div key={item.year} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold text-slate-950">ปี พ.ศ. {item.year + 543} <span className="text-sm font-normal text-slate-500">({item.year})</span></p>
                <p className="mt-1 text-sm text-slate-500">{item.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"} · {item.holidayCount} วัน{item.hasPendingDraft ? " · มีฉบับแก้ไขรอเผยแพร่" : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/manage/leave/holidays/${item.year}`} className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold">แก้ไข</Link>
                {(item.status === "DRAFT" || item.hasPendingDraft) && <button type="button" disabled={busyYear !== null} onClick={() => publish(item.year)} className="min-h-10 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">เผยแพร่</button>}
                {item.status === "PUBLISHED" && <button type="button" onClick={() => { setSelectedYear(item.year); setPrintData(null); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold"><HiOutlinePrinter className="size-4" />พิมพ์ประกาศ</button>}
              </div>
            </div>
          ))}</div>}
      </section>

      {selectedYear && <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">พิมพ์ประกาศวันหยุด พ.ศ. {selectedYear + 543}</h2><button type="button" onClick={() => setSelectedYear(null)} className="text-sm underline">ปิด</button></div>
        <label className="mt-3 block text-sm">บริษัท
          <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="ml-2 min-h-11 rounded-xl border border-slate-300 bg-white px-3"><option value="">เลือกบริษัท</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.code} · {company.nameTh}</option>)}</select>
        </label>
        <button type="button" disabled={!companyId || busyYear !== null} onClick={print} className="mt-3 min-h-11 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50">เตรียมเอกสารและพิมพ์</button>
      </section>}

      <div id="holiday-print" className="hidden bg-white text-black print:block">
        {printData && <article className="mx-auto max-w-[18cm] font-serif text-[14pt] leading-[1.8]">
          <header className="text-center">
            {printData.company.logoUrl && <Image unoptimized src={printData.company.logoUrl} alt="" width={160} height={80} className="mx-auto mb-4 max-h-20 max-w-40 object-contain" />}
            <h1 className="text-xl font-bold">ประกาศบริษัท {printData.company.name}</h1>
            <p className="mt-4">เรื่อง วันหยุดประจำปี พ.ศ. {printData.year + 543}</p>
          </header>
          <p className="mt-10 indent-10">บริษัท {printData.company.name} ขอประกาศวันหยุดประจำปี พ.ศ. {printData.year + 543} ให้พนักงานทราบดังนี้</p>
          <div className="mt-5 space-y-1">{printData.holidays.map((holiday) => <div key={holiday.date} className="grid grid-cols-[10rem_1fr] gap-4 break-inside-avoid"><span>{thaiDay(holiday.date)}</span><span>{holiday.nameTh}</span></div>)}</div>
          <p className="mt-12">ประกาศมาเพื่อทราบโดยทั่วกัน</p>
          <div className="mt-20 text-center sm:ml-auto sm:w-72"><p>ลงชื่อ ................................................</p><p className="mt-2">(................................................)</p><p className="mt-2">ผู้บริหารของบริษัท</p></div>
        </article>}
      </div>
      <style>{`@media print { body * { visibility: hidden !important; } #holiday-print, #holiday-print * { visibility: visible !important; } #holiday-print { position: absolute !important; inset: 0 !important; width: 100% !important; padding: 1.5cm !important; display: block !important; } @page { size: A4; margin: 0; } }`}</style>
      <Link href="/manage/leave" className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 print:hidden"><HiOutlineArrowLeft className="size-4" />กลับหน้าจัดการการลา</Link>
    </main>
  );
}
