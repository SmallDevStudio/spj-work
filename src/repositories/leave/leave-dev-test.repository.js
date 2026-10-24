import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";
import { serializeDevTestApproval } from "@/modules/leave/leave-dev-test-presentation";
import {
  decideDevLeaveScenario,
  devLeaveBalance,
} from "@/modules/leave/leave-dev-test";

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

function organizationRef(organizationId) {
  return adminFirestore.collection("organizations").doc(organizationId);
}

function publicRun(id, data) {
  return {
    id,
    startDate: data.startDate,
    endDate: data.endDate,
    dayPart: data.dayPart,
    countingBasis: data.countingBasis,
    countedDates: data.countedDates,
    excludedDates: data.excludedDates,
    requestedDays: data.requestedDays,
    coveredDays: data.coveredDays,
    excessDays: data.excessDays,
    status: data.status,
    isDeleted: data.isDeleted === true,
    approval: serializeDevTestApproval(data.approval),
    balance: devLeaveBalance(data),
  };
}

export async function createLeaveDevTestRun({ organizationId, uid, scenario }) {
  const root = organizationRef(organizationId);
  const ref = root.collection("leaveDevTestRuns").doc();
  const eventRef = root.collection("notificationOutbox").doc();
  const batch = adminFirestore.batch();

  batch.set(ref, {
    ...scenario,
    organizationId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.set(eventRef, {
    organizationId,
    type: "LEAVE_DEV_TEST_EVENT",
    testRunId: ref.id,
    recipientUid: uid,
    resultStatus: scenario.status,
    status: "PENDING",
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return publicRun(ref.id, scenario);
}

export async function getLeaveDevTestRun({ organizationId, uid, runId }) {
  const snapshot = await organizationRef(organizationId)
    .collection("leaveDevTestRuns").doc(runId).get();

  if (!snapshot.exists || snapshot.data().ownerUid !== uid || snapshot.data().isDevTest !== true) {
    fail("LEAVE_DEV_TEST_NOT_FOUND", "ไม่พบรายการทดสอบ", 404);
  }

  return publicRun(snapshot.id, snapshot.data());
}

export async function decideLeaveDevTestRun({
  organizationId, uid, runId, input,
}) {
  const root = organizationRef(organizationId);
  const ref = root.collection("leaveDevTestRuns").doc(runId);

  return adminFirestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const before = snapshot.data();

    if (!snapshot.exists || before.ownerUid !== uid || before.isDevTest !== true) {
      fail("LEAVE_DEV_TEST_NOT_FOUND", "ไม่พบรายการทดสอบ", 404);
    }

    if (before.isDeleted === true) {
      fail("LEAVE_DEV_TEST_DELETED", "รายการทดสอบนี้ถูกลบแล้ว");
    }

    let result;

    try {
      result = decideDevLeaveScenario({
        scenario: before,
        track: input.track,
        decision: input.decision,
        comment: input.comment,
        financialDisposition: input.financialDisposition ?? null,
        financialReason: input.financialReason ?? null,
        uid,
      });
    } catch (error) {
      if (error.code && error.status >= 400 && error.status < 500) {
        throw new ApplicationError({
          code: error.code, message: error.message, status: error.status,
        });
      }
      fail(error.code ?? "LEAVE_DEV_DECISION_INVALID", error.message);
    }

    const eventRef = root.collection("notificationOutbox").doc();

    transaction.update(ref, {
      status: result.status,
      approval: result.approval,
      revision: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(eventRef, {
      organizationId,
      type: "LEAVE_DEV_TEST_EVENT",
      testRunId: ref.id,
      recipientUid: uid,
      resultStatus: result.status,
      status: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
    });

    return publicRun(ref.id, { ...before, ...result });
  });
}

export async function deleteLeaveDevTestRun({ organizationId, uid, runId }) {
  const root = organizationRef(organizationId);
  const ref = root.collection("leaveDevTestRuns").doc(runId);

  return adminFirestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const before = snapshot.data();

    if (!snapshot.exists || before.ownerUid !== uid || before.isDevTest !== true) {
      fail("LEAVE_DEV_TEST_NOT_FOUND", "ไม่พบรายการทดสอบ", 404);
    }

    if (before.isDeleted === true) {
      fail("LEAVE_DEV_TEST_DELETED", "รายการทดสอบนี้ถูกลบแล้ว");
    }

    const eventRef = root.collection("notificationOutbox").doc();

    transaction.update(ref, {
      isDeleted: true,
      deletedAt: FieldValue.serverTimestamp(),
      revision: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(eventRef, {
      organizationId,
      type: "LEAVE_DEV_TEST_EVENT",
      testRunId: ref.id,
      recipientUid: uid,
      resultStatus: "DELETED",
      status: "PENDING",
      createdAt: FieldValue.serverTimestamp(),
    });

    return publicRun(ref.id, { ...before, isDeleted: true });
  });
}
