import "server-only";

import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { ensureGoogleEmployeeAccess } from "@/repositories/auth/google-employee-access.repository";

const GOOGLE_PROVIDER_ID = "google.com";

export async function requireGoogleEmployeeAccess(identity) {
  if (identity.providerId !== GOOGLE_PROVIDER_ID) {
    throw new AuthSessionError({
      code: "AUTH_GOOGLE_PROVIDER_REQUIRED",
      message: "Google authentication is required.",
      status: 403,
    });
  }

  return ensureGoogleEmployeeAccess(identity);
}
