"use client";

import { useState } from "react";
import Link from "next/link";

export default function HolidayAnnouncementOptions({ year, companies, executives }) {
  const [companyId, setCompanyId] = useState("");
  const [executiveEmployeeId, setExecutiveEmployeeId] = useState("");
  const labels = new Map(companies.map((company) => [company.id, company.code]));

  return <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
    <section className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-bold uppercase tracking-widest text-amber-600">Holiday announcement</p>
      <h1 className="mt-2 text-2xl font-black">พิมพ์ประกาศวันหยุด พ.ศ. {year + 543}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">เลือกบริษัทและผู้บริหารที่จะลงชื่อ แล้วเปิดตัวอย่างเอกสารก่อนพิมพ์</p>
      <form method="get" action="/manage/leave/holidays/print" className="mt-6 space-y-5">
        <input type="hidden" name="year" value={year} />
        <label className="block text-sm font-semibold">บริษัท *
          <select required name="companyId" value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">
            <option value="">เลือกบริษัท</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.code} · {company.nameTh}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">ชื่อผู้บริหาร *
          <select required name="executiveEmployeeId" value={executiveEmployeeId} onChange={(event) => setExecutiveEmployeeId(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3">
            <option value="">เลือกผู้บริหารจากข้อมูลพนักงาน</option>
            {executives.map((person) => <option key={person.id} value={person.id}>{person.name}{person.positionTitle ? ` · ${person.positionTitle}` : ""} ({labels.get(person.companyId) ?? "บริษัทอื่น"})</option>)}
          </select>
        </label>
        <p className="text-xs leading-5 text-slate-500">แสดงผู้ที่มีตำแหน่งผู้บริหารขึ้นก่อน หากยังไม่ได้กำหนดตำแหน่ง สามารถเลือกจากรายชื่อพนักงานที่มีสิทธิ์ได้</p>
        <div className="flex flex-wrap gap-3"><button type="submit" className="min-h-11 rounded-xl bg-amber-400 px-5 font-bold">ดูตัวอย่างเอกสาร</button><Link href="/manage/leave/holidays" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 font-semibold">กลับหน้ารายการ</Link></div>
      </form>
    </section>
  </main>;
}
