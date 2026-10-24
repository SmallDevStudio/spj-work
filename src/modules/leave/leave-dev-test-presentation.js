function isoDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

export function serializeDevTestApproval(approval) {
  return {
    mode: approval.mode ?? "SEQUENTIAL",
    source: approval.source,
    currentStepIndex: approval.currentStepIndex ?? null,
    lastDecision: approval.lastDecision
      ? {
          ...approval.lastDecision,
          decidedAt: isoDate(approval.lastDecision.decidedAt),
        }
      : null,
    steps: approval.steps.map((step) => ({
      ...step,
      decidedAt: isoDate(step.decidedAt),
      approvals: step.approvals?.map((event) => ({
        ...event,
        decidedAt: isoDate(event.decidedAt),
      })) ?? [],
    })),
  };
}
