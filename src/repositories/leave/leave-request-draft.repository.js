import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message, status) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  throw error;
}

export async function createLeaveRequestDraft({ organizationId, actor, data }) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const employeeRef = organizationRef
    .collection("employees")
    .doc(actor.employeeId);

  const membershipRef = organizationRef
    .collection("memberships")
    .doc(actor.uid);

  const draftRef = organizationRef.collection("leaveRequests").doc();

  const auditRef = organizationRef.collection("auditLogs").doc();

  await adminFirestore.runTransaction(async (transaction) => {
    const [employeeSnapshot, membershipSnapshot] = await Promise.all([
      transaction.get(employeeRef),
      transaction.get(membershipRef),
    ]);

    const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;

    const membership = membershipSnapshot.exists
      ? membershipSnapshot.data()
      : null;

    if (
      !employee ||
      employee.isDeleted === true ||
      employee.employmentStatus !== "ACTIVE" ||
      employee.accessStatus !== "ACTIVE" ||
      employee.userId !== actor.uid ||
      !employee.companyId ||
      !membership ||
      membership.status !== "ACTIVE" ||
      membership.employeeId !== actor.employeeId
    ) {
      fail(
        "LEAVE_REQUEST_EMPLOYEE_INVALID",
        "บัญชีพนักงานยังไม่พร้อมยื่นใบลา",
        403,
      );
    }

    transaction.set(draftRef, {
      organizationId,
      companyId: employee.companyId,

      employeeId: employeeRef.id,

      employeeCode: employee.employeeCode,

      userId: actor.uid,

      leaveTypeCode: data.leaveTypeCode,

      startDate: data.startDate,

      endDate: data.endDate,

      dayPart: data.dayPart,

      reason: data.reason,

      status: "DRAFT",
      approval: null,

      requestedDays: null,

      leaveTypeVersionId: null,
      submittedAt: null,

      revision: 1,
      isDeleted: false,

      createdAt: FieldValue.serverTimestamp(),

      createdBy: actor.uid,

      updatedAt: FieldValue.serverTimestamp(),

      updatedBy: actor.uid,
    });

    transaction.set(auditRef, {
      organizationId,

      actor: {
        uid: actor.uid,
        email: actor.email,
        role: actor.role,
      },

      action: "LEAVE_DRAFT_CREATE",

      entityType: "LEAVE_REQUEST",

      entityId: draftRef.id,

      source: "WEB",

      summary: `Created leave draft for employee ${employee.employeeCode}.`,

      before: null,

      after: {
        status: "DRAFT",

        companyId: employee.companyId,

        leaveTypeCode: data.leaveTypeCode,

        startDate: data.startDate,

        endDate: data.endDate,

        dayPart: data.dayPart,
      },

      metadata: null,

      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    id: draftRef.id,
    status: "DRAFT",
  };
}
