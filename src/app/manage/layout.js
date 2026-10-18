import { redirect } from "next/navigation";

import AppShell from "@/components/layout/AppShell";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requirePermission } from "@/lib/auth/authorization";
import StoreProvider from "@/providers/StoreProvider";

export default async function ManageLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.PORTAL_ACCESS,
  ).catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.LOGIN);
  }

  const { identity, access } = currentSession;

  const canManage =
    access.permissions.includes(PERMISSIONS.SERVICE_HR_ACCESS) ||
    access.permissions.includes(PERMISSIONS.ORGANIZATION_MANAGE);

  if (!canManage) {
    redirect(ROUTES.HOME);
  }

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
      <AppShell session={initialSession} workspace="hr">
        {children}
      </AppShell>
    </StoreProvider>
  );
}
