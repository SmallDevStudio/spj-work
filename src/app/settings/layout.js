import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requirePermission } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function SettingsLayout({ children }) {
  const session = await requirePermission(
    PERMISSIONS.ORGANIZATION_MANAGE,
  ).catch(() => null);

  if (!session) redirect(ROUTES.HOME);

  const initialSession = {
    initialized: true,
    authenticated: true,
    user: session.identity,
    employee: null,
    organization: session.access.organization,
    role: session.access.membership.role,
    permissions: session.access.permissions,
  };

  return (
    <StoreProvider initialSession={initialSession}>
      <AppShell session={initialSession} workspace="hr">
        {children}
      </AppShell>
    </StoreProvider>
  );
}
