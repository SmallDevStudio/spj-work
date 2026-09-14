export const PERMISSIONS = Object.freeze({
  DASHBOARD_READ: "dashboard.read",

  EMPLOYEE_READ: "employee.read",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",
  EMPLOYEE_EXPORT: "employee.export",

  DEPARTMENT_READ: "department.read",
  DEPARTMENT_MANAGE: "department.manage",

  LEAVE_READ_OWN: "leave.read.own",
  LEAVE_READ_TEAM: "leave.read.team",
  LEAVE_READ_ALL: "leave.read.all",
  LEAVE_REQUEST: "leave.request",
  LEAVE_CANCEL_OWN: "leave.cancel.own",
  LEAVE_APPROVE: "leave.approve",
  LEAVE_MANAGE: "leave.manage",
  LEAVE_POLICY_MANAGE: "leave.policy.manage",
  LEAVE_BALANCE_MANAGE: "leave.balance.manage",
  LEAVE_WORKFLOW_MANAGE: "leave.workflow.manage",
  LEAVE_REPORT_READ: "leave.report.read",
  LEAVE_REPORT_EXPORT: "leave.report.export",

  CALENDAR_READ_OWN: "calendar.read.own",
  CALENDAR_READ_TEAM: "calendar.read.team",
  CALENDAR_READ_ALL: "calendar.read.all",
  HOLIDAY_MANAGE: "holiday.manage",

  ANNOUNCEMENT_READ: "announcement.read",
  ANNOUNCEMENT_CREATE: "announcement.create",
  ANNOUNCEMENT_UPDATE: "announcement.update",
  ANNOUNCEMENT_PUBLISH: "announcement.publish",
  ANNOUNCEMENT_DELETE: "announcement.delete",

  USER_READ: "user.read",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  PERMISSION_MANAGE: "permission.manage",

  AUDIT_READ: "audit.read",
  TRASH_READ: "trash.read",
  TRASH_RESTORE: "trash.restore",
  TRASH_DELETE_PERMANENTLY: "trash.delete.permanently",

  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_MANAGE: "organization.manage",
  SYSTEM_MANAGE: "system.manage",
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
