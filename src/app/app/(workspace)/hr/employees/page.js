import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";

export default function LegacyEmployeesPage() {
  redirect(ROUTES.MANAGE_HR_EMPLOYEES);
}
