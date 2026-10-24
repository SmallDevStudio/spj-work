import Link from "next/link";
import { notFound } from "next/navigation";

import { PERMISSIONS } from "@/constants/permissions";
import { getUserRoutes } from "@/constants/user-routes";
import { requireOwnEmployeePermission } from "@/lib/auth/authorization";
import { getOwnLeaveRequest } from "@/repositories/leave/employee-leave-request.repository";
import { ApplicationError } from "@/lib/errors/application-error";
import { previewOwnLeaveDraft } from "@/services/leave/leave-draft-preview.service";
import SubmitLeaveDraftButton from "@/components/leave/SubmitLeaveDraftButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "รายละเอียดใบลา | SPJ Work",
};

const leaveTypeLabels = {
  ANNUAL: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  MATERNITY: "ลาคลอด",
  ORDINATION: "ลาบวช",
  UNPAID: "ลาโดยไม่รับเงินตอบแทน",
  OTHER: "ลาอื่น ๆ",
};

const statusLabels = {
  DRAFT: "ฉบับร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

const dayPartLabels = {
  FULL_DAY: "เต็มวัน",
  MORNING: "ครึ่งวันเช้า",
  AFTERNOON: "ครึ่งวันบ่าย",
};

function formatThaiDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function Detail({ label, children }) {
  return (
    <div className="border-b border-slate-100 py-4 last:border-b-0 sm:grid sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-950 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}

export default async function LeaveRequestDetailPage({ params }) {
  const { userId, requestId } = await params;

  const currentSession = await requireOwnEmployeePermission({
    userId,
    permission: PERMISSIONS.LEAVE_READ_OWN,
  });

  const request = await getOwnLeaveRequest({
    organizationId: currentSession.access.organization.id,
    employeeId: currentSession.access.membership.employeeId,
    userId,
    requestId,
  });

  if (!request) {
    notFound();
  }

  let preview = null;
  let previewError = null;

  if (request.status === "DRAFT") {
    try {
      preview = await previewOwnLeaveDraft({
        organizationId: currentSession.access.organization.id,
        employeeId: currentSession.access.membership.employeeId,
        userId,
        request,
      });
    } catch (error) {
      if (!(error instanceof ApplicationError)) {
        throw error;
      }

      previewError = error.message;
    }
  }

  const leaveHref = getUserRoutes(userId).LEAVE;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-7 sm:py-8">
      <Link
        href={leaveHref}
        className="text-sm font-semibold text-sky-700 hover:underline"
      >
        ← กลับไปการลาของฉัน
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
          รายละเอียดใบลา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          ตรวจสอบข้อมูลและสถานะใบลาของคุณ
        </p>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-950">
            {leaveTypeLabels[request.leaveTypeCode] ??
              request.leaveTypeCode ??
              "ใบลา"}
          </h2>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {statusLabels[request.status] ?? request.status}
          </span>
        </div>

        <dl className="mt-5">
          <Detail label="วันเริ่มลา">
            {formatThaiDate(request.startDate)}
          </Detail>

          <Detail label="วันสิ้นสุด">{formatThaiDate(request.endDate)}</Detail>

          <Detail label="ช่วงเวลา">
            {dayPartLabels[request.dayPart] ?? request.dayPart}
          </Detail>

          <Detail label="จำนวนวันที่นับ">
            {preview
              ? `${preview.requestedDays} วัน`
              : request.requestedDays != null
                ? `${request.requestedDays} วัน`
                : "ยังคำนวณไม่ได้"}
          </Detail>

          <Detail label="รายละเอียดการลา">
            <span className="whitespace-pre-wrap break-words font-normal">
              {request.reason || "ไม่ได้ระบุ"}
            </span>
          </Detail>
        </dl>

        {preview ? (
          <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-950">
            <p className="font-semibold">
              ผลคำนวณเบื้องต้น: {preview.requestedDays} วัน
            </p>

            <p className="mt-2">
              วันที่นับ: {preview.countedDates.length} วันที่
            </p>

            {preview.excludedDates.length > 0 ? (
              <p className="mt-1 text-sky-800">
                วันที่ไม่นับ: {preview.excludedDates.length} วันที่
              </p>
            ) : null}

            <p className="mt-2 text-xs text-sky-700">
              ระบบจะตรวจและคำนวณอีกครั้งเมื่อส่งใบลา
            </p>
          </div>
        ) : null}

        {previewError ? (
          <p
            role="status"
            className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            ยังไม่สามารถคำนวณวันลา: {previewError}
          </p>
        ) : null}

        {request.status === "DRAFT" ? (
          <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            ใบนี้ยังเป็นฉบับร่าง ยังไม่ได้ส่งให้ผู้อนุมัติ
          </p>
        ) : null}
        {request.status === "DRAFT" ? (
          <SubmitLeaveDraftButton requestId={requestId} />
        ) : null}
      </section>
    </main>
  );
}
