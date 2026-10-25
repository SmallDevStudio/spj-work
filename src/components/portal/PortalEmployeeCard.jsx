import Link from "next/link";
import { HiOutlineCalendarDays, HiOutlineClipboardDocumentList, HiOutlineUserCircle } from "react-icons/hi2";
import LeaveBalanceStrip from "@/components/leave/LeaveBalanceStrip";
import { getUserRoutes } from "@/constants/user-routes";

function EmployeeDetail({ label, value }) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 text-sm sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 truncate font-medium text-slate-900">
        {value || "ยังไม่ระบุ"}
      </dd>
    </div>
  );
}

export default function PortalEmployeeCard({
  employee,
  departmentName,
  managerName,
  fallbackName,
  userId,
}) {
  const name = employee?.displayName || fallbackName || "ผู้ใช้งาน SPJ Work";
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      aria-label="ข้อมูลพนักงานและวันลา"
      className="grid gap-4 md:grid-cols-2 xl:gap-0 xl:overflow-hidden xl:rounded-[1.75rem] xl:border xl:border-slate-200 xl:bg-white xl:shadow-xl xl:shadow-slate-950/15"
    >
      <section
        aria-labelledby="portal-employee-name"
        className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:rounded-none xl:border-0 xl:border-r xl:shadow-none"
      >
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="flex size-22 shrink-0 items-center justify-center rounded-full bg-slate-100 text-4xl font-bold text-slate-600 ring-4 ring-white shadow-md sm:size-28 xl:size-32">
            {employee ? (
              initial
            ) : (
              <HiOutlineUserCircle className="size-16" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="hidden text-sm text-slate-600 xl:block">
              สวัสดี <span aria-hidden="true">👋</span>
            </p>

            <h2
              id="portal-employee-name"
              className="truncate text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
            >
              {name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              รหัสพนักงาน{" "}
              <span className="font-medium text-slate-800">
                {employee?.employeeCode || "ยังไม่เชื่อมข้อมูล"}
              </span>
            </p>

            <dl className="mt-4 space-y-2">
              <EmployeeDetail label="ตำแหน่ง" value={employee?.positionTitle} />
              <EmployeeDetail label="ฝ่าย" value={departmentName} />
              <EmployeeDetail label="หัวหน้างาน" value={managerName} />
            </dl>
          </div>
        </div>

        {!employee ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            บัญชีนี้ยังไม่ได้เชื่อมกับข้อมูลพนักงาน
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="portal-leave-heading"
        className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:rounded-none xl:border-0 xl:shadow-none"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="portal-leave-heading"
            className="flex items-center gap-2 text-lg font-bold text-slate-950 sm:text-xl"
          >
            <HiOutlineCalendarDays
              className="size-6 text-amber-500"
              aria-hidden="true"
            />
            วันลาคงเหลือ
          </h2>

          <span className="text-xs text-slate-500">ปี {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date())}</span>
        </div>

        <div className="mt-4"><LeaveBalanceStrip enabled={Boolean(employee && employee.userId === userId)} compact /></div>

        <Link href={employee && employee.userId === userId ? getUserRoutes(userId).LEAVE : "#portal-leave-heading"} className="mt-3 flex min-h-14 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-slate-950 sm:text-base">
          <HiOutlineClipboardDocumentList
            className="size-5"
            aria-hidden="true"
          />
          {employee && employee.userId === userId ? "เขียนใบลา" : "เชื่อมข้อมูลพนักงานเพื่อเขียนใบลา"}
        </Link>
      </section>
    </div>
  );
}
