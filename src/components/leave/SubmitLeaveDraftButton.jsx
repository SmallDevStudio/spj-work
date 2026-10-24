"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";

function getErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (apiError?.message) {
    return apiError.message;
  }

  return error?.message || "ส่งใบลาไม่สำเร็จ กรุณาลองใหม่";
}

export default function SubmitLeaveDraftButton({ requestId }) {
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (submitting) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const { csrfToken, headerName } = await getCsrfCredentials();

      await apiClient.post(
        `/leave/requests/${encodeURIComponent(requestId)}/submit`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            [headerName]: csrfToken,
          },
        },
      );

      // โหลดข้อมูลใบลาใหม่จาก server:
      // DRAFT -> PENDING_APPROVAL แล้วปุ่มนี้จะหายไป
      router.refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-6 border-t border-slate-100 pt-6">
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      {!confirming ? (
        <button
          type="button"
          onClick={() => {
            setError("");
            setConfirming(true);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
        >
          ส่งใบลา
        </button>
      ) : (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
          <p className="font-semibold text-slate-950">ยืนยันการส่งใบลา?</p>

          <p className="mt-1 text-sm leading-6 text-slate-600">
            ระบบจะคำนวณวันลาและยอดสิทธิ์ล่าสุดอีกครั้ง
            หากเกินสิทธิ์จะส่งให้หัวหน้าและ HR อนุมัติทั้งสองฝ่าย
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "กำลังส่งใบลา..." : "ยืนยันส่งใบลา"}
            </button>

            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
