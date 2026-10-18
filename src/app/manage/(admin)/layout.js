import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requirePermission } from "@/lib/auth/authorization";

export default async function ManageSettingsLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.ORGANIZATION_MANAGE,
  ).catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.HOME);
  }

  return children;
}
