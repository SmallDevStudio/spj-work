import "server-only";

import { z } from "zod";

import { serverEnv } from "@/config/env.server";
import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { createDevLeaveScenario } from "@/modules/leave/leave-dev-test";
import {
  createLeaveDevTestRun,
  decideLeaveDevTestRun,
  deleteLeaveDevTestRun,
  getLeaveDevTestRun,
} from "@/repositories/leave/leave-dev-test.repository";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const runSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  dayPart: z.enum(["FULL_DAY", "MORNING", "AFTERNOON"]),
  countingBasis: z.enum(["WORKING_DAYS", "CALENDAR_DAYS"]),
  workingWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  holidays: z.array(dateSchema).max(50),
  entitlementDays: z.number().min(0).max(366).multipleOf(0.5),
  alreadyUsedDays: z.number().min(0).max(366).multipleOf(0.5),
}).strict();

const decisionSchema = z.object({
  track: z.enum(["MANAGER", "HR"]),
  decision: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().trim().min(1).max(2000),
  financialDisposition: z.enum(["DEDUCT_PAY", "PAID_EXCEPTION"]).nullable().optional(),
  financialReason: z.string().trim().max(2000).nullable().optional(),
}).strict();

export function assertLeaveDevTestAccess(session) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LEAVE_DEV_TEST_ENABLED !== "true" ||
    !/(?:-dev|-test)$/.test(serverEnv.firebaseAdminProjectId)
  ) {
    throw new ApplicationError({
      code: "LEAVE_DEV_TEST_DISABLED",
      message: "ไม่พบหน้าทดสอบระบบลา",
      status: 404,
    });
  }

  if (session.access.membership.role !== ROLES.SUPERADMIN) {
    throw new ApplicationError({
      code: "LEAVE_DEV_TEST_DENIED",
      message: "เฉพาะ SUPERADMIN ที่ใช้ Dev Test ได้",
      status: 403,
    });
  }
}

function scope(session) {
  assertLeaveDevTestAccess(session);

  return {
    organizationId: session.access.organization.id,
    uid: session.identity.uid,
  };
}

function validRunId(runId) {
  if (
    typeof runId !== "string" ||
    !runId ||
    runId.length > 128 ||
    runId.includes("/")
  ) {
    throw new ApplicationError({
      code: "LEAVE_DEV_RUN_ID_INVALID",
      message: "รหัสรายการทดสอบไม่ถูกต้อง",
      status: 400,
    });
  }
}

export function readDevTestRun(session, runId) {
  validRunId(runId);
  return getLeaveDevTestRun({ ...scope(session), runId });
}

export function startDevTestRun(session, input) {
  const context = scope(session);
  const parsed = runSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "LEAVE_DEV_INPUT_INVALID",
      message: "ข้อมูลจำลองใบลาไม่ถูกต้อง",
      status: 400,
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."), message: issue.message,
      })),
    });
  }

  let scenario;

  try {
    scenario = createDevLeaveScenario(parsed.data, context.uid);
  } catch (error) {
    throw new ApplicationError({
      code: error.code ?? "LEAVE_DEV_SCENARIO_INVALID",
      message: error.message,
      status: 400,
    });
  }

  return createLeaveDevTestRun({ ...context, scenario });
}

export function makeDevTestDecision(session, runId, input) {
  validRunId(runId);
  const context = scope(session);
  const parsed = decisionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ApplicationError({
      code: "LEAVE_DEV_DECISION_INVALID",
      message: "ข้อมูลอนุมัติทดสอบไม่ถูกต้อง",
      status: 400,
    });
  }

  return decideLeaveDevTestRun({ ...context, runId, input: parsed.data });
}

export function removeDevTestRun(session, runId) {
  validRunId(runId);
  return deleteLeaveDevTestRun({ ...scope(session), runId });
}
