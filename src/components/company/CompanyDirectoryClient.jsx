"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HiArrowLeft, HiPlus } from "react-icons/hi2";
import ImageUploadDialog, { ImagePlaceholder } from "@/components/common/ImageUploadDialog";
import ManagePageHero from "@/components/layout/ManagePageHero";
import TablePagination from "@/components/common/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import CompanyWorkScheduleClient, { formatWorkingDays } from "@/components/company/CompanyWorkScheduleClient";
import {
  createCompanyRequest, deleteCompanyRequest, getCompaniesRequest,
  getCompanyApiErrorMessage, updateCompanyRequest,
} from "@/services/company/company.api";

const blank = { code: "", nameTh: "", description: "", address: "", phoneNumber: "", email: "", logoUrl: "", status: "ACTIVE" };
const inputClass = "mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-950 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function CompanyLogo({ company, size = 64 }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" style={{ width: size, height: size }}>
    {company.logoUrl && !failed ? <Image unoptimized src={company.logoUrl} width={size} height={size} alt={`โลโก้ ${company.nameTh}`} className="h-full w-full object-contain" onError={() => setFailed(true)} /> :
      <ImagePlaceholder size={size} />}
  </div>;
}

function CompanyForm({ form, setForm, editing, busy, onSubmit, onCancel, onUploadLogo }) {
  const fields = [
    { key: "nameTh", label: "ชื่อบริษัท", required: true, maxLength: 150 },
    { key: "email", label: "อีเมล", type: "email", maxLength: 254 },
    { key: "phoneNumber", label: "เบอร์โทร", type: "tel", maxLength: 50 },
    { key: "address", label: "ที่อยู่", maxLength: 1000 },
  ];
  return <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-4"><button type="button" disabled={!editing || busy} onClick={onUploadLogo} aria-label="อัปโหลดโลโก้บริษัท" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-amber-500 disabled:cursor-default"><CompanyLogo key={form.logoUrl} company={form} size={96} /></button>
      <div><h2 className="text-lg font-bold text-slate-950 dark:text-white">ข้อมูลบริษัท</h2>
        <p className="text-sm text-slate-500">{editing ? "กดที่รูปเพื่ออัปโหลดโลโก้ · แนะนำ 512 × 512 px · ไม่เกิน 2 MB" : "บันทึกบริษัทก่อน แล้วจึงอัปโหลดโลโก้ได้"}</p></div></div>
    <div className="grid gap-5 sm:grid-cols-2">
      {!editing && <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">รหัสบริษัท *
        <input required maxLength={20} value={form.code} onChange={(event) => setForm((old) => ({ ...old, code: event.target.value.toUpperCase() }))} className={inputClass} /></label>}
      {fields.map((field) => <label key={field.key} className="text-sm font-semibold text-slate-700 dark:text-slate-200">{field.label}{field.required ? " *" : ""}
        <input required={field.required} maxLength={field.maxLength} type={field.type ?? "text"} value={form[field.key]} onChange={(event) => setForm((old) => ({ ...old, [field.key]: event.target.value }))} className={inputClass} /></label>)}
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">สถานะ
        <select value={form.status} onChange={(event) => setForm((old) => ({ ...old, status: event.target.value }))} className={inputClass}>
          <option value="ACTIVE">ใช้งาน</option><option value="INACTIVE">ไม่ใช้งาน</option>
        </select></label>
    </div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">รายละเอียด
      <textarea rows={3} maxLength={500} value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} className={inputClass} /></label>
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50" type="submit">{busy ? "กำลังบันทึก" : "บันทึกข้อมูลบริษัท"}</button>
      <button disabled={busy} type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold dark:border-slate-700 dark:text-white">ยกเลิก</button></div>
  </form>;
}

