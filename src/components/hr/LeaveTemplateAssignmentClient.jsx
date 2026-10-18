"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function getErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length) {
    return apiError.details.map((detail) => detail.message).join(", ");
  }

  return apiError?.message ?? error?.message ?? "ดำเนินการไม่สำเร็จ";
}

export default function LeaveTemplateAssignmentClient({ companies }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [templates, setTemplates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [templateCode, setTemplateCode] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(Boolean(companies.length));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    Promise.all([
      apiClient.get("/hr/leave-templates", {
        params: { companyId },
      }),
      apiClient.get("/hr/leave-template-assignments/candidates", {
        params: { companyId },
      }),
    ])
      .then(([templatesResponse, employeesResponse]) => {
        if (!active) return;

        setTemplates(
          (templatesResponse.data?.data?.items ?? []).filter(
            (item) => item.status === "ACTIVE",
          ),
        );
        setEmployees(employeesResponse.data?.data?.items ?? []);
        setLoading(false);
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

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.code === templateCode),
    [templates, templateCode],
  );

  function changeCompany(value) {
    setCompanyId(value);
    setTemplates([]);
    setEmployees([]);
    setTemplateCode("");
    setSelectedIds([]);
    setPreview(null);
    setError("");
    setMessage("");
    setLoading(Boolean(value));
  }

  function toggleEmployee(id) {
    setPreview(null);
    setMessage("");

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 50
          ? [...current, id]
          : current,
    );
  }

  function payload() {
    return {
      companyId,
      templateCode,
      effectiveFrom,
      employeeIds: selectedIds,
    };
  }

  async function previewAssignment() {
    if (
      working ||
      !templateCode ||
      !effectiveFrom ||
      selectedIds.length === 0
    ) {
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");
    setPreview(null);

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/hr/leave-template-assignments/preview",
        payload(),
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      setPreview(response.data?.data?.preview ?? null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  }

  async function confirmAssignment() {
    if (
      working ||
      !preview ||
      preview.blockedCount !== 0 ||
      preview.eligibleCount !== selectedIds.length
    ) {
      return;
    }

    setWorking(true);
    setError("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/hr/leave-template-assignments",
        payload(),
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const result = response.data?.data?.result;

      setMessage(
        `มอบ ${result?.templateCode ?? templateCode} ให้พนักงาน ` +
          `${result?.assignedCount ?? selectedIds.length} คนแล้ว`,
      );
      setSelectedIds([]);
      setPreview(null);
    } catch (requestError) {
      // ข้อมูลอาจเปลี่ยนหลัง Preview; ให้ตรวจใหม่ก่อนยืนยันอีกครั้ง
      setPreview(null);
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Leave Assignment
        </p>
        <h1 className="mt-3 text-3xl font-black">มอบแม่แบบสิทธิ์วันลา</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          เลือกพนักงานบริษัทเดียวกันได้ครั้งละไม่เกิน 50 คน
          ตรวจผลก่อนยืนยันการมอบ
        </p>
      </section>

      {companies.length === 0 ? (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900"
        >
          ยังไม่มีบริษัทที่บัญชีนี้เข้าถึงได้
        </p>
      ) : (
        <>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-3 sm:p-7 dark:border-slate-800 dark:bg-slate-900">
            <label className="text-sm font-semibold">
              บริษัท
              <select
                value={companyId}
                onChange={(event) => changeCompany(event.target.value)}
                disabled={working}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nameTh} ({company.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              Leave Template
              <select
                value={templateCode}
                onChange={(event) => {
                  setTemplateCode(event.target.value);
                  setPreview(null);
                }}
                disabled={loading || working}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">เลือก template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.code}>
                    {template.nameTh} ({template.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-semibold">
              วันที่เริ่มใช้
              <input
                type="date"
                value={effectiveFrom}
                min={selectedTemplate?.effectiveFrom}
                onChange={(event) => {
                  setEffectiveFrom(event.target.value);
                  setPreview(null);
                }}
                disabled={working}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

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
            <div className="p-5">
              <h2 className="font-bold">
                เลือกพนักงาน ({selectedIds.length}/50)
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {loading ? "กำลังโหลด..." : `${employees.length} คนในบริษัท`}
              </p>
            </div>

            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                  <tr>
                    <th scope="col" className="p-4">
                      เลือก
                    </th>
                    <th scope="col" className="p-4">
                      รหัส
                    </th>
                    <th scope="col" className="p-4">
                      พนักงาน
                    </th>
                    <th scope="col" className="p-4">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          aria-label={`เลือก ${employee.displayName}`}
                          checked={selectedIds.includes(employee.id)}
                          onChange={() => toggleEmployee(employee.id)}
                          disabled={working}
                          className="size-5 accent-amber-500"
                        />
                      </td>
                      <td className="p-4 font-semibold">
                        {employee.employeeCode}
                      </td>
                      <td className="p-4">{employee.displayName}</td>
                      <td className="p-4">
                        {employee.employmentStatus || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <button
            type="button"
            onClick={previewAssignment}
            disabled={
              working ||
              !templateCode ||
              !effectiveFrom ||
              selectedIds.length === 0
            }
            className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {working ? "กำลังตรวจ..." : "ตรวจสอบก่อนบันทึก"}
          </button>

          {preview && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold">
                ผลตรวจ: ผ่าน {preview.eligibleCount} คน · ต้องแก้ไข{" "}
                {preview.blockedCount} คน
              </h2>

              <ul className="mt-4 space-y-2 text-sm">
                {preview.rows.map((row) => (
                  <li key={row.employeeId}>
                    {row.employeeCode || row.employeeId} —
                    {row.displayName || "ไม่พบข้อมูล"}:
                    {row.eligible ? " พร้อมบันทึก" : ` ${row.issue}`}
                  </li>
                ))}
              </ul>

              {preview.blockedCount === 0 && (
                <button
                  type="button"
                  onClick={confirmAssignment}
                  disabled={working}
                  className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50 dark:bg-amber-400 dark:text-slate-950"
                >
                  {working
                    ? "กำลังบันทึก..."
                    : `ยืนยันมอบให้ ${preview.eligibleCount} คน`}
                </button>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
