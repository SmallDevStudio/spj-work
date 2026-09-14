import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMegaphone,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import FirebaseStatus from "@/components/system/FirebaseStatus";
import { APP_CONFIG } from "@/config/app.config";

const modules = [
  {
    name: "ข้อมูลพนักงาน",
    description: "จัดการข้อมูลพนักงาน แผนก ตำแหน่ง และโครงสร้างองค์กร",
    icon: HiOutlineUserGroup,
  },
  {
    name: "ระบบลา",
    description: "ยื่นคำขอ ตรวจสอบสิทธิ์ และอนุมัติแบบหลายขั้นตอน",
    icon: HiOutlineClipboardDocumentCheck,
  },
  {
    name: "ปฏิทิน",
    description: "แสดงวันลา วันหยุดบริษัท และวันหยุดประเทศไทย",
    icon: HiOutlineCalendarDays,
  },
  {
    name: "ประกาศ",
    description: "แจ้งข่าวสารภายในบริษัทผ่านระบบ Email และ LINE",
    icon: HiOutlineMegaphone,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-5 py-12 sm:px-8 lg:px-12">
        <div className="mb-10 max-w-3xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            HR Management Foundation
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {APP_CONFIG.organizationName}
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
            {APP_CONFIG.name}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
            ระบบบริหารทรัพยากรบุคคลและการจัดการงานภายใน
            ที่ออกแบบสำหรับทีมผลิตรายการโทรทัศน์และงานคอนเทนต์
          </p>

          <div className="mt-6">
            <FirebaseStatus />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.name}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                  <Icon className="size-6" aria-hidden="true" />
                </div>

                <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                  {module.name}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {module.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
