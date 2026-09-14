import Link from "next/link";
import {
  HiArrowRight,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentCheck,
  HiOutlineMegaphone,
  HiOutlineUser,
} from "react-icons/hi2";

export const metadata = {
  title: "My Services",
};

const services = [
  {
    name: "ข้อมูลของฉัน",
    description: "ตรวจสอบข้อมูลส่วนตัว ข้อมูลการทำงาน และผู้อนุมัติของคุณ",
    href: "/app/me/profile",
    icon: HiOutlineUser,
    status: "กำลังเตรียม",
  },
  {
    name: "ขอลา",
    description: "ตรวจสอบสิทธิ์วันลา ยื่นคำขอ และติดตามสถานะการอนุมัติ",
    href: "/app/me/leave",
    icon: HiOutlineClipboardDocumentCheck,
    status: "กำลังเตรียม",
  },
  {
    name: "ปฏิทินของฉัน",
    description: "ดูวันลา วันหยุดบริษัท และวันหยุดประจำปีของประเทศไทย",
    href: "/app/me/calendar",
    icon: HiOutlineCalendarDays,
    status: "กำลังเตรียม",
  },
  {
    name: "ประกาศ",
    description: "อ่านข่าวสารและประกาศล่าสุดภายในบริษัท",
    href: "/app/me/announcements",
    icon: HiOutlineMegaphone,
    status: "กำลังเตรียม",
  },
];

export default function MyServicesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl">
      <section className="rounded-[2rem] bg-sky-700 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">
          Employee Self-Service
        </p>

        <h2 className="mt-3 text-3xl font-black tracking-tight">
          บริการของฉัน
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100 sm:text-base">
          จัดการข้อมูลและคำขอของคุณได้จากพื้นที่ส่วนตัว
          โดยระบบจะแสดงเฉพาะข้อมูลที่เกี่ยวข้องกับบัญชีของคุณ
        </p>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => {
          const Icon = service.icon;

          return (
            <article
              key={service.name}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Icon className="size-6" aria-hidden="true" />
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {service.status}
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                {service.name}
              </h3>

              <p className="mt-2 min-h-18 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {service.description}
              </p>

              <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-400">
                <span>ยังไม่เปิดใช้งาน</span>
                <HiArrowRight className="size-4" aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </section>

      <div className="mt-8">
        <Link
          href="/app"
          className="text-sm font-semibold text-sky-700 hover:text-sky-800 dark:text-sky-300"
        >
          กลับไปเลือกบริการ
        </Link>
      </div>
    </main>
  );
}
