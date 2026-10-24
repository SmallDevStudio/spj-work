"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function getErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ"
  );
}

export default function EmployeeCompanyMigrationClient() {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      apiClient.get("/employee/company-migration"),
      apiClient.get("/company"),
    ])
      .then(([employeesResponse, companiesResponse]) => {
        if (!active) return;
        setEmployees(employeesResponse.data?.data?.items ?? []);
        setCompanies(companiesResponse.data?.data?.items ?? []);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const unassigned = useMemo(
    () => employees.filter((employee) => !employee.companyId),
    [employees],
  );

  function toggleEmployee(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function assignSelected() {
    if (!companyId || selectedIds.length === 0 || saving) return;

    setSaving(true);
    setError("");
    setResult("");

    const failures = [];
    let completed = 0;

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      // ทำทีละราย เพื่อแสดงผลสำเร็จและข้อผิดพลาดได้ตรงกับแต่ละคน
      for (const employeeId of selectedIds) {
        setProgress(`${completed + 1} / ${selectedIds.length}`);

        try {
          await apiClient.put(
            `/employee/${encodeURIComponent(employeeId)}/company`,
            { companyId },
            {
              headers: {
                "Content-Type": "application/json",
                [headerName]: csrfToken,
              },
            },
          );

          setEmployees((current) =>
            current.map((employee) =>
              employee.id === employeeId
                ? { ...employee, companyId }
                : employee,
            ),
          );

          completed += 1;
        } catch (requestError) {
          const employee = employees.find((item) => item.id === employeeId);

          failures.push(
            `${employee?.employeeCode || employeeId}: ${getErrorMessage(requestError)}`,
          );
        }
      }

      setSelectedIds(
        failures.length
          ? selectedIds.filter((id) =>
              failures.some((message) =>
                message.startsWith(
                  `${employees.find((employee) => employee.id === id)?.employeeCode || id}:`,
                ),
              ),
            )
          : [],
      );

      setResult(`บันทึกสำเร็จ ${completed} จาก ${selectedIds.length} คน`);

      if (failures.length) {
        setError(failures.join("\n"));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setProgress("");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Company Management
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          จัดบริษัทให้พนักงาน
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          ตรวจบริษัทที่พนักงานสังกัดจริงก่อนกำหนดสิทธิ์การเข้าถึงข้อมูล
          ข้อมูลที่ยังไม่มีบริษัทจะไม่ถูกเดาหรือจัดให้อัตโนมัติ
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="whitespace-pre-line rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {result && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {result}
        </p>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
        <p className="font-bold text-slate-950 dark:text-white">
          ยังไม่ได้กำหนดบริษัท: {loading ? "กำลังโหลด..." : unassigned.length}{" "}
          คน
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            บริษัทสำหรับพนักงานที่เลือก
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              disabled={saving}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">เลือกบริษัท</option>
              {companies
                .filter((company) => company.status === "ACTIVE")
                .map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.nameTh} ({company.code})
                  </option>
                ))}
            </select>
          </label>

          <button
            type="button"
            onClick={assignSelected}
            disabled={saving || !companyId || selectedIds.length === 0}
            className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {saving
              ? `กำลังบันทึก ${progress}`
              : `บันทึก ${selectedIds.length} คน`}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <h2 className="font-bold text-slate-950 dark:text-white">
            พนักงานที่ยังไม่มีบริษัท
          </h2>
          <button
            type="button"
            disabled={saving || unassigned.length === 0}
            onClick={() =>
              setSelectedIds(
                selectedIds.length === unassigned.length
                  ? []
                  : unassigned.map((employee) => employee.id),
              )
            }
            className="text-sm font-semibold text-sky-700 disabled:opacity-50 dark:text-sky-300"
          >
            {selectedIds.length === unassigned.length
              ? "ยกเลิกการเลือกทั้งหมด"
              : "เลือกทั้งหมด"}
          </button>
        </div>

        {unassigned.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            {loading ? "กำลังโหลดข้อมูล..." : "พนักงานทุกรายมีบริษัทแล้ว"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th scope="col" className="p-4">
                    เลือก
                  </th>
                  <th scope="col" className="p-4">
                    รหัสพนักงาน
                  </th>
                  <th scope="col" className="p-4">
                    ชื่อ-นามสกุล
                  </th>
                  <th scope="col" className="p-4">
                    อีเมล
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {unassigned.map((employee) => (
                  <tr key={employee.id}>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        aria-label={`เลือก ${employee.displayName || employee.employeeCode}`}
                        checked={selectedIds.includes(employee.id)}
                        onChange={() => toggleEmployee(employee.id)}
                        disabled={saving}
                        className="size-5 accent-amber-500"
                      />
                    </td>
                    <td className="p-4 font-semibold">
                      {employee.employeeCode}
                    </td>
                    <td className="p-4">{employee.displayName}</td>
                    <td className="p-4">{employee.workEmail}</td>
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
