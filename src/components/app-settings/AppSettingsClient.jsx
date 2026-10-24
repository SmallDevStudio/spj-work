"use client";

import { useState } from "react";
import ManagePageHero from "@/components/layout/ManagePageHero";
import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

export default function AppSettingsClient({ initial }) {
  const [notifications, setNotifications] = useState(initial.notifications);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      const { csrfToken, headerName } = await getCsrfCredentials();
      await apiClient.put("/settings", { notifications }, { headers: { [headerName]: csrfToken } });
      setMessage("บันทึกช่องทางที่ต้องการแล้ว");
    } catch (cause) { setError(cause.response?.data?.error?.message ?? "บันทึกไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-7xl space-y-6 px-5 py-8 sm:px-8">
    <ManagePageHero eyebrow="Application Settings" title="ตั้งค่าแอป" description="จัดการการเชื่อมต่อและช่องทางแจ้งเตือนส่วนกลางของ SPJ Work" />
    <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold dark:text-white">Google Workspace</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">การเข้าสู่ระบบ Google ใช้งานผ่าน Firebase Authentication อยู่แล้ว การเชื่อมต่อ Workspace เพื่อจัดการบัญชีและ Directory ยังไม่ได้ตั้งค่า</p>
      <p className="mt-4 text-sm font-semibold text-amber-700">สถานะ: ยังไม่เชื่อมต่อ Directory</p>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold dark:text-white">ช่องทางการแจ้งเตือน</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">กำหนดช่องทางที่ต้องการใช้เมื่อเชื่อมต่อผู้ให้บริการแล้ว ขณะนี้การส่ง Email และ LINE ยังไม่เปิดใช้งาน</p>
      <form onSubmit={save} className="mt-5 space-y-4">
        {[{ key: "email", name: "Email" }, { key: "line", name: "LINE" }].map(({ key, name }) => <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700 dark:text-white"><input type="checkbox" checked={notifications[key]} onChange={(event) => setNotifications((current) => ({ ...current, [key]: event.target.checked }))} />{name}</label>)}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? "กำลังบันทึก" : "บันทึกช่องทาง"}</button>
      </form>
    </section>
  </main>;
}
