import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";

export const SERVICE_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  PREPARING: "PREPARING",
  COMING_SOON: "COMING_SOON",
});

export const SERVICES = Object.freeze([
  {
    id: "my-services",
    name: "My Portal",
    shortName: "My Portal",
    description: "ข้อมูลของฉัน วันลา งานที่ต้องดำเนินการ และบริการส่วนตัว",
    href: ROUTES.HOME,
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
    description: "จัดการข้อมูลพนักงาน แผนก การลา และงาน HR",
    href: ROUTES.MANAGE_HR,
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
    description: "วางแผนและติดตามงานผลิตรายการและคอนเทนต์",
    href: "/projects",
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
    description: "จัดการสิทธิ์และการตั้งค่าของบริษัท",
    href: ROUTES.MANAGE_SETTINGS,
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
  ).sort(
    (firstService, secondService) => firstService.order - secondService.order,
  );
}

export function isServiceActive(service) {
  return service.status === SERVICE_STATUS.ACTIVE;
}
