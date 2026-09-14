import "server-only";

import { createHmac, randomBytes } from "node:crypto";

import { serverEnv } from "@/config/env.server";
import { secureCompare } from "@/lib/security/secure-compare";

const TOKEN_SEPARATOR = ".";

function createSignature(nonce) {
  return createHmac("sha256", serverEnv.csrfSecret)
    .update(nonce)
    .digest("base64url");
}

export function createCsrfToken() {
  const nonce = randomBytes(32).toString("base64url");
  const signature = createSignature(nonce);

  return `${nonce}${TOKEN_SEPARATOR}${signature}`;
}

export function verifyCsrfToken(cookieToken, requestToken) {
  if (typeof cookieToken !== "string" || typeof requestToken !== "string") {
    return false;
  }

  if (!secureCompare(cookieToken, requestToken)) {
    return false;
  }

  const tokenParts = requestToken.split(TOKEN_SEPARATOR);

  if (tokenParts.length !== 2) {
    return false;
  }

  const [nonce, providedSignature] = tokenParts;

  if (!nonce || !providedSignature) {
    return false;
  }

  const expectedSignature = createSignature(nonce);

  return secureCompare(providedSignature, expectedSignature);
}
