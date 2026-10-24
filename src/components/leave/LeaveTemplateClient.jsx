"use client";

import { useEffect, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function emptyEntry() {
  return {
    entitlementMode: "INHERIT",
    entitlementDays: "",
    allowExcess: false,
    maxExcessDays: "",
  };
}

function getErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (Array.isArray(apiError?.details) && apiError.details.length) {
    return apiError.details.map((item) => item.message).join(", ");
  }

  return apiError?.message ?? error?.message ?? "ดำเนินการไม่สำเร็จ";
}

export default function LeaveTemplateClient({ companies, canManage }) {
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [types, setTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState({});
  const [form, setForm] = useState({
    code: "",
    nameTh: "",
    description: "",
    effectiveFrom: "",
  });
  const [loading, setLoading] = useState(Boolean(companies.length));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!companyId) return;

    let active = true;

    Promise.all([
      apiClient.get("/leave/types", {
        params: { companyId },
      }),
      apiClient.get("/leave/templates", {
        params: { companyId },
      }),
    ])
      .then(([typesResponse, templatesResponse]) => {
        if (!active) return;

        setTypes(
          (typesResponse.data?.data?.items ?? []).filter(
            (item) => item.status === "ACTIVE",
          ),
        );
        setTemplates(templatesResponse.data?.data?.items ?? []);
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

  function selectCompany(value) {
    setCompanyId(value);
    setTypes([]);
    setTemplates([]);
    setSelected({});
    setError("");
    setMessage("");
    setLoading(Boolean(value));
  }

  function toggleType(code) {
    setSelected((current) => {
      const next = { ...current };

      if (next[code]) {
        delete next[code];
      } else {
        next[code] = emptyEntry();
      }

      return next;
    });
  }

  function changeEntry(code, field, value) {
    setSelected((current) => ({
      ...current,
      [code]: {
        ...current[code],
        [field]: value,
        ...(field === "entitlementMode" && value === "INHERIT"
          ? { entitlementDays: "" }
          : {}),
        ...(field === "allowExcess" && !value ? { maxExcessDays: "" } : {}),
      },
    }));
  }

  async function createTemplate(event) {
    event.preventDefault();
    if (saving) return;

    const entries = Object.entries(selected).map(([leaveTypeCode, entry]) => ({
      leaveTypeCode,
      entitlementMode: entry.entitlementMode,
      entitlementDays:
        entry.entitlementMode === "INHERIT"
          ? null
          : entry.entitlementDays === ""
            ? null
            : Number(entry.entitlementDays),
      allowExcess: entry.allowExcess,
      maxExcessDays: entry.allowExcess
        ? entry.maxExcessDays === ""
          ? null
          : Number(entry.maxExcessDays)
        : null,
    }));

    if (entries.length === 0) {
      setError("กรุณาเลือกประเภทการลาอย่างน้อยหนึ่งรายการ");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const response = await apiClient.post(
        "/leave/templates",
        {
          companyId,
          code: form.code.trim().toUpperCase(),
          nameTh: form.nameTh.trim(),
          description: form.description.trim() || null,
          effectiveFrom: form.effectiveFrom,
          status: "ACTIVE",
          entries,
        },
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      const item = response.data?.data?.item;

      if (!item) {
        throw new Error("ระบบไม่ได้ส่ง Leave Template ที่สร้างกลับมา");
      }

      setTemplates((current) =>
        [...current, item].sort((a, b) =>
          a.nameTh.localeCompare(b.nameTh, "th"),
        ),
      );
      setSelected({});
      setForm({
        code: "",
        nameTh: "",
        description: "",
        effectiveFrom: "",
      });
      setMessage(`สร้าง Leave Template ${item.nameTh} แล้ว`);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Leave Templates
        </p>
        <h1 className="mt-3 text-3xl font-black">แม่แบบสิทธิ์วันลา</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          กำหนดสิทธิ์เริ่มต้นแยกบริษัท และปรับจำนวนวันของแต่ละประเภทใน template
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
          <label className="block max-w-md text-sm font-semibold">
            บริษัท
            <select
              value={companyId}
              onChange={(event) => selectCompany(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-900"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.nameTh} ({company.code})
                </option>
              ))}
            </select>
          </label>

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

          {canManage && (
            <form
              onSubmit={createTemplate}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-xl font-bold">สร้าง Leave Template</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  รหัส template *
                  <input
                    required
                    maxLength={40}
                    pattern="[A-Za-z][A-Za-z0-9_]{1,39}"
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="เช่น STAFF_2026"
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <label className="text-sm font-semibold">
                  ชื่อ template *
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
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <label className="text-sm font-semibold sm:col-span-2">
                  รายละเอียด
                  <textarea
                    maxLength={500}
                    rows={2}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>

                <label className="text-sm font-semibold">
                  วันที่ template เริ่มใช้ *
                  <input
                    required
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        effectiveFrom: event.target.value,
                      }))
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 dark:border-slate-700 dark:bg-slate-950"
                  />
                </label>
              </div>

              <h3 className="mt-7 font-bold">ประเภทการลาใน template</h3>

              {loading ? (
                <p className="mt-3 text-sm text-slate-500">
                  กำลังโหลดประเภทการลา...
                </p>
              ) : types.length === 0 ? (
                <p className="mt-3 text-sm text-amber-700">
                  ยังไม่มีประเภทการลาของบริษัทนี้
                  ให้ติดตั้งที่หน้าประเภทการลาก่อน
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {types.map((type) => {
                    const entry = selected[type.code];

                    return (
                      <div
                        key={type.code}
                        className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <label className="flex items-center gap-3 font-semibold">
                          <input
                            type="checkbox"
                            checked={Boolean(entry)}
                            onChange={() => toggleType(type.code)}
                            className="size-5 accent-amber-500"
                          />
                          {type.nameTh}
                          <span className="text-xs font-normal text-slate-500">
                            ({type.code})
                          </span>
                        </label>

                        {entry && (
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <label className="text-sm font-semibold">
                              จำนวนวัน
                              <select
                                value={entry.entitlementMode}
                                onChange={(event) =>
                                  changeEntry(
                                    type.code,
                                    "entitlementMode",
                                    event.target.value,
                                  )
                                }
                                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                              >
                                <option value="INHERIT">ตามประเภทการลา</option>
                                <option value="OVERRIDE">กำหนดเอง</option>
                              </select>
                            </label>

                            {entry.entitlementMode === "OVERRIDE" && (
                              <label className="text-sm font-semibold">
                                จำนวนวัน *
                                <input
                                  required
                                  type="number"
                                  min="0"
                                  max="365"
                                  step="1"
                                  value={entry.entitlementDays}
                                  onChange={(event) =>
                                    changeEntry(
                                      type.code,
                                      "entitlementDays",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                                />
                              </label>
                            )}

                            <label className="flex items-center gap-2 text-sm font-semibold">
                              <input
                                type="checkbox"
                                checked={entry.allowExcess}
                                onChange={(event) =>
                                  changeEntry(
                                    type.code,
                                    "allowExcess",
                                    event.target.checked,
                                  )
                                }
                                className="size-5 accent-amber-500"
                              />
                              ยื่นเกินสิทธิได้
                            </label>

                            {entry.allowExcess && (
                              <label className="text-sm font-semibold">
                                เกินได้สูงสุดกี่วัน *
                                <input
                                  required
                                  type="number"
                                  min="0"
                                  max="365"
                                  step="1"
                                  value={entry.maxExcessDays}
                                  onChange={(event) =>
                                    changeEntry(
                                      type.code,
                                      "maxExcessDays",
                                      event.target.value,
                                    )
                                  }
                                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || loading || types.length === 0}
                className="mt-6 min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "สร้าง template"}
              </button>
            </form>
          )}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-bold">Template ของบริษัท</h2>

            {templates.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                ยังไม่มี Leave Template
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700"
                  >
                    <p className="text-xs font-bold text-slate-500">
                      {template.code}
                    </p>
                    <h3 className="mt-1 font-bold">{template.nameTh}</h3>
                    <p className="mt-2 text-sm text-slate-500">
                      {template.entries?.length ?? 0} ประเภท · เริ่มใช้{" "}
                      {template.effectiveFrom}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Revision {template.revision ?? 1}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
