import Link from "next/link";
import {
  HiArrowRight,
  HiOutlineBriefcase,
  HiOutlineCog6Tooth,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import { PERMISSIONS } from "@/constants/permissions";
import {
  getAvailableServices,
  isServiceActive,
  SERVICE_STATUS,
} from "@/constants/services";
import { requirePermission } from "@/lib/auth/authorization";

export const metadata = {
  title: "Services",
};

const serviceIcons = {
  user: HiOutlineUser,
  users: HiOutlineUserGroup,
  projects: HiOutlineBriefcase,
  settings: HiOutlineCog6Tooth,
};

const serviceColors = {
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    action: "text-sky-700 dark:text-sky-300",
  },
  amber: {
    icon: "bg-amber-400 text-slate-950",
    action: "text-amber-700 dark:text-amber-400",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    action: "text-violet-700 dark:text-violet-300",
  },
  slate: {
    icon: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    action: "text-slate-700 dark:text-slate-300",
  },
};

const statusLabels = {
  [SERVICE_STATUS.ACTIVE]: "พร้อมใช้งาน",
  [SERVICE_STATUS.PREPARING]: "กำลังเตรียม",
  [SERVICE_STATUS.COMING_SOON]: "เร็ว ๆ นี้",
};

function ServiceCard({ service }) {
  const Icon = serviceIcons[service.icon] ?? HiOutlineBriefcase;
  const colors = serviceColors[service.color] ?? serviceColors.slate;
  const active = isServiceActive(service);

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}
        >
          <Icon className="size-7" aria-hidden="true" />
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {statusLabels[service.status]}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          {service.shortName}
        </p>

        <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          {service.name}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {service.description}
        </p>
      </div>

      <div
        className={`mt-6 flex items-center gap-2 text-sm font-bold ${
          active ? colors.action : "text-slate-400"
        }`}
      >
        <span>{active ? "เข้าใช้งาน" : "ยังไม่เปิดใช้งาน"}</span>

        {active ? <HiArrowRight className="size-4" aria-hidden="true" /> : null}
      </div>
    </>
  );

  const className =
    "group block min-h-72 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition dark:border-slate-800 dark:bg-slate-900";

  if (!active) {
    return (
      <article className={`${className} cursor-not-allowed opacity-75`}>
        {content}
      </article>
    );
  }

  return (
    <Link
      href={service.href}
      className={`${className} hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-200/60 focus:outline-none focus:ring-4 focus:ring-amber-300/40 dark:hover:border-amber-500 dark:hover:shadow-none`}
    >
      {content}
    </Link>
  );
}

export default async function PortalPage() {
  const currentSession = await requirePermission(PERMISSIONS.PORTAL_ACCESS);

  const services = getAvailableServices(currentSession.access.permissions);

  const firstName =
    currentSession.identity?.name?.trim()?.split(/\s+/)[0] ??
    currentSession.identity?.email ??
    "คุณ";

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <section className="rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-12 dark:border dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          SPJ Work Portal
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          สวัสดี {firstName}
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          เลือกบริการที่ต้องการใช้งาน
          ระบบจะแสดงเฉพาะบริการและข้อมูลที่คุณได้รับอนุญาตเท่านั้น
        </p>
      </section>

      <section className="mt-10">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            บริการที่คุณเข้าถึงได้
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            Applications & Services
          </h2>
        </div>

        {services.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-950 dark:text-white">
              ยังไม่มีบริการที่ได้รับอนุญาต
            </p>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              กรุณาติดต่อผู้ดูแลระบบของบริษัท
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
