import Link from "next/link";

import ApprovalInboxClient from "@/components/leave/ApprovalInboxClient";
import { PERMISSIONS } from "@/constants/permissions";
import { getUserRoutes } from "@/constants/user-routes";
import { requireOwnEmployeePermission } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "งานอนุมัติใบลา | SPJ Work",
};

export default async function LeaveApprovalsPage({ params }) {
  const { userId } = await params;

  await requireOwnEmployeePermission({
    userId,
    permission: PERMISSIONS.LEAVE_APPROVE,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-7 sm:py-8">
      <Link
        href={getUserRoutes(userId).LEAVE}
        className="text-sm font-semibold text-sky-700 hover:underline"
      >
        ← กลับไปหน้าการลา
      </Link>

      <div className="mt-5">
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
          งานอนุมัติใบลา
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          แสดงเฉพาะใบลาที่กำลังรอการตัดสินใจจากคุณ
        </p>
      </div>

      <ApprovalInboxClient />
    </main>
  );
}
