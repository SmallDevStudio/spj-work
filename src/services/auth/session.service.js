import "server-only";

import { APP_CONFIG } from "@/config/app.config";
import { serverEnv } from "@/config/env.server";
import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { adminAuth } from "@/lib/firebase/admin";
import { recordSuccessfulLogin } from "@/repositories/auth/access.repository";
import { resolveUserAccess } from "@/services/auth/access.service";

const GOOGLE_PROVIDER_ID = "google.com";
const PASSWORD_PROVIDER_ID = "password";

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? "";
}

function getEmailDomain(email) {
  return email.split("@")[1] ?? "";
}

function requireRecentAuthentication(decodedToken) {
  const authenticationTime = decodedToken.auth_time;

  if (typeof authenticationTime !== "number") {
    throw new AuthSessionError({
      code: "AUTH_TIME_MISSING",
      message: "Authentication time is missing.",
    });
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const tokenAge = currentTime - authenticationTime;

  if (tokenAge < -60 || tokenAge > APP_CONFIG.session.recentSignInSeconds) {
    throw new AuthSessionError({
      code: "AUTH_RECENT_LOGIN_REQUIRED",
      message: "A recent login is required.",
    });
  }
}

function validateGoogleIdentity(decodedToken, email) {
  if (decodedToken.email_verified !== true) {
    throw new AuthSessionError({
      code: "AUTH_EMAIL_NOT_VERIFIED",
      message: "Email address is not verified.",
    });
  }

  if (getEmailDomain(email) !== APP_CONFIG.emailDomain.toLowerCase()) {
    throw new AuthSessionError({
      code: "AUTH_WORKSPACE_DOMAIN_REQUIRED",
      message: "A Superjeew Google Workspace account is required.",
      status: 403,
    });
  }
}

function validateEmergencyIdentity(decodedToken, email) {
  if (decodedToken.email_verified !== true) {
    throw new AuthSessionError({
      code: "AUTH_EMAIL_NOT_VERIFIED",
      message: "Emergency email address is not verified.",
    });
  }

  if (email !== serverEnv.emergencySuperadminEmail) {
    throw new AuthSessionError({
      code: "AUTH_EMERGENCY_ACCOUNT_REQUIRED",
      message: "This password account is not authorized.",
      status: 403,
    });
  }
}

function validateIdentityProvider(decodedToken) {
  const email = normalizeEmail(decodedToken.email);
  const providerId = decodedToken.firebase?.sign_in_provider;

  if (!email) {
    throw new AuthSessionError({
      code: "AUTH_EMAIL_MISSING",
      message: "Authenticated email is missing.",
    });
  }

  if (providerId === GOOGLE_PROVIDER_ID) {
    validateGoogleIdentity(decodedToken, email);
  } else if (providerId === PASSWORD_PROVIDER_ID) {
    validateEmergencyIdentity(decodedToken, email);
  } else {
    throw new AuthSessionError({
      code: "AUTH_PROVIDER_NOT_ALLOWED",
      message: "Authentication provider is not allowed.",
      status: 403,
    });
  }

  return {
    uid: decodedToken.uid,
    email,
    emailVerified: decodedToken.email_verified === true,
    name: decodedToken.name ?? null,
    picture: decodedToken.picture ?? null,
    providerId,
  };
}

export async function createApplicationSession({ idToken, requestContext }) {
  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(idToken, true);
  } catch {
    throw new AuthSessionError({
      code: "AUTH_INVALID_ID_TOKEN",
      message: "Authentication token is invalid.",
    });
  }

  requireRecentAuthentication(decodedToken);

  const identity = validateIdentityProvider(decodedToken);

  const access = await resolveUserAccess(identity);

  const expiresIn = APP_CONFIG.session.maximumAgeSeconds * 1000;

  let sessionCookie;

  try {
    sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });
  } catch {
    throw new AuthSessionError({
      code: "AUTH_SESSION_CREATE_FAILED",
      message: "Unable to create authentication session.",
    });
  }

  await recordSuccessfulLogin({
    organizationId: access.organization.id,
    uid: identity.uid,
    email: identity.email,
    role: access.membership.role,
    providerId: identity.providerId,
    ipAddress: requestContext?.ipAddress,
    userAgent: requestContext?.userAgent,
  });

  return {
    sessionCookie,
    identity,
    access,
  };
}

export async function verifyApplicationSession(sessionCookie) {
  if (!sessionCookie) {
    throw new AuthSessionError({
      code: "AUTH_SESSION_REQUIRED",
      message: "Authentication is required.",
    });
  }

  let decodedClaims;

  try {
    decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    throw new AuthSessionError({
      code: "AUTH_SESSION_INVALID",
      message: "Authentication session is invalid or expired.",
    });
  }

  const identity = validateIdentityProvider(decodedClaims);

  const access = await resolveUserAccess(identity);

  return {
    identity,
    access,
    claims: decodedClaims,
  };
}
