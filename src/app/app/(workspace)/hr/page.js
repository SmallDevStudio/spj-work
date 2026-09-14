import {
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
    description: "จัดการข้อมูลพนักงาน แผนก ตำแหน่ง และโครงสร้างองค์กร",
    icon: HiOutlineUserGroup,
    status: "กำลังเตรียม",
  },
  {
    name: "ระบบลา",
    description: "จัดการคำขอ สิทธิ์วันลา และการอนุมัติแบบหลายขั้นตอน",
    icon: HiOutlineClipboardDocumentCheck,
    status: "กำลังเตรียม",
  },
  {
    name: "ปฏิทิน",
    description: "แสดงวันลา วันหยุดบริษัท และวันหยุดประเทศไทย",
    icon: HiOutlineCalendarDays,
    status: "กำลังเตรียม",
  },
  {
    name: "ประกาศ",
    description: "จัดการข่าวสารภายใน พร้อม Email และ LINE notification",
    icon: HiOutlineMegaphone,
    status: "กำลังเตรียม",
  },
];

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
          พื้นที่สำหรับบริหารข้อมูลพนักงาน ระบบลา ปฏิทิน
          และการสื่อสารภายในบริษัท
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {moduleCards.map((module) => {
          const Icon = module.icon;

          return (
            <article
              key={module.name}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                  <Icon className="size-6" aria-hidden="true" />
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {module.status}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                {module.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {module.description}
              </p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
