import {
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMegaphone,
  HiOutlineUserGroup,
} from "react-icons/hi2";

export const metadata = {
  title: "Dashboard",
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
    description: "ยื่นคำขอ ตรวจสอบสิทธิ์ และอนุมัติแบบหลายขั้นตอน",
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

const summaryItems = [
  {
    label: "พนักงานทั้งหมด",
    value: "—",
    detail: "รอเริ่ม Employee Module",
  },
  {
    label: "คำขอลารออนุมัติ",
    value: "—",
    detail: "รอเริ่ม Leave Module",
  },
  {
    label: "พนักงานลาวันนี้",
    value: "—",
    detail: "รอข้อมูลปฏิทิน",
  },
  {
    label: "ประกาศล่าสุด",
    value: "—",
    detail: "รอเริ่ม Announcement Module",
  },
];

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl">
      <section>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
          ภาพรวมข้อมูลและกิจกรรมภายในบริษัท
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryItems.map((item) => (
            <article
              key={item.label}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {item.label}
              </p>

              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {item.value}
              </p>

              <p className="mt-2 text-xs text-slate-400">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
            Phase 1
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            HR Modules
          </h2>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {moduleCards.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.name}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
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
        </div>
      </section>

      <div className="mt-8 block sm:hidden">
        <p className="text-center text-xs text-slate-400">
          ใช้เมนูด้านบนเพื่อออกจากระบบ
        </p>
      </div>
    </main>
  );
}
