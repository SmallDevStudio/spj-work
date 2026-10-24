import Link from "next/link";
import { PERMISSIONS } from "@/constants/permissions";
import { requireCurrentSession } from "@/lib/auth/authorization";
import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from "react-icons/hi2";

export const metadata = { title: "ตั้งค่าแอป | SPJ Work" };

const groups = [
  {
    title: "ข้อมูลบริษัท",
    description: "จัดการบริษัทที่ใช้งานในองค์กร",
    href: "/manage/company",
    permission: PERMISSIONS.ORGANIZATION_MANAGE,
    icon: HiOutlineBuildingOffice2,
  },
  {
    title: "วันทำงานของบริษัท",
    description: "กำหนดวันทำงานที่ใช้คำนวณวันลาแยกแต่ละบริษัท",
    href: "/manage/company/work-schedules",
    permission: PERMISSIONS.HR_SETTINGS_MANAGE,
    icon: HiOutlineClock,
  },
  {
    title: "ผู้ใช้งานและสิทธิ์",
    description: "กำหนดบทบาท สิทธิ์รายบริษัท และการมอบหน้าที่",
    href: "/manage/access",
    permission: PERMISSIONS.ORGANIZATION_MANAGE,
    icon: HiOutlineUserGroup,
  },
  {
    title: "ประเภทการลา",
    description: "กำหนดประเภทและเงื่อนไขการลา",
    href: "/manage/leave/settings",
    permission: PERMISSIONS.LEAVE_POLICY_MANAGE,
    icon: HiOutlineCalendarDays,
  },
  {
    title: "วันหยุด",
    description: "จัดการวันหยุดที่ใช้ในการคำนวณวันลา",
    href: "/manage/leave/holidays",
    permission: PERMISSIONS.HOLIDAY_MANAGE,
    icon: HiOutlineCalendarDays,
  },
  {
    title: "ความปลอดภัยและ Audit Log",
    description: "รายการตั้งค่าและหน้าตรวจสอบเพิ่มเติมจะเปิดในขั้นถัดไป",
    icon: HiOutlineShieldCheck,
  },
];

export default async function SettingsPage() {
  const session = await requireCurrentSession();
  const visibleGroups = groups.filter(
    (group) => !group.permission || session.access.permissions.includes(group.permission),
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <p className="text-sm font-semibold text-amber-700">SPJ Work / Settings</p>
      <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
        ตั้งค่าแอป
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        ตั้งค่าบริษัท สิทธิ์การเข้าถึง และนโยบายส่วนกลาง
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleGroups.map((group) => {
          const Icon = group.icon;
          const content = (
            <>
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                {group.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {group.description}
              </p>
              <span className="mt-5 inline-block text-sm font-bold text-amber-700 dark:text-amber-400">
                {group.href ? "เปิดจัดการ →" : "กำลังเตรียม"}
              </span>
            </>
          );

          return group.href ? (
            <Link
              key={group.title}
              href={group.href}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {content}
            </Link>
          ) : (
            <div
              key={group.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 opacity-70 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {content}
            </div>
          );
        })}
      </div>
    </main>
  );
}
