import "server-only";

import { cookies } from "next/headers";

import { getSessionCookieName } from "@/lib/auth/cookies";
import { verifyApplicationSession } from "@/services/auth/session.service";

export async function getCurrentApplicationSession() {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get(getSessionCookieName())?.value;

  return verifyApplicationSession(sessionCookie);
}
