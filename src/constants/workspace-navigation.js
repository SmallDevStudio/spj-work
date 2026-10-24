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
        href: "/manage",
        icon: HiOutlineHome,
        permissions: [PERMISSIONS.SERVICE_HR_ACCESS],
        enabled: true,
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
