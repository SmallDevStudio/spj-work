import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export default function LegacyDepartmentsPage() {
  redirect(ROUTES.MANAGE_HR_DEPARTMENTS);
}
