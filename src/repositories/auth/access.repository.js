import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";

export async function getPlatformUser(uid) {
  const userSnapshot = await adminFirestore.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return null;
  }

  return {
    id: userSnapshot.id,
    ...userSnapshot.data(),
  };
}

async function getPermissionGroups(organizationId, groupIds) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return [];
  }

  const uniqueGroupIds = [...new Set(groupIds)].filter(Boolean);

  if (uniqueGroupIds.length === 0) {
    return [];
  }

  const groupSnapshots = await Promise.all(
    uniqueGroupIds.map((groupId) =>
      adminFirestore
        .collection("organizations")
        .doc(organizationId)
        .collection("permissionGroups")
        .doc(groupId)
        .get(),
    ),
  );

  return groupSnapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => ({
      id: snapshot.id,
      ...snapshot.data(),
    }));
}

export async function getOrganizationAccess({ organizationId, uid }) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const membershipRef = organizationRef.collection("memberships").doc(uid);

  const [organizationSnapshot, membershipSnapshot] = await Promise.all([
    organizationRef.get(),
    membershipRef.get(),
  ]);

  const organization = organizationSnapshot.exists
    ? {
        id: organizationSnapshot.id,
        ...organizationSnapshot.data(),
      }
    : null;

  const membership = membershipSnapshot.exists
    ? {
        id: membershipSnapshot.id,
        ...membershipSnapshot.data(),
      }
    : null;

  const permissionGroups = membership
    ? await getPermissionGroups(organizationId, membership.groupIds)
    : [];

  return {
    organization,
    membership,
    permissionGroups,
  };
}

export async function recordSuccessfulLogin({
  organizationId,
  uid,
  email,
  role,
  providerId,
  ipAddress,
  userAgent,
}) {
  const userRef = adminFirestore.collection("users").doc(uid);

  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const membershipRef = organizationRef.collection("memberships").doc(uid);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  const batch = adminFirestore.batch();

  batch.update(userRef, {
    lastLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });

  batch.update(membershipRef, {
    lastAccessAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  });

  batch.set(auditLogRef, {
    organizationId,
    actor: {
      uid,
      email,
      role,
    },
    action: "USER_LOGIN",
    entityType: "USER",
    entityId: uid,
    source: "WEB",
    summary: "User signed in to SPJ Work.",
    before: null,
    after: {
      providerId,
      authenticated: true,
    },
    metadata: {
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
}
