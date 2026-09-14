import { PERMISSIONS } from "@/constants/permissions";

export const SERVICE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  PREPARING: "PREPARING",
  COMING_SOON: "COMING_SOON",
});

export const SERVICES = Object.freeze([
  {
    id: "my-services",
    name: "บริการของฉัน",
    shortName: "My Services",
    description:
      "ตรวจสอบข้อมูลส่วนตัว สิทธิ์วันลา ยื่นคำขอลา ปฏิทิน และประกาศภายในบริษัท",
    href: "/app/me",
    icon: "user",
    permission: PERMISSIONS.SERVICE_MY_ACCESS,
    status: SERVICE_STATUS.ACTIVE,
    color: "sky",
    order: 10,
  },
  {
    id: "hr",
    name: "บริหารทรัพยากรบุคคล",
    shortName: "HR Management",
    description:
      "จัดการข้อมูลพนักงาน โครงสร้างองค์กร การลา ปฏิทิน ประกาศ และรายงาน",
    href: "/app/hr",
    icon: "users",
    permission: PERMISSIONS.SERVICE_HR_ACCESS,
    status: SERVICE_STATUS.ACTIVE,
    color: "amber",
    order: 20,
  },
  {
    id: "projects",
    name: "บริหารโครงการ",
    shortName: "Projects Management",
    description:
      "วางแผนและติดตามการผลิตรายการโทรทัศน์ งานถ่ายทำ และงาน Content",
    href: "/app/projects",
    icon: "projects",
    permission: PERMISSIONS.SERVICE_PROJECTS_ACCESS,
    status: SERVICE_STATUS.COMING_SOON,
    color: "violet",
    order: 30,
  },
  {
    id: "settings",
    name: "ตั้งค่าองค์กร",
    shortName: "Organization Settings",
    description:
      "จัดการผู้ใช้งาน สิทธิ์ ระบบ HR การเชื่อมต่อ และการตั้งค่าของบริษัท",
    href: "/app/settings",
    icon: "settings",
    permission: PERMISSIONS.ORGANIZATION_MANAGE,
    status: SERVICE_STATUS.ACTIVE,
    color: "slate",
    order: 40,
  },
]);

export function getAvailableServices(permissions = []) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return SERVICES.filter((service) =>
    permissions.includes(service.permission),
  ).sort((firstService, secondService) => {
    return firstService.order - secondService.order;
  });
}

export function isServiceActive(service) {
  return service.status === SERVICE_STATUS.ACTIVE;
}
