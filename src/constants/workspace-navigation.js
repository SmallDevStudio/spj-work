import {
  HiOutlineBuildingOffice2,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCog6Tooth,
  HiOutlineHome,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
} from "react-icons/hi2";

import { PERMISSIONS } from "@/constants/permissions";

export const WORKSPACE_SETTINGS = Object.freeze({
  hr: {
    name: "จัดการ SPJ Work",
    shortName: "Management",
    homeHref: "/manage",
    activeClassName: "bg-amber-400 text-slate-950 shadow-sm",
    brandClassName: "bg-amber-400 text-slate-950",
    navigation: [
      {
        name: "Dashboard",
        href: "/manage",
        icon: HiOutlineHome,
        permissions: [PERMISSIONS.SERVICE_HR_ACCESS, PERMISSIONS.ORGANIZATION_MANAGE],
        enabled: true,
      },
      {
        name: "ข้อมูลพนักงาน",
        href: "/manage/employee",
        icon: HiOutlineUserGroup,
        permissions: [PERMISSIONS.EMPLOYEE_READ_ALL, PERMISSIONS.EMPLOYEE_READ],
        enabled: true,
      },
      {
        name: "แผนก",
        href: "/manage/department",
        icon: HiOutlineBuildingOffice2,
        permissions: [PERMISSIONS.DEPARTMENT_READ],
        enabled: true,
      },
      {
        name: "การลา",
        href: "/manage/leave",
        icon: HiOutlineClipboardDocumentCheck,
        permissions: [PERMISSIONS.SERVICE_HR_ACCESS],
        enabled: true,
        children: [
          { name: "ประวัติการลา", href: "/manage/leave/history", permissions: [PERMISSIONS.LEAVE_READ_ALL] },
          { name: "ประเภทการลา", href: "/manage/leave/settings", permissions: [PERMISSIONS.HR_SETTINGS_READ] },
          { name: "Leave Templates", href: "/manage/leave/templates", permissions: [PERMISSIONS.LEAVE_BALANCE_MANAGE] },
          { name: "มอบ Template", href: "/manage/leave/assignments", permissions: [PERMISSIONS.LEAVE_BALANCE_MANAGE] },
          { name: "วันหยุด", href: "/manage/leave/holidays", permissions: [PERMISSIONS.HOLIDAY_MANAGE] },
          { name: "โอนงาน HR ค้าง", href: "/manage/leave/takeover", permissions: [PERMISSIONS.LEAVE_WORKFLOW_MANAGE] },
        ],
      },
      {
        name: "ข้อมูลบริษัท",
        href: "/manage/company",
        icon: HiOutlineBuildingOffice2,
        permissions: [PERMISSIONS.ORGANIZATION_MANAGE],
        enabled: true,
      },
      {
        name: "จัดการสิทธิ์",
        href: "/manage/access",
        icon: HiOutlineShieldCheck,
        permissions: [
          PERMISSIONS.ORGANIZATION_MANAGE,
          PERMISSIONS.ROLE_MANAGE,
          PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
        ],
        enabled: true,
      },
      {
        name: "ตั้งค่าแอป",
        href: "/settings",
        icon: HiOutlineCog6Tooth,
        permissions: [PERMISSIONS.ORGANIZATION_MANAGE],
        enabled: true,
      },
    ],
  },
});
