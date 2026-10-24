import AppSettingsClient from "@/components/app-settings/AppSettingsClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readAppSettings } from "@/repositories/settings/app-settings.repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตั้งค่าแอป | SPJ Work" };

export default async function SettingsPage() {
  const session = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
  const initial = await readAppSettings(session.access.organization.id);
  return <AppSettingsClient initial={initial} />;
}
