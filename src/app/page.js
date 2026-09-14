import { redirect } from "next/navigation";

import { getCurrentApplicationSession } from "@/lib/auth/current-session";

export default async function RootPage() {
  const currentSession = await getCurrentApplicationSession().catch(() => null);

  if (currentSession) {
    redirect("/app");
  }

  redirect("/login");
}
