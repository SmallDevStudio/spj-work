import "server-only";

import { APP_CONFIG } from "@/config/app.config";

export function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

export function getCsrfCookieName() {
  return isProductionEnvironment()
    ? APP_CONFIG.csrf.productionCookieName
    : APP_CONFIG.csrf.developmentCookieName;
}

export function getSessionCookieName() {
  return isProductionEnvironment()
    ? APP_CONFIG.session.productionCookieName
    : APP_CONFIG.session.developmentCookieName;
}

function getBaseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProductionEnvironment(),
    sameSite: "strict",
    path: "/",
    priority: "high",
  };
}

export function getCsrfCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: APP_CONFIG.csrf.maximumAgeSeconds,
  };
}

export function getSessionCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: APP_CONFIG.session.maximumAgeSeconds,
  };
}

export function getExpiredCookieOptions() {
  return {
    ...getBaseCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  };
}
