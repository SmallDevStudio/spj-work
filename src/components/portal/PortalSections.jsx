import Link from "next/link";
import {
  HiOutlineCalendarDays,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentCheck,
  HiOutlineComputerDesktop,
  HiOutlineMegaphone,
  HiOutlineSquares2X2,
  HiOutlineStar,
  HiOutlineTicket,
} from "react-icons/hi2";

import { isServiceActive } from "@/constants/services";

const shortcuts = [
  {
    name: "เขียนใบลา",
    icon: HiOutlineClipboardDocumentCheck,
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "ปฏิทิน",
    icon: HiOutlineCalendarDays,
    color: "bg-sky-50 text-sky-600",
  },
  {
    name: "ประกาศ",
    icon: HiOutlineMegaphone,
    color: "bg-rose-50 text-rose-600",
  },
  {
    name: "My Assets",
    icon: HiOutlineComputerDesktop,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "IT Helpdesk",
    icon: HiOutlineTicket,
    color: "bg-indigo-50 text-indigo-600",
  },
];

const serviceItems = [
  {
    name: "การลา",
    description: "ยื่นใบลา ตรวจสอบสิทธิ์และติดตามสถานะ",
    icon: HiOutlineClipboardDocumentCheck,
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "ปฏิทิน",
    description: "วันหยุด กิจกรรม และตารางงาน",
    icon: HiOutlineCalendarDays,
    color: "bg-sky-50 text-sky-600",
  },
  {
    name: "ประกาศ",
    description: "ข่าวสารและประกาศจากบริษัท",
    icon: HiOutlineMegaphone,
    color: "bg-rose-50 text-rose-600",
  },
  {
    name: "My Assets",
    description: "อุปกรณ์และซอฟต์แวร์ที่ได้รับ",
    icon: HiOutlineComputerDesktop,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "IT Helpdesk",
    description: "แจ้งปัญหาและติดตามใบงาน",
    icon: HiOutlineTicket,
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    name: "Projects",
    description: "ติดตามงานโปรเจกต์ต่าง ๆ",
    icon: HiOutlineSquares2X2,
    color: "bg-slate-100 text-slate-500",
  },
];

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold text-slate-950 sm:text-2xl">
        <Icon className="size-6 shrink-0 text-amber-500" aria-hidden="true" />
        {children}
      </h2>

      {action ? (
        <span className="shrink-0 text-[11px] text-slate-500 sm:text-sm">
          {action}
        </span>
      ) : null}
    </div>
  );
}

export default function PortalSections({ services }) {
  const activeManagementServices = services.filter(
    (service) => isServiceActive(service) && service.id !== "my-services",
  );

  return (
    <div className="space-y-5 py-5 sm:space-y-7 sm:py-7 xl:space-y-8">
      <section
        aria-labelledby="portal-tasks-title"
        className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div id="portal-tasks-title">
          <SectionTitle icon={HiOutlineClipboardDocumentCheck}>
            งานที่ต้องดำเนินการ
          </SectionTitle>
        </div>

        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
          ยังไม่มีรายการที่ต้องดำเนินการ เมื่อระบบลาและใบงานเปิดใช้งาน
          รายการของคุณจะแสดงที่นี่
        </p>
      </section>

      <section aria-labelledby="portal-favorites-title">
        <div id="portal-favorites-title">
          <SectionTitle icon={HiOutlineStar} action="กำลังเตรียม">
            Favorites
          </SectionTitle>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;

            return (
              <div
                key={shortcut.name}
                className="flex min-w-0 min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 text-center text-slate-600 shadow-sm sm:min-h-28 sm:p-3 xl:flex-row xl:justify-start xl:gap-3 xl:px-5 xl:text-left"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12 ${shortcut.color}`}
                >
                  <Icon className="size-5 sm:size-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-[10px] font-semibold leading-4 sm:text-sm">
                  {shortcut.name}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="portal-services-title">
        <div id="portal-services-title">
          <SectionTitle icon={HiOutlineSquares2X2} action="กำลังเตรียม">
            Services
          </SectionTitle>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
          {serviceItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.name}
                className="flex min-w-0 min-h-28 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-14 sm:rounded-2xl ${item.color}`}
                >
                  <Icon className="size-5 sm:size-7" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-bold text-slate-950 sm:text-base">
                    {item.name}
                  </h3>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500 sm:text-xs sm:leading-5">
                    {item.description}
                  </p>
                </div>

                <HiOutlineChevronRight
                  className="hidden size-5 shrink-0 text-slate-300 sm:block"
                  aria-hidden="true"
                />
              </article>
            );
          })}
        </div>

        {activeManagementServices.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              พื้นที่บริหารที่เปิดใช้งานแล้ว
            </p>

            <div className="flex flex-wrap gap-2">
              {activeManagementServices.map((service) => (
                <Link
                  key={service.id}
                  href={service.href}
                  className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  {service.name}
                  <HiOutlineChevronRight
                    className="size-4"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
