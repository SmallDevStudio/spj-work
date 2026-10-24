import "server-only";

import { ALL_PERMISSIONS, PERMISSIONS } from "@/constants/permissions";
import { getRolePermissions, isValidRole, ROLES } from "@/constants/roles";
import { AuthSessionError } from "@/lib/auth/auth-session-error";
import {
  getOrganizationAccess,
  getPlatformUser,
} from "@/repositories/auth/access.repository";
import { resolveCompanyAccess } from "@/lib/auth/company-access";
import { listActiveLeaveHrDelegations } from "@/repositories/access/leave-approval-delegation.repository";

const ACTIVE_STATUS = "ACTIVE";
const PASSWORD_PROVIDER_ID = "password";

function requireActiveRecord({
  record,
  notFoundCode,
  inactiveCode,
  entityName,
}) {
  if (!record || record.isDeleted === true) {
    throw new AuthSessionError({
      code: notFoundCode,
      message: `${entityName} access was not found.`,
      status: 403,
    });
  }

  if (record.status !== ACTIVE_STATUS) {
    throw new AuthSessionError({
      code: inactiveCode,
      message: `${entityName} access is not active.`,
      status: 403,
    });
  }
}

function normalizePermissionList(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return permissions.filter((permission) =>
    ALL_PERMISSIONS.includes(permission),
  );
}

function calculateEffectivePermissions({ role, membership, permissionGroups }) {
  if (role === ROLES.SUPERADMIN) {
    return [...ALL_PERMISSIONS];
  }

  const rolePermissions = getRolePermissions(role);

  const directPermissions = normalizePermissionList(membership.permissions);

  const groupPermissions = permissionGroups.flatMap((group) => {
    if (group.status !== ACTIVE_STATUS || group.isDeleted === true) {
      return [];
    }

    return normalizePermissionList(group.permissions);
  });

  const deniedPermissions = new Set(
    normalizePermissionList(membership.deniedPermissions),
  );

  return [
    ...new Set([...rolePermissions, ...groupPermissions, ...directPermissions]),
  ]
    .filter((permission) => !deniedPermissions.has(permission))
    .sort();
}

function requireAllowedProvider(platformUser, providerId) {
  const allowedProviders = Array.isArray(platformUser.authProviders)
    ? platformUser.authProviders
    : [];

  if (!allowedProviders.includes(providerId)) {
    throw new AuthSessionError({
      code: "AUTH_PROVIDER_NOT_ASSIGNED",
      message: "This authentication method is not assigned to the user.",
      status: 403,
    });
  }
}

function requireEmergencyAccess({ providerId, membership }) {
  if (providerId !== PASSWORD_PROVIDER_ID) {
    return;
  }

  if (
    membership.role !== ROLES.SUPERADMIN ||
    membership.emergencyAccess?.enabled !== true
  ) {
    throw new AuthSessionError({
      code: "AUTH_EMERGENCY_ACCESS_DENIED",
      message: "Emergency administrator access is not enabled.",
      status: 403,
    });
  }
}

export async function resolveUserAccess(identity) {
  const platformUser = await getPlatformUser(identity.uid);

  requireActiveRecord({
    record: platformUser,
    notFoundCode: "AUTH_USER_NOT_FOUND",
    inactiveCode: "AUTH_USER_INACTIVE",
    entityName: "User",
  });

  requireAllowedProvider(platformUser, identity.providerId);

  const organizationId = platformUser.defaultOrganizationId;

  if (!organizationId) {
    throw new AuthSessionError({
      code: "AUTH_ORGANIZATION_NOT_ASSIGNED",
      message: "The user is not assigned to an organization.",
      status: 403,
    });
  }

  const { organization, membership, permissionGroups } =
    await getOrganizationAccess({
      organizationId,
      uid: identity.uid,
    });

  requireActiveRecord({
    record: organization,
    notFoundCode: "AUTH_ORGANIZATION_NOT_FOUND",
    inactiveCode: "AUTH_ORGANIZATION_INACTIVE",
    entityName: "Organization",
  });

  requireActiveRecord({
    record: membership,
    notFoundCode: "AUTH_MEMBERSHIP_NOT_FOUND",
    inactiveCode: "AUTH_MEMBERSHIP_INACTIVE",
    entityName: "Membership",
  });

  if (!isValidRole(membership.role)) {
    throw new AuthSessionError({
      code: "AUTH_ROLE_INVALID",
      message: "The assigned user role is invalid.",
      status: 403,
    });
  }

  requireEmergencyAccess({
    providerId: identity.providerId,
    membership,
  });

  const companyAccess = resolveCompanyAccess({
    role: membership.role,
    companyAccess: membership.companyAccess,
  });

  const effectivePermissions = calculateEffectivePermissions({
    role: membership.role,
    membership,
    permissionGroups,
  });

  if (
    membership.employeeId &&
    !effectivePermissions.includes(PERMISSIONS.LEAVE_APPROVE) &&
    !normalizePermissionList(membership.deniedPermissions).includes(
      PERMISSIONS.LEAVE_APPROVE,
    )
  ) {
    const activeDelegations = await listActiveLeaveHrDelegations({
      organizationId,
      employeeId: membership.employeeId,
    });

    if (activeDelegations.length > 0) {
      effectivePermissions.push(PERMISSIONS.LEAVE_APPROVE);
      effectivePermissions.sort();
    }
  }

  return {
    organization: {
      id: organization.id,
      name: organization.name,
      code: organization.code,
      timezone: organization.timezone,
      defaultLocale: organization.defaultLocale,
    },
    membership: {
      userId: identity.uid,
      employeeId: membership.employeeId ?? null,
      role: membership.role,
      status: membership.status,
      groupIds: membership.groupIds ?? [],
      companyAccess,
    },
    permissions: effectivePermissions,
  };
}
