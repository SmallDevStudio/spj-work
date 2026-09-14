import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function DashboardLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.DASHBOARD_READ,
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
      <AppShell session={initialSession}>{children}</AppShell>
    </StoreProvider>
  );
}
