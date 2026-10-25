"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiOutlinePrinter } from "react-icons/hi2";
import {
  getHolidayCalendarErrorMessage,
  prepareHolidayAnnouncementRequest,
} from "@/services/leave/leave-calendar.api";

const monthName = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "UTC" });

function displayDate(start, end) {
  const first = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  const days = first.getUTCDate() === last.getUTCDate()
    ? String(first.getUTCDate())
    : `${first.getUTCDate()}–${last.getUTCDate()}`;
  return `${days} ${monthName.format(first)}`;
}

function groupedHolidays(holidays) {
  const grouped = [];
  for (const holiday of holidays) {
    const previous = grouped.at(-1);
    const adjacent = previous &&
      new Date(`${previous.end}T12:00:00Z`).getTime() + 86_400_000 ===
        new Date(`${holiday.date}T12:00:00Z`).getTime();
    if (adjacent && previous.nameTh === holiday.nameTh &&
        previous.end.slice(0, 7) === holiday.date.slice(0, 7)) {
      previous.end = holiday.date;
    } else {
      grouped.push({ start: holiday.date, end: holiday.date, nameTh: holiday.nameTh });
    }
  }
  return grouped;
}

export default function HolidayAnnouncementPreview({ item, companyId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function print() {
    setBusy(true);
    setError("");
    try {
      await prepareHolidayAnnouncementRequest({
        year: item.year,
        companyId,
        executiveEmployeeId: item.executive.id,
        expectedRevision: item.revision,
      });
      window.print();
    } catch (cause) {
      setError(getHolidayCalendarErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 print:bg-white print:p-0">
    <div className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
      <div><h1 className="text-xl font-bold">ตัวอย่างประกาศวันหยุด พ.ศ. {item.year + 543}</h1><p className="text-sm text-slate-500">{item.company.name} · {item.executive.name} · revision {item.revision}</p></div>
      <div className="flex gap-2"><Link href="/manage/leave/holidays" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">กลับหน้ารายการ</Link><button type="button" disabled={busy} onClick={print} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold disabled:opacity-50"><HiOutlinePrinter className="size-5" />{busy ? "กำลังเตรียม" : "พิมพ์"}</button></div>
    </div>
    {error && <p role="alert" className="mx-auto mb-4 max-w-[210mm] rounded-xl bg-rose-50 p-4 text-sm text-rose-700 print:hidden">{error}</p>}
    <article className="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[20mm] py-[23mm] font-serif text-[13pt] leading-[1.8] shadow-lg print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="text-center">
        {item.company.logoUrl && <Image unoptimized src={item.company.logoUrl} alt={`โลโก้ ${item.company.name}`} width={144} height={72} className="mx-auto mb-4 max-h-[20mm] object-contain" />}
        <h2 className="text-[18pt] font-bold">ประกาศบริษัท {item.company.name}</h2>
        <p className="mt-8">เรื่อง วันหยุดประจำปี พ.ศ. {item.year + 543}</p>
      </header>
      <p className="mt-10 indent-10">บริษัท {item.company.name} ขอประกาศวันหยุดประจำปี พ.ศ. {item.year + 543} ให้พนักงานทราบดังนี้</p>
      <div className="mt-6 space-y-1">{groupedHolidays(item.holidays).map((holiday) => <div key={holiday.start} className="grid grid-cols-[8rem_1fr] gap-3 break-inside-avoid"><span>{displayDate(holiday.start, holiday.end)}</span><span>{holiday.nameTh}</span></div>)}</div>
      <p className="mt-12">ประกาศมาเพื่อทราบโดยทั่วกัน</p>
      <div className="mt-20 ml-auto w-72 max-w-full break-inside-avoid text-center"><p>ลงชื่อ ................................................</p><p className="mt-3">({item.executive.name})</p><p>ผู้บริหารของบริษัท</p></div>
    </article>
    <style>{`@media print { @page { size: A4; margin: 20mm; } body { margin: 0; } }`}</style>
  </main>;
}
