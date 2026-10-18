import "server-only";

import { adminFirestore } from "@/lib/firebase/admin";

export async function getLeaveOpeningBalancePreviewRecords({
  organizationId,
  companyId,
  employeeId,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef.collection("companies").doc(companyId);
  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const [companySnapshot, employeeSnapshot, ledgerSnapshot] = await Promise.all(
    [
      companyRef.get(),
      employeeRef.get(),
      employeeRef.collection("leaveLedgerEntries").limit(501).get(),
    ],
  );

  return {
    company: companySnapshot.exists ? companySnapshot.data() : null,
    employee: employeeSnapshot.exists ? employeeSnapshot.data() : null,
    ledgerTruncated: ledgerSnapshot.size > 500,
    openingEntries: ledgerSnapshot.docs
      .filter((doc) => doc.data().eventType === "OPENING_BALANCE")
      .map((doc) => ({ id: doc.id, ...doc.data() })),
  };
}
