import "server-only";

import { LINE_RICH_MENU_ACTIONS } from "@/constants/line-rich-menu";
import { getUserRoutes } from "@/constants/user-routes";
import { getEmployeeById } from "@/repositories/employee/employee.repository";

export async function resolveLineRichMenuDestination({ session, action }) {
  const config = LINE_RICH_MENU_ACTIONS[action];
  if (!config || !session.access.permissions.includes(config.permission)) return null;
  if (action === "services") return "/";

  const employeeId = session.access.membership.employeeId;
  if (!employeeId) return "/profile";
  const employee = await getEmployeeById({
    organizationId: session.access.organization.id, employeeId,
  });
  if (!employee || employee.isDeleted === true || employee.userId !== session.identity.uid || !employee.companyId) {
    return "/profile";
  }
  const routes = getUserRoutes(session.identity.uid);
  return {
    "leave-new": routes.LEAVE_NEW,
    leave: routes.LEAVE,
    profile: routes.PROFILE,
    notifications: routes.NOTIFICATIONS,
  }[action];
}
