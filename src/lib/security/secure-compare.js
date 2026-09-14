import "server-only";

import { timingSafeEqual } from "node:crypto";

export function secureCompare(firstValue, secondValue) {
  if (typeof firstValue !== "string" || typeof secondValue !== "string") {
    return false;
  }

  const firstBuffer = Buffer.from(firstValue);
  const secondBuffer = Buffer.from(secondValue);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}
