import Link from "next/link";
import {
  HiArrowLeft,
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineCloudArrowDown,
  HiOutlineCog6Tooth,
  HiOutlineIdentification,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from "react-icons/hi2";

export const metadata = {
  title: "Organization Settings",
};

const settingGroups = [
  {
    name: "ข้อมูลองค์กร",
    description:
      "ชื่อบริษัท ที่อยู่ โลโก้ เขตเวลา ภาษา และข้อมูลพื้นฐานขององค์กร",
    icon: HiOutlineBuildingOffice2,
    color: "sky",
  },
  {
    name: "ผู้ใช้งานและสิทธิ์",
    description: "จัดการบัญชีผู้ใช้ บทบาท กลุ่มสิทธิ์ และสถานะการเข้าถึงระบบ",
    icon: HiOutlineUserGroup,
    color: "violet",
  },
  {
    name: "Google Workspace",
    description: "ตั้งค่าการเชื่อมต่อ ตรวจสอบ และ Sync ผู้ใช้จาก superjeew.com",
    icon: HiOutlineCloudArrowDown,
    color: "emerald",
  },
  {
    name: "ตั้งค่าพนักงาน",
    description: "รูปแบบรหัสพนักงาน สถานะการจ้างงาน และข้อมูลมาตรฐานของพนักงาน",
    icon: HiOutlineIdentification,
    color: "amber",
  },
  {
    name: "นโยบายการลา",
    description: "ประเภทการลา สิทธิ์เริ่มต้น เงื่อนไข และรอบปีของวันลา",
    icon: HiOutlineCalendarDays,
    color: "rose",
  },
  {
    name: "Approval Workflow",
    description: "กำหนดผู้อนุมัติหลายขั้นตามแผนก ประเภทการลา และจำนวนวัน",
    icon: HiOutlineCog6Tooth,
    color: "indigo",
  },
  {
    name: "Audit Log",
    description: "ตรวจสอบกิจกรรมของผู้ใช้ การเพิ่ม แก้ไข ลบ และการเข้าสู่ระบบ",
    icon: HiOutlineShieldCheck,
    color: "slate",
  },
  {
    name: "Security",
    description:
      "ตั้งค่าความปลอดภัย session บัญชีฉุกเฉิน และข้อกำหนดการเข้าถึง",
    icon: HiOutlineLockClosed,
    color: "red",
  },
];

const colorClasses = {
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  violet:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  emerald:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-400 text-slate-950",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  indigo:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  slate: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
        >
          <HiArrowLeft className="size-4" aria-hidden="true" />
          กลับไปเลือกบริการ
        </Link>
      </div>

      <section className="mt-6 rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-12 dark:border dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
          Organization Settings
        </p>

        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          ตั้งค่าระบบ SPJ Work
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          จัดการโครงสร้างองค์กร ผู้ใช้งาน สิทธิ์ นโยบาย HR
          และบริการที่เชื่อมต่อกับระบบภายนอก
        </p>
      </section>

      <section className="mt-10">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Administration
          </p>

          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            การตั้งค่าองค์กร
          </h2>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {settingGroups.map((setting) => {
            const Icon = setting.icon;

            return (
              <article
                key={setting.name}
                className="min-h-64 cursor-not-allowed rounded-3xl border border-slate-200 bg-white p-6 opacity-80 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex size-12 items-center justify-center rounded-2xl ${
                      colorClasses[setting.color]
                    }`}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    กำลังเตรียม
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                  {setting.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {setting.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
