import "server-only";

import { ALL_PERMISSIONS } from "@/constants/permissions";
import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { getCurrentApplicationSession } from "@/lib/auth/current-session";

export async function requireCurrentSession() {
  return getCurrentApplicationSession();
}

export async function requirePermission(requiredPermission) {
  if (!ALL_PERMISSIONS.includes(requiredPermission)) {
    throw new Error(`Unknown permission: ${requiredPermission}`);
  }

  const currentSession = await requireCurrentSession();

  if (!currentSession.access.permissions.includes(requiredPermission)) {
    throw new AuthSessionError({
      code: "AUTH_PERMISSION_DENIED",
      message: "You do not have permission to perform this action.",
      status: 403,
    });
  }

  return currentSession;
}

export async function requireAnyPermission(requiredPermissions) {
  const validPermissions = requiredPermissions.filter((permission) =>
    ALL_PERMISSIONS.includes(permission),
  );

  if (validPermissions.length !== requiredPermissions.length) {
    throw new Error("One or more required permissions are invalid.");
  }

  const currentSession = await requireCurrentSession();

  const hasPermission = validPermissions.some((permission) =>
    currentSession.access.permissions.includes(permission),
  );

  if (!hasPermission) {
    throw new AuthSessionError({
      code: "AUTH_PERMISSION_DENIED",
      message: "You do not have permission to perform this action.",
      status: 403,
    });
  }

  return currentSession;
}

export async function requireAllPermissions(requiredPermissions) {
  const validPermissions = requiredPermissions.filter((permission) =>
    ALL_PERMISSIONS.includes(permission),
  );

  if (validPermissions.length !== requiredPermissions.length) {
    throw new Error("One or more required permissions are invalid.");
  }

  const currentSession = await requireCurrentSession();

  const hasEveryPermission = validPermissions.every((permission) =>
    currentSession.access.permissions.includes(permission),
  );

  if (!hasEveryPermission) {
    throw new AuthSessionError({
      code: "AUTH_PERMISSION_DENIED",
      message: "You do not have permission to perform this action.",
      status: 403,
    });
  }

  return currentSession;
}

export async function requireOwnEmployeePermission({ userId, permission }) {
  const currentSession = await requirePermission(permission);

  if (currentSession.identity.uid !== userId) {
    throw new AuthSessionError({
      code: "AUTH_USER_SCOPE_DENIED",
      message: "You cannot access another user's service.",
      status: 403,
    });
  }

  if (!currentSession.access.membership.employeeId) {
    throw new AuthSessionError({
      code: "AUTH_EMPLOYEE_NOT_LINKED",
      message: "This account is not linked to an employee.",
      status: 403,
    });
  }

  return currentSession;
}
