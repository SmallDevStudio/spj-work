import { notFound, redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { requireCurrentSession } from "@/lib/auth/authorization";

export default async function UserLayout({ children, params }) {
  const currentSession = await requireCurrentSession().catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.LOGIN);
  }

  const { userId } = await params;

  if (userId !== currentSession.identity.uid) {
    notFound();
  }

  return children;
}
