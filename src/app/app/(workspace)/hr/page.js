import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export default function LegacyHrPage() {
  redirect(ROUTES.MANAGE_HR);
}
