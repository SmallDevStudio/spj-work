import { notFound } from "next/navigation";

import LeaveDevTestClient from "@/components/leave/LeaveDevTestClient";
import { requireCurrentSession } from "@/lib/auth/authorization";
import {
  assertLeaveDevTestAccess,
  readDevTestRun,
} from "@/services/leave/leave-dev-test.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leave Dev Test | SPJ Work" };

export default async function LeaveDevTestPage({ searchParams }) {
  const session = await requireCurrentSession();

  try {
    assertLeaveDevTestAccess(session);
  } catch {
    notFound();
  }

  const { runId } = await searchParams;
  const initialRun = runId ? await readDevTestRun(session, runId) : null;

  return <LeaveDevTestClient initialRun={initialRun} userId={session.identity.uid} />;
}
