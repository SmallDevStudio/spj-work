"use client";

import { useEffect, useState } from "react";
import { HiArrowPath, HiOutlineBuildingOffice2, HiPlus } from "react-icons/hi2";

import {
  createCompanyRequest,
  getCompaniesRequest,
  getCompanyApiErrorMessage,
} from "@/services/company/company.api";

const emptyForm = {
  code: "",
  nameTh: "",
  description: "",
};

export default function CompanyDirectoryClient() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    getCompaniesRequest()
      .then((items) => {
        if (active) setCompanies(items);
      })
      .catch((requestError) => {
        if (active) setError(getCompanyApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const item = await createCompanyRequest({
        code: form.code.trim().toUpperCase(),
        nameTh: form.nameTh.trim(),
        description: form.description.trim() || null,
      });

      if (!item) {
        throw new Error("ระบบไม่ได้ส่งข้อมูลบริษัทที่สร้างกลับมา");
      }

      setCompanies((current) =>
        [...current, item].sort((a, b) =>
          a.nameTh.localeCompare(b.nameTh, "th"),
        ),
      );
      setForm(emptyForm);
      setShowForm(false);
      setSuccess(`เพิ่มบริษัท ${item.nameTh} แล้ว`);
    } catch (requestError) {
      setError(getCompanyApiErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Organization Settings
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
            บริษัท
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            เพิ่มบริษัทในกลุ่ม SPJ
            เพื่อเตรียมกำหนดบริษัทของพนักงานและสิทธิ์การเข้าถึง
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setError("");
            setSuccess("");
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
        >
          <HiPlus className="size-5" aria-hidden="true" />
          เพิ่มบริษัท
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {success}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">
            ข้อมูลบริษัทใหม่
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              รหัสบริษัท *
              <input
                required
                maxLength={20}
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="เช่น SPJ"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              ชื่อบริษัท *
              <input
                required
                maxLength={150}
                value={form.nameTh}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nameTh: event.target.value,
                  }))
                }
                placeholder="ชื่อบริษัทตามที่ใช้งานจริง"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
          </div>

          <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            รายละเอียด
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกบริษัท"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setShowForm(false)}
              className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <HiOutlineBuildingOffice2
            className="size-6 text-amber-500"
            aria-hidden="true"
          />
          <h2 className="font-bold text-slate-950 dark:text-white">
            รายชื่อบริษัท
          </h2>
          {!loading && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              ({companies.length})
            </span>
          )}
        </div>

        {loading ? (
          <div
            role="status"
            className="flex items-center gap-2 p-8 text-sm text-slate-500"
          >
            <HiArrowPath className="size-5 animate-spin" aria-hidden="true" />
            กำลังโหลดข้อมูล
          </div>
        ) : companies.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 dark:text-slate-400">
            ยังไม่มีบริษัท กด “เพิ่มบริษัท” เพื่อเริ่มต้น
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    รหัส
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    บริษัท
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    รายละเอียด
                  </th>
                  <th scope="col" className="px-5 py-4 font-semibold">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {companies.map((company) => (
                  <tr
                    key={company.id}
                    className="text-slate-700 dark:text-slate-200"
                  >
                    <td className="px-5 py-4 font-bold">{company.code}</td>
                    <td className="px-5 py-4 font-semibold">
                      {company.nameTh}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {company.description || "—"}
                    </td>
                    <td className="px-5 py-4">
                      {company.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
