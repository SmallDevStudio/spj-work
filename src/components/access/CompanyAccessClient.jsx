"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function errorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ"
  );
}

export default function CompanyAccessClient() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedUid, setSelectedUid] = useState("");
  const [scope, setScope] = useState("SELECTED");
  const [companyIds, setCompanyIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => user.uid === selectedUid),
    [users, selectedUid],
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      apiClient.get("/access/company-assignments"),
      apiClient.get("/company"),
    ])
      .then(([usersResponse, companiesResponse]) => {
        if (!active) return;
        setUsers(usersResponse.data?.data?.items ?? []);
        setCompanies(companiesResponse.data?.data?.items ?? []);
      })
      .catch((requestError) => {
        if (active) setError(errorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function selectUser(uid) {
    const user = users.find((item) => item.uid === uid);

    setSelectedUid(uid);
    setScope(user?.companyAccess?.scope === "ALL" ? "ALL" : "SELECTED");
    setCompanyIds(user?.companyAccess?.companyIds ?? []);
    setError("");
    setSuccess("");
  }

  function toggleCompany(companyId) {
    setCompanyIds((current) =>
      current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId],
    );
  }

  async function saveAccess(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedUid) return;

    if (scope === "SELECTED" && companyIds.length === 0) {
      setError("กรุณาเลือกอย่างน้อยหนึ่งบริษัท");
      return;
    }

    setSaving(true);

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.put(
        `/access/company-assignments/${encodeURIComponent(selectedUid)}`,
        {
          scope,
          companyIds: scope === "ALL" ? [] : companyIds,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const updatedAccess = response.data?.data?.item?.companyAccess;

      if (!updatedAccess) {
        throw new Error("ระบบไม่ได้ส่งสิทธิ์ที่บันทึกกลับมา");
      }

      setUsers((current) =>
        current.map((user) =>
          user.uid === selectedUid
            ? { ...user, companyAccess: updatedAccess }
            : user,
        ),
      );

      setSuccess("บันทึกสิทธิ์รายบริษัทแล้ว");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Access Management
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          สิทธิ์การเข้าถึงบริษัท
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          บริษัทที่พนักงานสังกัดกับบริษัทที่บัญชีเข้าถึงได้เป็นคนละข้อมูล
          สิทธิ์ในหน้านี้ใช้ร่วมกับ role และ permission ของผู้ใช้
        </p>
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

      <form
        onSubmit={saveAccess}
        className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
      >
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
          ผู้ใช้งาน
          <select
            value={selectedUid}
            onChange={(event) => selectUser(event.target.value)}
            disabled={loading}
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          >
            <option value="">
              {loading ? "กำลังโหลดรายชื่อ..." : "เลือกผู้ใช้งาน"}
            </option>
            {users.map((user) => (
              <option key={user.uid} value={user.uid}>
                {user.email || user.displayName || user.uid} — {user.role}
              </option>
            ))}
          </select>
        </label>

        {selectedUser && (
          <div className="mt-7 space-y-5">
            {selectedUser.role === "SUPERADMIN" ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                SUPERADMIN เห็นทุกบริษัทโดยระบบ ไม่ต้องตั้งค่าเพิ่มเติม
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={scope === "ALL"}
                    onChange={(event) =>
                      setScope(event.target.checked ? "ALL" : "SELECTED")
                    }
                    className="mt-1 size-5 accent-amber-500"
                  />
                  <span>
                    เห็นข้อมูลทุกบริษัท
                    <span className="mt-1 block font-normal text-slate-500 dark:text-slate-400">
                      บริษัทใหม่ที่เพิ่มในอนาคตจะอยู่ในขอบเขตนี้ด้วย
                    </span>
                  </span>
                </label>

                {scope === "SELECTED" && (
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      เลือกบริษัทที่เข้าถึงได้
                    </legend>

                    {companies
                      .filter((company) => company.status === "ACTIVE")
                      .map((company) => (
                        <label
                          key={company.id}
                          className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={companyIds.includes(company.id)}
                            onChange={() => toggleCompany(company.id)}
                            className="size-5 accent-amber-500"
                          />
                          <span className="text-slate-800 dark:text-slate-100">
                            {company.nameTh} ({company.code})
                          </span>
                        </label>
                      ))}
                  </fieldset>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์"}
                </button>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
