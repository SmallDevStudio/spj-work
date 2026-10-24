"use client";

import { useEffect, useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

const leaveTypeLabels = {
  ANNUAL: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  MATERNITY: "ลาคลอด",
  ORDINATION: "ลาบวช",
  UNPAID: "ลาโดยไม่รับเงินตอบแทน",
  OTHER: "ลาอื่น ๆ",
};

const dispositionLabels = {
  DEDUCT_PAY: "ส่งให้ HR/Payroll ตรวจดำเนินการส่วนที่เกินสิทธิ์",
  PAID_EXCEPTION: "อนุมัติส่วนที่เกินเป็นกรณีพิเศษ",
};

function formatDate(value) {
  if (typeof value !== "string") {
    return "-";
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function apiErrorMessage(error) {
  return (
    error?.response?.data?.error?.message ??
    error?.message ??
    "ดำเนินการไม่สำเร็จ กรุณาลองใหม่"
  );
}

function emptyForm() {
  return {
    comment: "",
    financialDisposition: "",
    financialReason: "",
  };
}

export default function ApprovalInboxClient() {
  const [items, setItems] = useState([]);
  const [forms, setForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  async function loadItems() {
    setLoadError("");

    try {
      const response = await apiClient.get("/leave/approvals");
      setItems(response.data?.data?.items ?? []);
    } catch (error) {
      setLoadError(apiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    apiClient
      .get("/leave/approvals")
      .then((response) => {
        if (active) {
          setItems(response.data?.data?.items ?? []);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(apiErrorMessage(error));
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
  }, []);

  function updateForm(requestId, field, value) {
    setForms((current) => ({
      ...current,
      [requestId]: {
        ...(current[requestId] ?? emptyForm()),
        [field]: value,
      },
    }));
  }

  async function decide(item, decision) {
    if (workingId) {
      return;
    }

    const form = forms[item.id] ?? emptyForm();
    const comment = form.comment.trim();

    if (!comment) {
      setActionError("กรุณากรอกความคิดเห็นก่อนตัดสินใจ");
      return;
    }

    if (item.track === "HR" && decision === "APPROVE") {
      if (!form.financialDisposition || !form.financialReason.trim()) {
        setActionError("HR ต้องเลือกวิธีจัดการวันเกินสิทธิ์และระบุเหตุผล");
        return;
      }
    }

    setActionError("");
    setWorkingId(item.id);

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      const body = {
        decision,
        comment,
      };

      if (item.track === "HR" && decision === "APPROVE") {
        body.financialDisposition = form.financialDisposition;
        body.financialReason = form.financialReason.trim();
      }

      await apiClient.post(
        `/leave/requests/${encodeURIComponent(item.id)}/decision`,
        body,
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      setForms((current) => {
        const updated = { ...current };
        delete updated[item.id];
        return updated;
      });

      // หากอีกฝ่าย Reject ไปก่อน API จะตอบ 409
      // และรายการใหม่จะสะท้อนสถานะล่าสุด
      await loadItems();
    } catch (error) {
      setActionError(apiErrorMessage(error));
      await loadItems();
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-slate-500">
        กำลังโหลดงานอนุมัติ...
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {loadError ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {actionError}
        </p>
      ) : null}

      {!loadError && items.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-bold text-slate-950">ไม่มีใบลารอให้คุณอนุมัติ</p>
          <p className="mt-2 text-sm text-slate-500">
            งานใหม่จะแสดงในหน้านี้เมื่อมีการส่งใบลาถึงคุณ
          </p>
        </div>
      ) : null}

      {items.map((item) => {
        const form = forms[item.id] ?? emptyForm();
        const busy = workingId === item.id;
        const disabled = Boolean(workingId);

        return (
          <article
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700">
                  {item.track === "HR" ? "รอ HR ตรวจ" : "รอหัวหน้าอนุมัติ"}
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {item.employeeCode || "พนักงาน"} ·{" "}
                  {leaveTypeLabels[item.leaveTypeCode] ?? item.leaveTypeCode}
                </h2>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {item.requestedDays} วัน
              </span>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">ช่วงวันที่ลา</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {formatDate(item.startDate)} – {formatDate(item.endDate)}
                </dd>
              </div>

              <div>
                <dt className="text-slate-500">ส่วนที่เกินสิทธิ์</dt>
                <dd className="mt-1 font-semibold text-slate-950">
                  {item.excessDays > 0 ? `${item.excessDays} วัน` : "ไม่มี"}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                รายละเอียดจากผู้ขอลา
              </p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                {item.reason || "ไม่ได้ระบุ"}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor={`comment-${item.id}`}
                  className="block text-sm font-semibold text-slate-800"
                >
                  ความคิดเห็น *
                </label>

                <textarea
                  id={`comment-${item.id}`}
                  value={form.comment}
                  onChange={(event) =>
                    updateForm(item.id, "comment", event.target.value)
                  }
                  maxLength={2000}
                  rows={3}
                  disabled={disabled}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 focus:border-sky-600 focus:outline-none disabled:opacity-60"
                />
              </div>

              {item.track === "HR" ? (
                <>
                  <div>
                    <label
                      htmlFor={`disposition-${item.id}`}
                      className="block text-sm font-semibold text-slate-800"
                    >
                      วิธีจัดการส่วนที่เกินสิทธิ์เมื่ออนุมัติ
                    </label>

                    <select
                      id={`disposition-${item.id}`}
                      value={form.financialDisposition}
                      onChange={(event) =>
                        updateForm(
                          item.id,
                          "financialDisposition",
                          event.target.value,
                        )
                      }
                      disabled={disabled}
                      className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 disabled:opacity-60"
                    >
                      <option value="">เลือกวิธีจัดการ</option>
                      {Object.entries(dispositionLabels).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`financial-reason-${item.id}`}
                      className="block text-sm font-semibold text-slate-800"
                    >
                      เหตุผลประกอบการจัดการส่วนที่เกินสิทธิ์
                    </label>

                    <textarea
                      id={`financial-reason-${item.id}`}
                      value={form.financialReason}
                      onChange={(event) =>
                        updateForm(
                          item.id,
                          "financialReason",
                          event.target.value,
                        )
                      }
                      maxLength={2000}
                      rows={2}
                      disabled={disabled}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-950 focus:border-sky-600 focus:outline-none disabled:opacity-60"
                    />
                  </div>
                </>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide(item, "APPROVE")}
                  disabled={disabled}
                  className="min-h-11 rounded-xl bg-sky-700 px-5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
                >
                  {busy ? "กำลังบันทึก..." : "อนุมัติ"}
                </button>

                <button
                  type="button"
                  onClick={() => decide(item, "REJECT")}
                  disabled={disabled}
                  className="min-h-11 rounded-xl border border-rose-300 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  ไม่อนุมัติ
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