export default function CompanyDirectoryClient({ canManageSchedule = false }) {
  const [companies, setCompanies] = useState([]);
  const [screen, setScreen] = useState("list");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const pagination = useTablePagination(companies);
  const selected = companies.find((item) => item.id === selectedId);

  useEffect(() => {
    let active = true;
    getCompaniesRequest().then((items) => { if (active) setCompanies(items); })
      .catch((cause) => { if (active) setError(getCompanyApiErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openCreate() { setSelectedId(null); setForm(blank); setScreen("create"); setError(""); setMessage(""); }
  function openDetail(company) { setSelectedId(company.id); setScreen("detail"); setError(""); setMessage(""); }
  function openEdit(company) {
    setSelectedId(company.id);
    setForm(Object.fromEntries(Object.keys(blank).map((key) => [key, company[key] ?? ""])));
    setScreen("edit"); setError(""); setMessage("");
  }
  function returnToList() { setScreen("list"); setSelectedId(null); setError(""); }

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const input = {
        nameTh: form.nameTh.trim(), description: form.description.trim() || null,
        address: form.address.trim() || null, phoneNumber: form.phoneNumber.trim() || null,
        email: form.email.trim() || null, logoUrl: form.logoUrl.trim() || null,
        status: form.status,
      };
      const item = screen === "edit" ? await updateCompanyRequest(selectedId, input) :
        await createCompanyRequest({ ...input, code: form.code.trim().toUpperCase() });
      setCompanies((current) => [...current.filter((entry) => entry.id !== item.id), item]
        .sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th")));
      setSelectedId(item.id); setScreen("detail"); setMessage(`บันทึกข้อมูล ${item.nameTh} แล้ว`);
    } catch (cause) { setError(getCompanyApiErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function remove(company) {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({ title: `ลบบริษัท ${company.nameTh}?`,
      text: "ลบได้เฉพาะบริษัทที่ไม่มีพนักงานและใบลาอ้างอิง ข้อมูลประวัติจะถูกเก็บไว้",
      icon: "warning", showCancelButton: true, confirmButtonText: "ลบบริษัท",
      cancelButtonText: "ยกเลิก", confirmButtonColor: "#be123c" });
    if (!result.isConfirmed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await deleteCompanyRequest(company.id);
      setCompanies((current) => current.filter((item) => item.id !== company.id));
      setScreen("list"); setSelectedId(null); setMessage(`ลบบริษัท ${company.nameTh} แล้ว`);
    } catch (cause) { setError(getCompanyApiErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function saveUploadedLogo(url) {
    const item = await updateCompanyRequest(selectedId, { logoUrl: url });
    setCompanies((current) => current.map((entry) => entry.id === item.id ? { ...entry, ...item } : entry));
    setForm((current) => ({ ...current, logoUrl: url }));
    setMessage("อัปเดตโลโก้บริษัทแล้ว");
  }

  const updateSchedule = (workSchedule) => {
    setCompanies((current) => current.map((company) => company.id === selectedId ? { ...company, workSchedule } : company));
  };

  return <div className="space-y-6">
    <ManagePageHero eyebrow="Company Management" title={screen === "create" ? "เพิ่มบริษัท" : screen === "edit" ? `แก้ไข ${selected?.nameTh ?? "บริษัท"}` : screen === "detail" ? selected?.nameTh ?? "ข้อมูลบริษัท" : "ข้อมูลบริษัท"}
      description={screen === "list" ? "ข้อมูลติดต่อและวันทำงานของบริษัทในกลุ่ม SPJ" : "ข้อมูลบริษัทและวันทำงานอยู่ในหน้ารายละเอียดเดียวกัน"}
      action={screen === "list" ? <button type="button" onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950"><HiPlus className="size-5" />เพิ่มบริษัท</button> :
        <button type="button" onClick={returnToList} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-600 px-5 text-sm font-semibold text-white"><HiArrowLeft className="size-5" />กลับหน้ารวม</button>} />
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
    {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}

    {screen === "list" && <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 dark:border-slate-800"><h2 className="font-bold dark:text-white">รายชื่อบริษัท</h2><span className="text-sm text-slate-500">{companies.length} บริษัท</span></div>
      {loading ? <p className="p-7 text-sm text-slate-500">กำลังโหลดข้อมูล</p> : companies.length === 0 ? <p className="p-7 text-sm text-slate-500">ยังไม่มีบริษัท</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300"><tr>
          {['บริษัท', 'ติดต่อ', 'วันทำงาน', 'สถานะ', 'จัดการ'].map((heading) => <th key={heading} scope="col" className="px-5 py-4 font-semibold">{heading}</th>)}
        </tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{pagination.items.map((company) => <tr key={company.id} className="text-slate-700 dark:text-slate-200">
          <td className="px-5 py-4"><div className="flex items-center gap-3"><CompanyLogo key={company.logoUrl ?? company.id} company={company} size={44} /><div><p className="font-bold">{company.nameTh}</p><p className="text-xs text-slate-500">{company.code}</p></div></div></td>
          <td className="px-5 py-4">{company.email || company.phoneNumber || "—"}</td>
          <td className="px-5 py-4">{company.workSchedule ? formatWorkingDays(company.workSchedule.workingWeekdays) : "ดูรายละเอียด"}</td>
          <td className="px-5 py-4">{company.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}</td>
          <td className="whitespace-nowrap px-5 py-4"><button type="button" onClick={() => openDetail(company)} className="font-semibold text-sky-700 dark:text-sky-300">ดูข้อมูล</button><button type="button" onClick={() => openEdit(company)} className="ml-4 font-semibold text-amber-700 dark:text-amber-300">แก้ไข</button><button type="button" disabled={busy} onClick={() => remove(company)} className="ml-4 font-semibold text-rose-700 disabled:opacity-50">ลบ</button></td>
        </tr>)}</tbody></table></div>}
      <TablePagination id="companies" pagination={pagination} />
    </section>}

    {screen === "create" && <CompanyForm form={form} setForm={setForm} busy={busy} onSubmit={save} onCancel={returnToList} />}

    {screen === "detail" && selected && <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><button type="button" onClick={() => setUploadOpen(true)} aria-label="อัปโหลดโลโก้บริษัท" className="rounded-2xl focus-visible:outline-2 focus-visible:outline-amber-500"><CompanyLogo key={selected.logoUrl ?? selected.id} company={selected} size={76} /></button>
          <div><h2 className="text-xl font-bold dark:text-white">{selected.nameTh}</h2><p className="text-sm text-slate-500">{selected.code} · {selected.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}</p></div></div>
          <button type="button" onClick={() => openEdit(selected)} className="min-h-11 rounded-xl bg-amber-400 px-5 font-bold text-slate-950">แก้ไขข้อมูล</button></div>
        <dl className="mt-6 grid gap-5 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2 dark:border-slate-800">{[
          ["รายละเอียด", selected.description], ["ที่อยู่", selected.address], ["เบอร์โทร", selected.phoneNumber], ["อีเมล", selected.email],
        ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-950 dark:text-white">{value || "—"}</dd></div>)}</dl>
      </section>
      {canManageSchedule && selected.status === "ACTIVE" && <CompanyWorkScheduleClient key={selected.id} company={selected} readOnly />}
    </div>}

    {screen === "edit" && selected && <div className="space-y-5">
      <CompanyForm form={form} setForm={setForm} editing busy={busy} onSubmit={save} onCancel={() => setScreen("detail")} onUploadLogo={() => setUploadOpen(true)} />
      {canManageSchedule && selected.status === "ACTIVE" && <CompanyWorkScheduleClient key={selected.id} company={selected} onSaved={updateSchedule} />}
    </div>}
    {uploadOpen && (screen === "edit" || screen === "detail") && <ImageUploadDialog onClose={() => setUploadOpen(false)} onUploaded={saveUploadedLogo} purpose="company-logo" companyId={selectedId} />}
  </div>;
}
