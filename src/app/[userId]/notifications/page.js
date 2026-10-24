import NotificationsClient from "@/components/notifications/NotificationsClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "การแจ้งเตือน | SPJ Work",
};

export default async function NotificationsPage({ params }) {
  const { userId } = await params;
  const session = await requirePermission(PERMISSIONS.NOTIFICATION_READ);

  if (session.identity.uid !== userId) {
    notFound();
  }

  return <NotificationsClient userId={userId} />;
}
