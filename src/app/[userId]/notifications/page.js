import LeaveNotificationsClient from "@/components/leave/LeaveNotificationsClient";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การแจ้งเตือน | SPJ Work",
};

export default async function NotificationsPage({ params }) {
  const { userId } = await params;
  const session = await requireCurrentSession();

  if (session.identity.uid !== userId) {
    notFound();
  }

  return <LeaveNotificationsClient userId={userId} />;
}
