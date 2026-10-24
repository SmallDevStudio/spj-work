"use client";

import { useEffect, useState } from "react";
import ManagePageHero from "@/components/layout/ManagePageHero";
import {
  createCompanyRequest, deleteCompanyRequest, getCompaniesRequest,
  getCompanyApiErrorMessage, updateCompanyRequest,
} from "@/services/company/company.api";

const blank = { code: "", nameTh: "", description: "", address: "", phoneNumber: "", email: "", logoUrl: "", status: "ACTIVE" };
const fields = [
  { name: "nameTh", label: "ชื่อบริษัท *", required: true, maxLength: 150 },
  { name: "address", label: "ที่อยู่", maxLength: 1000 },
  { name: "phoneNumber", label: "เบอร์โทร", maxLength: 50 },
  { name: "email", label: "อีเมล", type: "email", maxLength: 254 },
  { name: "logoUrl", label: "URL โลโก้ (HTTPS)", type: "url", maxLength: 1000 },
];

export default function CompanyDirectoryClient() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    getCompaniesRequest().then((items) => { if (active) setCompanies(items); })
      .catch((cause) => { if (active) setError(getCompanyApiErrorMessage(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openForm(company = null) {
    setEditingId(company?.id ?? null);
    setForm(company ? Object.fromEntries(Object.keys(blank).map((key) => [key, company[key] ?? ""])) : blank);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const input = {
        nameTh: form.nameTh.trim(), description: form.description.trim() || null,
        address: form.address.trim() || null, phoneNumber: form.phoneNumber.trim() || null,
        email: form.email.trim() || null, logoUrl: form.logoUrl.trim() || null,
        status: form.status,
      };
      const item = editingId
        ? await updateCompanyRequest(editingId, input)
        : await createCompanyRequest({ ...input, code: form.code.trim().toUpperCase() });
      setCompanies((current) => [...current.filter((entry) => entry.id !== item.id), item]
        .sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th")));
      setShowForm(false);
      setMessage(`บันทึกข้อมูล ${item.nameTh} แล้ว`);
    } catch (cause) { setError(getCompanyApiErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  async function remove(company) {
    const Swal = (await import("sweetalert2")).default;
    const result = await Swal.fire({
      title: `ลบบริษัท ${company.nameTh}?`,
      text: "ลบได้เฉพาะบริษัทที่ไม่มีพนักงานและใบลาอ้างอิง ข้อมูลประวัติจะถูกเก็บไว้",
      icon: "warning", showCancelButton: true, confirmButtonText: "ลบบริษัท",
      cancelButtonText: "ยกเลิก", confirmButtonColor: "#be123c",
    });
    if (!result.isConfirmed) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await deleteCompanyRequest(company.id);
      setCompanies((current) => current.filter((item) => item.id !== company.id));
      setMessage(`ลบบริษัท ${company.nameTh} แล้ว`);
    } catch (cause) { setError(getCompanyApiErrorMessage(cause)); }
    finally { setBusy(false); }
  }

  const inputClass = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
  return (
    <div className="space-y-6">
      <ManagePageHero eyebrow="Company Management" title="ข้อมูลบริษัท"
        description="ข้อมูลติดต่อและสถานะบริษัทในกลุ่ม SPJ รวมถึงวันทำงานที่ใช้คำนวณวันลา"
        action={<button type="button" onClick={() => openForm()} className="min-h-11 rounded-xl bg-amber-400 px-5 font-bold text-slate-950">+ เพิ่มบริษัท</button>} />
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
      {showForm && <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-bold dark:text-white">{editingId ? "แก้ไขบริษัท" : "เพิ่มบริษัท"}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {!editingId && <label className="text-sm font-semibold dark:text-white">รหัสบริษัท *<input required maxLength={20} value={form.code} onChange={(event) => setForm((old) => ({ ...old, code: event.target.value.toUpperCase() }))} className={inputClass} /></label>}
          {fields.map((field) => <label key={field.name} className="text-sm font-semibold dark:text-white">{field.label}<input required={field.required} maxLength={field.maxLength} type={field.type ?? "text"} value={form[field.name]} onChange={(event) => setForm((old) => ({ ...old, [field.name]: event.target.value }))} className={inputClass} /></label>)}
          <label className="text-sm font-semibold dark:text-white">สถานะ<select value={form.status} onChange={(event) => setForm((old) => ({ ...old, status: event.target.value }))} className={inputClass}><option value="ACTIVE">ใช้งาน</option><option value="INACTIVE">ไม่ใช้งาน</option></select></label>
        </div>
        <label className="mt-4 block text-sm font-semibold dark:text-white">รายละเอียด<textarea rows={3} maxLength={500} value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} className={inputClass} /></label>
        <div className="mt-5 flex gap-3"><button disabled={busy} type="submit" className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "กำลังบันทึก" : "บันทึก"}</button><button type="button" disabled={busy} onClick={() => setShowForm(false)} className="rounded-xl border px-5 py-3 dark:text-white">ยกเลิก</button></div>
      </form>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <h2 className="border-b p-5 font-bold dark:border-slate-800 dark:text-white">รายชื่อบริษัท ({companies.length})</h2>
        {loading ? <p className="p-6 text-slate-500">กำลังโหลดข้อมูล</p> : companies.length === 0 ? <p className="p-6 text-slate-500">ยังไม่มีบริษัท</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left text-sm"><thead className="bg-slate-50 dark:bg-slate-950"><tr>{["รหัส", "บริษัท", "ติดต่อ", "สถานะ", "จัดการ"].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead><tbody className="divide-y dark:divide-slate-800">{companies.map((company) => <tr key={company.id} className="dark:text-slate-200"><td className="px-5 py-4 font-bold">{company.code}</td><td className="px-5 py-4"><span className="font-semibold">{company.nameTh}</span><p className="text-xs text-slate-500">{company.description || company.address || "—"}</p></td><td className="px-5 py-4">{company.email || company.phoneNumber || "—"}</td><td className="px-5 py-4">{company.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}</td><td className="space-x-3 px-5 py-4"><button type="button" disabled={busy} onClick={() => openForm(company)} className="font-semibold text-amber-700">แก้ไข</button><button type="button" disabled={busy} onClick={() => remove(company)} className="font-semibold text-rose-700">ลบ</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
