// Stable HTTPS destinations for LINE OA Rich Menu; use these links, never a UID in the menu URL.
import { PERMISSIONS } from "@/constants/permissions";

export const LINE_RICH_MENU_ACTIONS = Object.freeze({
  "leave-new": { label: "เขียนใบลา", permission: PERMISSIONS.LEAVE_REQUEST },
  leave: { label: "การลาของฉัน", permission: PERMISSIONS.LEAVE_READ_OWN },
  services: { label: "บริการ", permission: PERMISSIONS.PORTAL_ACCESS },
  profile: { label: "ข้อมูลของฉัน", permission: PERMISSIONS.EMPLOYEE_READ_OWN },
  notifications: { label: "การแจ้งเตือน", permission: PERMISSIONS.NOTIFICATION_READ },
});
