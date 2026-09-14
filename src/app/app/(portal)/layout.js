import { redirect } from "next/navigation";

import PortalShell from "@/components/layout/PortalShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function PortalLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.PORTAL_ACCESS,
  ).catch(() => null);

  if (!currentSession) {
    redirect("/login");
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
