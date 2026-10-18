import Link from "next/link";
import {
  HiArrowRight,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMegaphone,
  HiOutlineUserGroup,
} from "react-icons/hi2";

export const metadata = {
  title: "HR Management",
};

const moduleCards = [
  {
    name: "ข้อมูลพนักงาน",
    description:
      "จัดการข้อมูลพนักงาน ตำแหน่ง แผนก หัวหน้างาน และขั้นตอนเตรียมบัญชีกับอุปกรณ์โดยฝ่าย IT",
    icon: HiOutlineUserGroup,
    href: "/manage/employee",
    enabled: true,
    status: "พร้อมใช้งาน",
  },
  {
    name: "แผนก",
    description:
      "จัดการข้อมูลแผนกสำหรับพนักงาน สายบังคับบัญชา และ Approval Workflow",
    icon: HiOutlineBuildingOffice2,
    href: "/manage/department",
    enabled: true,
    status: "พร้อมใช้งาน",
  },
  {
    name: "ระบบลา",
    description: "จัดการคำขอ สิทธิ์วันลา และการอนุมัติแบบหลายขั้นตอน",
    icon: HiOutlineClipboardDocumentCheck,
    href: "/manage/leave",
    enabled: false,
    status: "กำลังเตรียม",
  },
  {
    name: "ปฏิทิน",
    description: "แสดงวันลา วันหยุดบริษัท และวันหยุดประเทศไทย",
    icon: HiOutlineCalendarDays,
    href: "/manage/calendar",
    enabled: false,
    status: "กำลังเตรียม",
  },
  {
    name: "ประกาศ",
    description: "จัดการข่าวสารภายใน พร้อม Email และ LINE notification",
    icon: HiOutlineMegaphone,
    href: "/manage/announcements",
    enabled: false,
    status: "กำลังเตรียม",
  },
];

function ModuleCard({ module }) {
  const Icon = module.icon;

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
          <Icon className="size-6" aria-hidden="true" />
        </div>

        <span
          className={
            module.enabled
              ? "rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          }
        >
          {module.status}
        </span>
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
        {module.name}
      </h3>

      <p className="mt-2 min-h-18 text-sm leading-6 text-slate-600 dark:text-slate-400">
        {module.description}
      </p>

      <div
        className={
          module.enabled
            ? "mt-5 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400"
            : "mt-5 flex items-center gap-2 text-sm font-semibold text-slate-400"
        }
      >
        <span>{module.enabled ? "เข้าใช้งาน" : "ยังไม่เปิดใช้งาน"}</span>

        {module.enabled ? (
          <HiArrowRight className="size-4" aria-hidden="true" />
        ) : null}
      </div>
    </>
  );

  const className =
    "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900";

  if (!module.enabled) {
    return (
      <article className={`${className} cursor-not-allowed opacity-80`}>
        {content}
      </article>
    );
  }

  return (
    <Link
      href={module.href}
      className={`${className} transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-200/60 focus:outline-none focus:ring-4 focus:ring-amber-300/30 dark:hover:border-amber-500 dark:hover:shadow-none`}
    >
      {content}
    </Link>
  );
}

export default function HrPage() {
  return (
    <main className="mx-auto w-full max-w-7xl">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10 dark:border dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          HR Management
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight">
          บริหารทรัพยากรบุคคล
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          พื้นที่สำหรับบริหารข้อมูลพนักงาน โครงสร้างองค์กร ระบบลา ปฏิทิน
          และการสื่อสารภายในบริษัท
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {moduleCards.map((module) => (
          <ModuleCard key={module.name} module={module} />
        ))}
      </section>
    </main>
  );
}
