import { redirect } from "next/navigation";

import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { requirePermission } from "@/lib/auth/authorization";

export default async function HrLayout({ children }) {
  const currentSession = await requirePermission(
    PERMISSIONS.SERVICE_HR_ACCESS,
  ).catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.HOME);
  }

  return children;
}
