import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export default function LegacySettingsPage() {
  redirect(ROUTES.MANAGE_SETTINGS);
}
