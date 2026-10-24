import { notFound, redirect } from "next/navigation";

import PortalShell from "@/components/layout/PortalShell";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requireCurrentSession } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function UserLayout({ children, params }) {
  const currentSession = await requireCurrentSession().catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.LOGIN);
  }

  const { userId } = await params;

  if (userId !== currentSession.identity.uid) {
    notFound();
  }

  if (
    !currentSession.access.permissions.includes(PERMISSIONS.SERVICE_MY_ACCESS)
  ) {
    redirect(ROUTES.HOME);
  }

  const { identity, access } = currentSession;

  const initialSession = {
    initialized: true,
    authenticated: true,
    user: identity,
    employee: null,
    organization: access.organization,
    role: access.membership.role,
    permissions: access.permissions,
  };

  return (
    <StoreProvider initialSession={initialSession}>
      <PortalShell session={initialSession}>{children}</PortalShell>
    </StoreProvider>
  );
}
