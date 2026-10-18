export const LEAVE_DECISION = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
});

function conflict(code, message, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = 409;
  error.details = details;
  return error;
}

export function decideLeaveApproval({
  request,
  actorEmployeeId,
  actorUid,
  decision,
  comment,
  decidedAt,
}) {
  if (!request || typeof request !== "object") {
    throw new Error("ไม่พบใบลา");
  }

  if (!actorEmployeeId || !actorUid) {
    throw new Error("ไม่พบผู้อนุมัติ");
  }

  if (!Object.values(LEAVE_DECISION).includes(decision)) {
    throw new Error("ผลการอนุมัติไม่ถูกต้อง");
  }

  const normalizedComment = typeof comment === "string" ? comment.trim() : "";

  if (!normalizedComment || normalizedComment.length > 2000) {
    throw new Error("กรุณากรอกความคิดเห็นไม่เกิน 2000 ตัวอักษร");
  }

  if (!(decidedAt instanceof Date) || Number.isNaN(decidedAt.valueOf())) {
    throw new Error("วันที่อนุมัติไม่ถูกต้อง");
  }

  if (request.status !== "PENDING_APPROVAL") {
    throw conflict(
      "LEAVE_REQUEST_ALREADY_DECIDED",
      "ใบลานี้มีผลการอนุมัติแล้ว",
      {
        status: request.status,
        lastDecision: request.approval?.lastDecision ?? null,
      },
    );
  }

  const approval = request.approval;
  const index = approval?.currentStepIndex;

  if (!Array.isArray(approval?.steps) || !Number.isInteger(index)) {
    throw new Error("ข้อมูลขั้นตอนอนุมัติไม่สมบูรณ์");
  }

  if (index < 0 || index >= approval.steps.length) {
    throw new Error("ลำดับขั้นตอนอนุมัติไม่ถูกต้อง");
  }

  const current = approval.steps[index];

  if (current?.status !== "PENDING") {
    throw conflict(
      "LEAVE_APPROVAL_STEP_ALREADY_DECIDED",
      "ขั้นตอนนี้มีผู้ดำเนินการแล้ว",
      {
        step: index + 1,
        decidedByEmployeeId: current?.decidedByEmployeeId ?? null,
      },
    );
  }

  if (!current.approverEmployeeIds?.includes(actorEmployeeId)) {
    const completedStep = approval.steps
      .slice(0, index)
      .find((step) => step.approverEmployeeIds?.includes(actorEmployeeId));

    if (completedStep) {
      throw conflict(
        "LEAVE_APPROVAL_STEP_ALREADY_DECIDED",
        "ขั้นตอนของคุณมีผู้อนุมัติแล้ว",
        {
          step: completedStep.order,

          decidedByEmployeeId: completedStep.decidedByEmployeeId ?? null,

          decidedAt: completedStep.decidedAt ?? null,
        },
      );
    }

    const error = new Error("คุณไม่ได้รับมอบหมายให้อนุมัติขั้นตอนนี้");

    error.code = "LEAVE_APPROVER_NOT_ASSIGNED";
    error.status = 403;

    throw error;
  }

  if (request.employeeId === actorEmployeeId) {
    const error = new Error("ไม่สามารถอนุมัติใบลาของตนเองได้");

    error.code = "LEAVE_SELF_APPROVAL_DENIED";
    error.status = 403;

    throw error;
  }

  const event = {
    decision,
    step: index + 1,
    actorEmployeeId,
    actorUid,
    comment: normalizedComment,
    decidedAt,
  };

  const steps = approval.steps.map((step) => ({
    ...step,

    approvals: Array.isArray(step.approvals) ? [...step.approvals] : [],
  }));

  const step = steps[index];

  if (decision === LEAVE_DECISION.REJECT) {
    step.status = "REJECTED";
    step.decidedByEmployeeId = actorEmployeeId;
    step.decidedAt = decidedAt;
    step.comment = normalizedComment;

    return {
      status: "REJECTED",

      approval: {
        ...approval,
        steps,
        lastDecision: event,
      },

      event,
    };
  }

  if (!["ANY_ONE", "ALL"].includes(step.approvalMode)) {
    throw new Error("โหมดอนุมัติไม่ถูกต้อง");
  }

  if (
    step.approvals.some((entry) => entry.actorEmployeeId === actorEmployeeId)
  ) {
    throw conflict("LEAVE_APPROVER_ALREADY_ACTED", "คุณอนุมัติขั้นตอนนี้แล้ว", {
      step: index + 1,
    });
  }

  step.approvals.push(event);

  const stepComplete =
    step.approvalMode === "ANY_ONE" ||
    step.approverEmployeeIds.every((id) =>
      step.approvals.some((entry) => entry.actorEmployeeId === id),
    );

  if (stepComplete) {
    step.status = "APPROVED";
    step.decidedByEmployeeId = actorEmployeeId;
    step.decidedAt = decidedAt;
    step.comment = normalizedComment;
  }

  const nextIndex = stepComplete ? index + 1 : index;

  const finished = nextIndex >= steps.length;

  return {
    status: finished ? "APPROVED" : "PENDING_APPROVAL",

    approval: {
      ...approval,
      steps,

      currentStepIndex: finished ? index : nextIndex,

      lastDecision: event,
    },

    event,
  };
}
