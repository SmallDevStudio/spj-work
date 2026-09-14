import { redirect } from "next/navigation";
import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMegaphone,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import LogoutButton from "@/components/auth/LogoutButton";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";

export const metadata = {
  title: "Dashboard",
};

const dashboardModules = [
  {
    name: "ข้อมูลพนักงาน",
    description: "ข้อมูลพนักงานและโครงสร้างองค์กร",
    icon: HiOutlineUserGroup,
  },
  {
    name: "การลา",
    description: "คำขอลา สิทธิ์ลา และรายการอนุมัติ",
    icon: HiOutlineClipboardDocumentCheck,
  },
  {
    name: "ปฏิทิน",
    description: "วันลาและวันหยุดของบริษัท",
    icon: HiOutlineCalendarDays,
  },
  {
    name: "ประกาศ",
    description: "ข่าวสารและประกาศภายใน",
    icon: HiOutlineMegaphone,
  },
];

export default async function DashboardPage() {
  const currentSession = await requirePermission(
    PERMISSIONS.DASHBOARD_READ,
  ).catch(() => null);

  if (!currentSession) {
    redirect("/login");
  }

  const { identity, access } = currentSession;

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-6 dark:bg-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {access.organization.name}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              สวัสดี {identity.name ?? identity.email}
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Role: {access.membership.role}
              {" · "}
              Permissions: {access.permissions.length}
            </p>
          </div>

          <LogoutButton />
        </header>

        <section className="mt-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              HR Management
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              Dashboard
            </h2>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardModules.map((module) => {
              const Icon = module.icon;

              return (
                <article
                  key={module.name}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                    <Icon className="size-6" aria-hidden="true" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                    {module.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {module.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
