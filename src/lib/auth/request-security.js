import "server-only";

import { APP_CONFIG } from "@/config/app.config";
import { serverEnv } from "@/config/env.server";
import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { getCsrfCookieName } from "@/lib/auth/cookies";
import { verifyCsrfToken } from "@/lib/auth/csrf";

function normalizeOrigin(origin) {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function requireAllowedOrigin(request) {
  const requestOrigin = request.headers.get("origin");
  const normalizedOrigin = normalizeOrigin(requestOrigin);

  if (
    !normalizedOrigin ||
    !serverEnv.allowedOrigins.includes(normalizedOrigin)
  ) {
    throw new AuthSessionError({
      code: "AUTH_ORIGIN_NOT_ALLOWED",
      message: "Request origin is not allowed.",
      status: 403,
    });
  }

  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite !== "same-origin") {
    throw new AuthSessionError({
      code: "AUTH_CROSS_SITE_REQUEST",
      message: "Cross-site request is not allowed.",
      status: 403,
    });
  }
}

export function requireJsonContentType(request) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    throw new AuthSessionError({
      code: "AUTH_INVALID_CONTENT_TYPE",
      message: "Content-Type must be application/json.",
      status: 415,
    });
  }
}

export function requireValidCsrfToken(request) {
  const cookieToken = request.cookies.get(getCsrfCookieName())?.value;

  const requestToken = request.headers.get(APP_CONFIG.csrf.headerName);

  if (!verifyCsrfToken(cookieToken, requestToken)) {
    throw new AuthSessionError({
      code: "AUTH_INVALID_CSRF_TOKEN",
      message: "CSRF token is invalid or expired.",
      status: 403,
    });
  }
}

export function validateStateChangingRequest(request) {
  requireAllowedOrigin(request);
  requireJsonContentType(request);
  requireValidCsrfToken(request);
}
