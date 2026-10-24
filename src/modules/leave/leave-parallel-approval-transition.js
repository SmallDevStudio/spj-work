const FINANCIAL_DISPOSITIONS = new Set([
  "DEDUCT_PAY",
  "PAID_EXCEPTION",
  "USE_OTHER_ENTITLEMENT",
]);

function fail(code, message, status = 409, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  throw error;
}

export function decideParallelLeaveApproval({
  request,
  actorEmployeeId,
  actorUid,
  decision,
  comment,
  financialDisposition = null,
  financialReason = null,
  decidedAt,
}) {
  if (request?.status !== "PENDING_APPROVAL") {
    fail(
      "LEAVE_REQUEST_ALREADY_DECIDED",
      "ใบลานี้ไม่ได้รออนุมัติแล้ว กรุณาโหลดข้อมูลใหม่",
      409,
      { status: request?.status ?? null },
    );
  }

  if (
    request.approval?.mode !== "PARALLEL_ALL" ||
    !Array.isArray(request.approval.steps) ||
    request.approval.steps.length !== 2
  ) {
    fail("LEAVE_APPROVAL_INVALID", "ข้อมูลการอนุมัติสองฝ่ายไม่สมบูรณ์");
  }

  if (!actorEmployeeId || !actorUid) {
    fail("LEAVE_APPROVER_REQUIRED", "ไม่พบข้อมูลผู้อนุมัติ", 403);
  }

  if (request.employeeId === actorEmployeeId) {
    fail("LEAVE_SELF_APPROVAL_DENIED", "ไม่สามารถอนุมัติใบลาของตนเองได้", 403);
  }

  if (!["APPROVE", "REJECT"].includes(decision)) {
    fail("LEAVE_DECISION_INVALID", "ผลการอนุมัติไม่ถูกต้อง", 400);
  }

  const message = typeof comment === "string" ? comment.trim() : "";

  if (!message || message.length > 2000) {
    fail(
      "LEAVE_APPROVAL_COMMENT_REQUIRED",
      "กรุณากรอกความคิดเห็นไม่เกิน 2000 ตัวอักษร",
      400,
    );
  }

  if (!(decidedAt instanceof Date) || Number.isNaN(decidedAt.getTime())) {
    fail("LEAVE_DECISION_DATE_INVALID", "เวลาตัดสินใจไม่ถูกต้อง", 400);
  }

  const steps = request.approval.steps.map((step) => ({ ...step }));

  const pendingMatches = steps.filter(
    (step) =>
      step.status === "PENDING" &&
      step.approverEmployeeIds?.includes(actorEmployeeId),
  );

  if (pendingMatches.length === 0) {
    const previous = steps.find((step) =>
      step.approverEmployeeIds?.includes(actorEmployeeId),
    );

    if (previous) {
      fail(
        "LEAVE_APPROVAL_ALREADY_HANDLED",
        "งานอนุมัติของคุณมีการดำเนินการแล้ว กรุณาโหลดข้อมูลใหม่",
        409,
        {
          status: previous.status,
          decidedByEmployeeId: previous.decidedByEmployeeId ?? null,
        },
      );
    }

    fail(
      "LEAVE_APPROVER_NOT_ASSIGNED",
      "คุณไม่ได้รับมอบหมายให้อนุมัติใบลานี้",
      403,
    );
  }

  // หากบุคคลเดียวอยู่ในรายชื่อทั้งสองฝ่าย ต้องระบุว่าจะตัดสินใจ
  // ในนามฝ่ายใดผ่านขั้นตอนมอบหมายงานก่อน ห้ามกดครั้งเดียวผ่านสองฝ่าย
  if (pendingMatches.length > 1) {
    fail(
      "LEAVE_APPROVER_ROLE_AMBIGUOUS",
      "คุณอยู่ในรายชื่อผู้อนุมัติทั้งสองฝ่าย กรุณาให้ HR ปรับผู้รับงาน",
    );
  }

  const step = pendingMatches[0];

  const alreadyApprovedAnotherTrack = steps.some(
    (otherStep) =>
      otherStep.key !== step.key &&
      otherStep.status === "APPROVED" &&
      otherStep.decidedByEmployeeId === actorEmployeeId,
  );

  if (alreadyApprovedAnotherTrack) {
    fail(
      "LEAVE_DISTINCT_APPROVERS_REQUIRED",
      "ใบลาเกินสิทธิ์ต้องได้รับอนุมัติจากคนละบุคคลในสองฝ่าย",
      403,
    );
  }

  if (step.key === "HR" && decision === "APPROVE") {
    if (!FINANCIAL_DISPOSITIONS.has(financialDisposition)) {
      fail(
        "LEAVE_HR_DISPOSITION_REQUIRED",
        "HR ต้องเลือกวิธีจัดการวันลาที่เกินสิทธิ์",
        400,
      );
    }

    if (
      typeof financialReason !== "string" ||
      !financialReason.trim() ||
      financialReason.trim().length > 2000
    ) {
      fail(
        "LEAVE_HR_REASON_REQUIRED",
        "HR ต้องระบุเหตุผลประกอบไม่เกิน 2000 ตัวอักษร",
        400,
      );
    }
  }

  const event = {
    decision,
    track: step.key,
    actorEmployeeId,
    actorUid,
    comment: message,
    decidedAt,
  };

  step.status = decision === "REJECT" ? "REJECTED" : "APPROVED";
  step.decidedByEmployeeId = actorEmployeeId;
  step.decidedAt = decidedAt;
  step.comment = message;

  if (step.key === "HR" && decision === "APPROVE") {
    step.financialDisposition = financialDisposition;
    step.financialReason = financialReason.trim();
  }

  if (decision === "REJECT") {
    for (const otherStep of steps) {
      if (otherStep.status === "PENDING") {
        otherStep.status = "CLOSED_BY_REJECTION";
      }
    }
  }

  const status =
    decision === "REJECT"
      ? "REJECTED"
      : steps.every((item) => item.status === "APPROVED")
        ? "APPROVED"
        : "PENDING_APPROVAL";

  return {
    status,
    approval: {
      ...request.approval,
      steps,
      lastDecision: event,
    },
    event,
  };
}
