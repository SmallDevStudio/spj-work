"use client";

import { useEffect, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ"
  );
}

export default function LeaveHrDelegationClient({ companies, employees }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [employeeId, setEmployeeId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function reload(selectedCompanyId) {
    if (!selectedCompanyId) {
      setItems([]);
      return;
    }

    const response = await apiClient.get("/leave/hr-delegations", {
      params: { companyId: selectedCompanyId },
    });

    setItems(response.data?.data?.items ?? []);
  }

  useEffect(() => {
    if (!companyId) {
      return;
    }

    let active = true;

    apiClient
      .get("/leave/hr-delegations", {
        params: { companyId },
      })
      .then((response) => {
        if (active) {
          setItems(response.data?.data?.items ?? []);
          setError("");
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [companyId]);

  async function save(event) {
    event.preventDefault();

    if (!companyId || !employeeId || !effectiveFrom || !effectiveTo) {
      setError("กรุณากรอกข้อมูลมอบหมายให้ครบ");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      await apiClient.post(
        "/leave/hr-delegations",
        {
          companyId,
          delegateEmployeeId: employeeId,
          effectiveFrom,
          effectiveTo,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      await reload(companyId);
      setSuccess("บันทึกผู้ทำหน้าที่ HR แทนแล้ว");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function revoke(item) {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      await apiClient.delete("/leave/hr-delegations", {
        data: {
          companyId: item.companyId,
          delegateEmployeeId: item.delegateEmployeeId,
        },
        headers: {
          "Content-Type": "application/json",
          [headerName]: csrfToken,
        },
      });

      await reload(companyId);
      setSuccess("ยกเลิกการมอบหมายแล้ว");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  const employeeNames = Object.fromEntries(
    employees.map((employee) => [
      employee.id,
      `${employee.displayName || employee.employeeCode} (${employee.workEmail})`,
    ]),
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <div>
        <p className="text-sm font-semibold text-amber-700">Manage / Leave</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">
          ผู้ทำหน้าที่ HR แทน
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          มอบหมายเฉพาะการอนุมัติลาในบริษัทและช่วงวันที่กำหนด โดยไม่เปลี่ยน role
          หลักของพนักงาน
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={save}
          className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <h2 className="text-lg font-bold text-slate-950">
            เพิ่มหรือแก้ไขการมอบหมาย
          </h2>

          <label className="block text-sm font-semibold text-slate-800">
            บริษัท
            <select
              value={companyId}
              onChange={(event) => {
                setCompanyId(event.target.value);
                setItems([]);
                setLoading(true);
                setError("");
              }}
              required
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-800">
            พนักงานผู้ทำแทน
            <select
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">เลือกพนักงาน</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.displayName || employee.employeeCode} ·{" "}
                  {employee.workEmail}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-800">
              เริ่มวันที่
              <input
                type="date"
                value={effectiveFrom}
                onChange={(event) => setEffectiveFrom(event.target.value)}
                required
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              สิ้นสุดวันที่
              <input
                type="date"
                value={effectiveTo}
                min={effectiveFrom || undefined}
                onChange={(event) => setEffectiveTo(event.target.value)}
                required
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving || !companyId || !employeeId}
            className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการมอบหมาย"}
          </button>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-slate-950">รายการมอบหมาย</h2>

          {loading ? (
            <p className="mt-4 text-sm text-slate-500">กำลังโหลด...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              ไม่มีรายการสำหรับบริษัทนี้
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <p className="break-words font-semibold text-slate-950">
                    {employeeNames[item.delegateEmployeeId] ??
                      item.delegateEmployeeId}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {item.effectiveFrom} ถึง {item.effectiveTo}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-500">
                      {item.status}
                    </span>

                    {item.status === "ACTIVE" ? (
                      <button
                        type="button"
                        onClick={() => revoke(item)}
                        disabled={saving}
                        className="text-sm font-semibold text-rose-700 hover:underline disabled:opacity-50"
                      >
                        ยกเลิก
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
