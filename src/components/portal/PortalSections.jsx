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
    description: "ยื่นใบลา ตรวจสอบวันลาคงเหลือ และติดตามสถานะ",
    icon: HiOutlineClipboardDocumentCheck,
    color: "bg-amber-50 text-amber-600",
  },
  {
    name: "ปฏิทิน",
    description: "ดูวันหยุด กิจกรรม และตารางงานของบริษัท",
    icon: HiOutlineCalendarDays,
    color: "bg-sky-50 text-sky-600",
  },
  {
    name: "ประกาศ",
    description: "ข่าวสารสำคัญจากบริษัทและอัปเดตต่าง ๆ",
    icon: HiOutlineMegaphone,
    color: "bg-rose-50 text-rose-600",
  },
  {
    name: "My Assets",
    description: "ตรวจสอบอุปกรณ์และซอฟต์แวร์ที่ได้รับ",
    icon: HiOutlineComputerDesktop,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    name: "IT Helpdesk",
    description: "แจ้งปัญหา IT และติดตามสถานะใบงาน",
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
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-xl font-bold text-slate-950 sm:text-2xl">
        <Icon className="size-6 text-amber-500" aria-hidden="true" />
        {children}
      </h2>
      {action ? (
        <span className="text-xs font-medium text-slate-500 sm:text-sm">
          {action}
        </span>
      ) : null}
    </div>
  );
}

export default function PortalSections({ services }) {
  const activeServices = services.filter(
    (service) => isServiceActive(service) && service.id !== "my-services",
  );

  return (
    <div className="space-y-7 py-7 sm:space-y-9 sm:py-9">
      <section
        aria-labelledby="portal-tasks-title"
        className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div id="portal-tasks-title">
          <SectionTitle icon={HiOutlineClipboardDocumentCheck}>
            งานที่ต้องดำเนินการ
          </SectionTitle>
        </div>

        <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-600">
          ยังไม่มีรายการที่ต้องดำเนินการ เมื่อระบบลาและ IT Helpdesk เปิดใช้งาน
          งานที่เกี่ยวข้องกับคุณจะแสดงที่นี่
        </p>
      </section>

      <section aria-labelledby="portal-favorites-title">
        <div id="portal-favorites-title">
          <SectionTitle
            icon={HiOutlineStar}
            action="ปรับแต่งรายการโปรด — เร็ว ๆ นี้"
          >
            Favorites
          </SectionTitle>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;

            return (
              <div
                key={shortcut.name}
                className="flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm sm:flex-col sm:justify-center sm:text-center lg:flex-row lg:justify-start lg:text-left"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${shortcut.color}`}
                >
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold">{shortcut.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="portal-services-title">
        <div id="portal-services-title">
          <SectionTitle
            icon={HiOutlineSquares2X2}
            action="บริการที่จะเปิดใช้งาน"
          >
            Services
          </SectionTitle>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {serviceItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.name}
                className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <span
                  className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${item.color}`}
                >
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-950">{item.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.description}
                  </p>
                </div>
                <span className="sr-only">กำลังเตรียม</span>
                <HiOutlineChevronRight
                  className="size-5 shrink-0 text-slate-300"
                  aria-hidden="true"
                />
              </article>
            );
          })}
        </div>

        {activeServices.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              พื้นที่บริหารที่เปิดใช้งานแล้ว
            </p>
            <div className="flex flex-wrap gap-2">
              {activeServices.map((service) => (
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
