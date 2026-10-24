"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiClient } from "@/lib/axios/api-client";

export default function CompanyReadinessClient() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    apiClient
      .get("/system/company-readiness")
      .then((response) => {
        if (active) setReport(response.data?.data ?? null);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError?.response?.data?.error?.message ??
              "โหลดผลตรวจสอบไม่สำเร็จ",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Company Management
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          ตรวจข้อมูลรายบริษัท
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          ตรวจข้อมูลก่อนเปิดการจำกัดสิทธิ์การอ่านข้อมูลรายบริษัท
        </p>
      </div>

      {loading && <p role="status">กำลังตรวจข้อมูล...</p>}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {report && (
        <>
          <p
            role="status"
            className={`rounded-2xl p-5 font-semibold ${
              report.ready
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            }`}
          >
            {report.ready
              ? "ข้อมูลพื้นฐานพร้อมสำหรับขั้นตอนตรวจสิทธิ์รายบริษัท"
              : "ยังมีข้อมูลที่ต้องจัดให้ครบก่อนเปิดสิทธิ์รายบริษัท"}
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ["บริษัท", report.totals.companies],
              ["พนักงาน", report.totals.employees],
              ["พนักงานไม่มีบริษัท", report.totals.employeesMissingCompany],
              [
                "บริษัทพนักงานไม่ถูกต้อง",
                report.totals.employeesWithInvalidCompany,
              ],
              ["บัญชีที่ต้องแก้สิทธิ์", report.totals.membershipsWithIssues],
            ].map(([label, count]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {count}
                </p>
              </div>
            ))}
          </div>

          {report.missingCompany.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold">พนักงานที่ยังไม่มีบริษัท</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {report.missingCompany.map((item) => (
                  <li key={item.id}>
                    {item.employeeCode} — {item.displayName}
                  </li>
                ))}
              </ul>
              <Link
                href="/manage/company/employee-migration"
                className="mt-4 inline-block font-semibold text-sky-700 dark:text-sky-300"
              >
                ไปจัดบริษัทให้พนักงาน
              </Link>
            </section>
          )}

          {report.invalidCompany.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold">พนักงานที่อ้างอิงบริษัทไม่ถูกต้อง</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {report.invalidCompany.map((item) => (
                  <li key={item.id}>
                    {item.employeeCode} — {item.displayName} ({item.companyId})
                  </li>
                ))}
              </ul>
            </section>
          )}

          {report.membershipIssues.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-bold">บัญชีที่ยังต้องตั้งค่าสิทธิ์</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {report.membershipIssues.map((item) => (
                  <li key={item.uid}>
                    {item.uid} — {item.issue}
                  </li>
                ))}
              </ul>
              <Link
                href="/manage/access/company-assignments"
                className="mt-4 inline-block font-semibold text-sky-700 dark:text-sky-300"
              >
                ไปตั้งค่าสิทธิ์รายบริษัท
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}
