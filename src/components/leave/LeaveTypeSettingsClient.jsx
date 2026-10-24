"use client";

import { useEffect, useState } from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";
import LeaveTypeEditor from "@/components/leave/LeaveTypeEditor";
import LeaveTypeCreate from "@/components/leave/LeaveTypeCreate";

const countingLabels = {
  WORKING_DAYS: "วันทำงาน",
  CALENDAR_DAYS: "วันปฏิทิน",
};

const payLabels = {
  PAID: "รับค่าจ้าง",
  PARTIALLY_PAID: "รับค่าจ้างบางส่วน",
  UNPAID: "ไม่รับค่าจ้าง",
  PER_POLICY: "ตามนโยบาย",
};

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ"
  );
}

export default function LeaveTypeSettingsClient({ companies, canManage }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(Boolean(companies.length));
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    apiClient
      .get("/leave/types", {
        params: { companyId },
      })
      .then((response) => {
        if (active) {
          setItems(response.data?.data?.items ?? []);
          setLoading(false);
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [companyId]);

  function selectCompany(value) {
    setCompanyId(value);
    setItems([]);
    setError("");
    setMessage("");
    setLoading(Boolean(value));
    setEditingItem(null);
    setCreating(false);
  }

  async function installPresets(event) {
    event.preventDefault();

    if (!companyId || !effectiveFrom || installing) return;

    setInstalling(true);
    setError("");
    setMessage("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/leave/types/presets",
        {
          companyId,
          effectiveFrom,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const result = response.data?.data?.result;

      const listResponse = await apiClient.get("/leave/types", {
        params: { companyId },
      });

      setItems(listResponse.data?.data?.items ?? []);
      setMessage(
        `เพิ่มใหม่ ${result?.createdCodes?.length ?? 0} ประเภท ` +
          `รายการที่มีอยู่แล้ว ${result?.existingCodes?.length ?? 0} ประเภท`,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setInstalling(false);
    }
  }

  function handleSaved(updated) {
    setItems((current) =>
      current.map((item) => (item.code === updated.code ? updated : item)),
    );
    setEditingItem(null);
    setMessage(`บันทึก ${updated.nameTh} revision ${updated.revision} แล้ว`);
  }

  function handleCreated(item) {
    setItems((current) =>
      [...current, item].sort((a, b) => a.nameTh.localeCompare(b.nameTh, "th")),
    );
    setCreating(false);
    setMessage(`เพิ่มประเภทการลา ${item.nameTh} แล้ว`);
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <div className="flex items-center gap-3">
          <HiOutlineCalendarDays
            className="size-7 text-amber-400"
            aria-hidden="true"
          />
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
            Leave Settings
          </p>
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-tight">ประเภทการลา</h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
          ตั้งค่าประเภทการลาแยกตามบริษัท
          โดยรายการที่มีอยู่แล้วจะไม่ถูกเขียนทับเมื่อกดติดตั้งซ้ำ
        </p>
      </section>

      {companies.length === 0 ? (
        <p
          role="alert"
          className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        >
          บัญชีนี้ยังไม่มีบริษัทที่เข้าถึงได้ กรุณาให้ SUPERADMIN
          ตรวจสิทธิ์รายบริษัท
        </p>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
            <label className="block max-w-md text-sm font-semibold text-slate-700 dark:text-slate-200">
              บริษัท
              <select
                value={companyId}
                onChange={(event) => selectCompany(event.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nameTh} ({company.code})
                  </option>
                ))}
              </select>
            </label>

            {canManage && (
              <form
                onSubmit={installPresets}
                className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800"
              >
                <h2 className="font-bold text-slate-950 dark:text-white">
                  ติดตั้งประเภทการลามาตรฐาน
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  เลือกวันที่นโยบายของบริษัทเริ่มใช้
                  ระบบจะสร้างเฉพาะประเภทที่ยังไม่มี
                </p>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    วันที่เริ่มใช้
                    <input
                      type="date"
                      required
                      value={effectiveFrom}
                      onChange={(event) => setEffectiveFrom(event.target.value)}
                      className="mt-2 block min-h-11 rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={installing || !effectiveFrom}
                    className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    {installing ? "กำลังติดตั้ง..." : "ติดตั้งรายการมาตรฐาน"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {message}
            </p>
          )}

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800">
              <h2 className="font-bold text-slate-950 dark:text-white">
                รายการประเภทการลา
              </h2>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setCreating(true);
                  }}
                  className="mt-3 min-h-10 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950"
                >
                  เพิ่มประเภทการลา
                </button>
              )}
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "กำลังโหลด..." : `${items.length} ประเภท`}
              </p>
            </div>

            {!loading && items.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                ยังไม่มีประเภทการลาสำหรับบริษัทนี้
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[750px] text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th scope="col" className="p-4">
                        ประเภท
                      </th>
                      <th scope="col" className="p-4">
                        วิธีนับ
                      </th>
                      <th scope="col" className="p-4">
                        สิทธิเริ่มต้น
                      </th>
                      <th scope="col" className="p-4">
                        ค่าจ้าง
                      </th>
                      <th scope="col" className="p-4">
                        เริ่มใช้
                      </th>
                      <th scope="col" className="p-4">
                        สถานะ
                      </th>
                      {canManage && (
                        <th scope="col" className="p-4 text-right">
                          จัดการ
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-4">
                          <p className="font-semibold">{item.nameTh}</p>
                          <p className="text-xs text-slate-500">{item.code}</p>
                        </td>
                        <td className="p-4">
                          {countingLabels[item.countingBasis] ??
                            item.countingBasis}
                        </td>
                        <td className="p-4">
                          {item.entitlementDays === null
                            ? "รอกำหนดในนโยบาย"
                            : `${item.entitlementDays} วัน`}
                        </td>
                        <td className="p-4">
                          {payLabels[item.payTreatment] ?? item.payTreatment}
                          {item.paidDaysCap !== null &&
                            ` (สูงสุด ${item.paidDaysCap} วัน)`}
                        </td>
                        <td className="p-4">{item.effectiveFrom}</td>
                        <td className="p-4">
                          {item.status === "ACTIVE" ? "ใช้งาน" : "ไม่ใช้งาน"}
                        </td>
                        {canManage && (
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setMessage("");
                                setEditingItem(item);
                              }}
                              className="min-h-10 rounded-xl border border-slate-300 px-4 font-semibold hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-800"
                            >
                              แก้ไข
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {editingItem && (
        <LeaveTypeEditor
          item={editingItem}
          companyId={companyId}
          onClose={() => setEditingItem(null)}
          onSaved={handleSaved}
        />
      )}
      {creating && (
        <LeaveTypeCreate
          companyId={companyId}
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
