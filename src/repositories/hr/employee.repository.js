import "server-only";

import { adminFirestore } from "@/lib/firebase/admin";

function getOrganizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function mapEmployeeDocument(snapshot) {
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data();

  const { encryptedEmployeePin, employeePinHash, ...safeEmployeeData } = data;

  return {
    id: snapshot.id,
    ...safeEmployeeData,
    hasEmployeePin: Boolean(encryptedEmployeePin) && Boolean(employeePinHash),
  };
}

export async function getEmployeeById({ organizationId, employeeId }) {
  const employeeSnapshot = await getOrganizationRef(organizationId)
    .collection("employees")
    .doc(employeeId)
    .get();

  return mapEmployeeDocument(employeeSnapshot);
}

export async function listEmployees({ organizationId, limit = 100 }) {
  const employeeSnapshots = await getOrganizationRef(organizationId)
    .collection("employees")
    .where("isDeleted", "==", false)
    .limit(limit)
    .get();

  return employeeSnapshots.docs.map(mapEmployeeDocument);
}
