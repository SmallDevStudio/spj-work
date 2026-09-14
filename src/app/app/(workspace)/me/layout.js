import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function MyServicesLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.SERVICE_MY_ACCESS,
  ).catch(() => null);

  if (!currentSession) {
    redirect("/app");
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
      <AppShell session={initialSession} workspace="me">
        {children}
      </AppShell>
    </StoreProvider>
  );
}
