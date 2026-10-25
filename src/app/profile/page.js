import { redirect } from "next/navigation";
import { getUserRoutes } from "@/constants/user-routes";
import { requireCurrentSession } from "@/lib/auth/authorization";

export default async function ProfileShortcut() {
  const session = await requireCurrentSession().catch(() => null);
  if (!session) redirect("/login?returnTo=%2Fprofile");
  redirect(getUserRoutes(session.identity.uid).PROFILE);
}
