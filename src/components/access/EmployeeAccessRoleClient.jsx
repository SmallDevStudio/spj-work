"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

const roles = [
  ["EMPLOYEE", "พนักงาน"],
  ["MANAGER", "หัวหน้า"],
  ["APPROVER", "ผู้อนุมัติ"],
  ["HR_OFFICER", "HR Officer"],
  ["HR_ADMIN", "HR Admin"],
  ["IT_OFFICER", "IT Officer"],
  ["IT_ADMIN", "IT Admin"],
  ["ADMIN", "Admin"],
];

const roleLabels = Object.fromEntries(roles);

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "บันทึกสิทธิ์ไม่สำเร็จ"
  );
}

export default function EmployeeAccessRoleClient({ initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedRole, setSelectedRole] = useState("EMPLOYEE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selected = items.find((item) => item.id === selectedId);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");

    if (!term) {
      return items;
    }

    return items.filter((item) =>
      [
        item.employeeCode,
        item.displayName,
        item.workEmail,
        item.companyName,
      ].some((value) => value?.toLocaleLowerCase("th").includes(term)),
    );
  }, [items, search]);

  function selectEmployee(employeeId) {
    const employee = items.find((item) => item.id === employeeId);

    setSelectedId(employeeId);
    setSelectedRole(employee?.role ?? "EMPLOYEE");
    setError("");
    setSuccess("");
  }

  async function saveRole(event) {
    event.preventDefault();

    if (!selected || saving) {
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.put(
        `/access/employee-roles/${encodeURIComponent(selected.id)}`,
        { role: selectedRole },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const result = response.data?.data?.item;

      if (result?.role !== selectedRole) {
        throw new Error("ระบบไม่ได้ยืนยัน role ที่บันทึก");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                role: result.role,
                employeeRole: result.role,
              }
            : item,
        ),
      );

      setSuccess(
        result.membershipUpdated
          ? "บันทึก role ของ Employee และบัญชีผู้ใช้แล้ว"
          : "บันทึก role เตรียมไว้สำหรับการ login ครั้งแรกแล้ว",
      );
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <div>
        <p className="text-sm font-semibold text-amber-700">Manage / Users</p>
        <h1 className="mt-1 text-3xl font-black text-slate-950">
          สิทธิ์พนักงานในระบบ
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Role กำหนดว่าบัญชีทำงานอะไรได้
          ส่วนขอบเขตบริษัทกำหนดว่ามองเห็นข้อมูลบริษัทใด
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {success ? (
        <p
          role="status"
          className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <label
            htmlFor="employee-role-search"
            className="text-sm font-semibold text-slate-800"
          >
            ค้นหาพนักงาน
          </label>

          <input
            id="employee-role-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ชื่อ รหัสพนักงาน หรืออีเมล"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm"
          />

          <div className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectEmployee(item.id)}
                aria-pressed={selectedId === item.id}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedId === item.id
                    ? "border-amber-400 bg-amber-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-950">
                    {item.displayName}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {item.employeeCode}
                  </span>
                </div>

                <p className="mt-1 break-all text-sm text-slate-600">
                  {item.workEmail}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {item.companyName} ·{" "}
                  {roleLabels[item.role] ?? item.role ?? "-"}
                  {!item.linked ? " · ยังไม่เคยเชื่อมบัญชี" : ""}
                </p>
              </button>
            ))}

            {filteredItems.length === 0 ? (
              <p className="p-5 text-center text-sm text-slate-500">
                ไม่พบพนักงาน
              </p>
            ) : null}
          </div>
        </section>

        <section className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
          {!selected ? (
            <p className="text-sm text-slate-500">
              เลือกพนักงานเพื่อดูและกำหนดสิทธิ์
            </p>
          ) : (
            <form onSubmit={saveRole}>
              <h2 className="text-lg font-bold text-slate-950">
                {selected.displayName}
              </h2>

              <p className="mt-1 break-all text-sm text-slate-500">
                {selected.workEmail}
              </p>

              {!selected.membershipValid ? (
                <p
                  role="alert"
                  className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"
                >
                  บัญชีที่เชื่อมกับ Employee ไม่ตรงกับ membership
                  กรุณาตรวจสอบข้อมูลก่อนกำหนดสิทธิ์
                </p>
              ) : null}

              {selected.role === "SUPERADMIN" ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  SUPERADMIN ไม่สามารถเปลี่ยนจากหน้านี้
                </p>
              ) : selected.isSelf ? (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  ไม่สามารถเปลี่ยน role ของบัญชีตัวเองจากหน้านี้
                </p>
              ) : (
                <>
                  <label
                    htmlFor="employee-access-role"
                    className="mt-5 block text-sm font-semibold text-slate-800"
                  >
                    สิทธิ์ในระบบ
                  </label>

                  <select
                    id="employee-access-role"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    disabled={saving || !selected.membershipValid}
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm"
                  >
                    {roles.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !selected.membershipValid ||
                      selectedRole === selected.role
                    }
                    className="mt-5 min-h-11 w-full rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
                  </button>
                </>
              )}

              {selected.linked ? (
                <Link
                  href="/manage/access/company-assignments"
                  className="mt-4 block text-center text-sm font-semibold text-sky-700 hover:underline"
                >
                  ตั้งค่าสิทธิ์การมองเห็นบริษัท →
                </Link>
              ) : null}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
