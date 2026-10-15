import {
  HiOutlineBuildingOffice2,
  HiOutlineCalendarDays,
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlineHome,
  HiOutlineMegaphone,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import { PERMISSIONS } from "@/constants/permissions";

export const WORKSPACE_SETTINGS = Object.freeze({
  me: {
    name: "บริการของฉัน",
    shortName: "My Services",
    homeHref: "/app/me",
    activeClassName: "bg-sky-600 text-white shadow-sm",
    brandClassName: "bg-sky-600 text-white",
    navigation: [
      {
        name: "ภาพรวม",
        href: "/app/me",
        icon: HiOutlineHome,
        permissions: [PERMISSIONS.SERVICE_MY_ACCESS],
        enabled: true,
      },
      {
        name: "ข้อมูลของฉัน",
        href: "/app/me/profile",
        icon: HiOutlineUser,
        permissions: [PERMISSIONS.EMPLOYEE_READ_OWN],
        enabled: false,
      },
      {
        name: "การลาของฉัน",
        href: "/app/me/leave",
        icon: HiOutlineClipboardDocumentCheck,
        permissions: [PERMISSIONS.LEAVE_READ_OWN],
        enabled: false,
      },
      {
        name: "ปฏิทิน",
        href: "/app/me/calendar",
        icon: HiOutlineCalendarDays,
        permissions: [PERMISSIONS.CALENDAR_READ_OWN],
        enabled: false,
      },
      {
        name: "ประกาศ",
        href: "/app/me/announcements",
        icon: HiOutlineMegaphone,
        permissions: [PERMISSIONS.ANNOUNCEMENT_READ],
        enabled: false,
      },
    ],
  },

  hr: {
    name: "บริหารทรัพยากรบุคคล",
    shortName: "HR Management",
    homeHref: "/manage/hr",
    activeClassName: "bg-amber-400 text-slate-950 shadow-sm",
    brandClassName: "bg-amber-400 text-slate-950",
    navigation: [
      {
        name: "ภาพรวม HR",
        href: "/manage/hr",
        icon: HiOutlineHome,
        permissions: [PERMISSIONS.SERVICE_HR_ACCESS],
        enabled: true,
      },
      {
        name: "ข้อมูลพนักงาน",
        href: "/manage/hr/employees",
        icon: HiOutlineUserGroup,
        permissions: [PERMISSIONS.EMPLOYEE_READ_ALL, PERMISSIONS.EMPLOYEE_READ],
        enabled: true,
      },
      {
        name: "แผนก",
        href: "/manage/hr/departments",
        icon: HiOutlineBuildingOffice2,
        permissions: [PERMISSIONS.DEPARTMENT_READ],
        enabled: true,
      },
      {
        name: "จัดการการลา",
        href: "/manage/hr/leave",
        icon: HiOutlineClipboardDocumentCheck,
        permissions: [PERMISSIONS.LEAVE_READ_ALL, PERMISSIONS.LEAVE_MANAGE],
        enabled: false,
      },
      {
        name: "ปฏิทินบริษัท",
        href: "/manage/hr/calendar",
        icon: HiOutlineCalendarDays,
        permissions: [PERMISSIONS.CALENDAR_READ_ALL],
        enabled: false,
      },
      {
        name: "ประกาศ",
        href: "/manage/hr/announcements",
        icon: HiOutlineMegaphone,
        permissions: [
          PERMISSIONS.ANNOUNCEMENT_CREATE,
          PERMISSIONS.ANNOUNCEMENT_UPDATE,
        ],
        enabled: false,
      },
      {
        name: "รายงาน",
        href: "/manage/hr/reports",
        icon: HiOutlineChartBarSquare,
        permissions: [PERMISSIONS.LEAVE_REPORT_READ],
        enabled: false,
      },
      {
        name: "ตั้งค่า HR",
        href: "/manage/hr/settings",
        icon: HiOutlineCog6Tooth,
        permissions: [PERMISSIONS.HR_SETTINGS_READ],
        enabled: false,
      },
      {
        name: "Audit Log",
        href: "/manage/hr/audit-logs",
        icon: HiOutlineShieldCheck,
        permissions: [PERMISSIONS.AUDIT_READ],
        enabled: false,
      },
    ],
  },
});
