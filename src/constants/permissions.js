export const PERMISSIONS = Object.freeze({
  PORTAL_ACCESS: "portal.access",

  SERVICE_MY_ACCESS: "service.my.access",
  SERVICE_HR_ACCESS: "service.hr.access",
  SERVICE_IT_ACCESS: "service.it.access",
  SERVICE_PROJECTS_ACCESS: "service.projects.access",

  DASHBOARD_READ: "dashboard.read",

  EMPLOYEE_READ_OWN: "employee.read.own",
  EMPLOYEE_UPDATE_OWN: "employee.update.own",
  EMPLOYEE_READ_TEAM: "employee.read.team",
  EMPLOYEE_READ_ALL: "employee.read.all",

  // Legacy permission สำหรับข้อมูลเดิม
  EMPLOYEE_READ: "employee.read",

  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",
  EMPLOYEE_EXPORT: "employee.export",

  EMPLOYEE_PIN_CREATE: "employee.pin.create",
  EMPLOYEE_PIN_READ: "employee.pin.read",
  EMPLOYEE_PIN_UPDATE: "employee.pin.update",

  DEPARTMENT_READ: "department.read",
  DEPARTMENT_MANAGE: "department.manage",

  ONBOARDING_CREATE: "onboarding.create",
  ONBOARDING_READ_ALL: "onboarding.read.all",
  ONBOARDING_HR_MANAGE: "onboarding.hr.manage",
  ONBOARDING_IT_PROCESS: "onboarding.it.process",
  ONBOARDING_COMPLETE: "onboarding.complete",

  ASSET_READ: "asset.read",
  ASSET_CREATE: "asset.create",
  ASSET_UPDATE: "asset.update",
  ASSET_ASSIGN: "asset.assign",
  ASSET_RETURN: "asset.return",
  ASSET_MANAGE: "asset.manage",

  NOTIFICATION_READ: "notification.read",
  NOTIFICATION_MANAGE: "notification.manage",

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

  HR_SETTINGS_READ: "hr.settings.read",
  HR_SETTINGS_MANAGE: "hr.settings.manage",

  WORKSPACE_SYNC_READ: "workspace.sync.read",
  WORKSPACE_SYNC_PREVIEW: "workspace.sync.preview",
  WORKSPACE_SYNC_EXECUTE: "workspace.sync.execute",
  WORKSPACE_SYNC_CONFIGURE: "workspace.sync.configure",

  AUDIT_READ: "audit.read",

  TRASH_READ: "trash.read",
  TRASH_RESTORE: "trash.restore",
  TRASH_DELETE_PERMANENTLY: "trash.delete.permanently",

  ORGANIZATION_READ: "organization.read",
  ORGANIZATION_MANAGE: "organization.manage",

  SYSTEM_MANAGE: "system.manage",
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));
