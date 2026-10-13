import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { serverEnv } from "@/config/env.server";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;

const masterKey = Buffer.from(serverEnv.employeeDataEncryptionKey, "base64");

const keySalt = Buffer.from("spj-work-employee-sensitive-data", "utf8");

const encryptionKey = Buffer.from(
  hkdfSync(
    "sha256",
    masterKey,
    keySalt,
    Buffer.from("employee-pin-encryption", "utf8"),
    32,
  ),
);

const hashKey = Buffer.from(
  hkdfSync(
    "sha256",
    masterKey,
    keySalt,
    Buffer.from("employee-pin-unique-hash", "utf8"),
    32,
  ),
);

export function createEmployeePinHash(employeePin) {
  return createHmac("sha256", hashKey)
    .update(`employee-pin:${employeePin}`, "utf8")
    .digest("hex");
}

export function encryptEmployeePin(employeePin) {
  const initializationVector = randomBytes(IV_LENGTH_BYTES);

  const cipher = createCipheriv(
    ALGORITHM,
    encryptionKey,
    initializationVector,
    {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    },
  );

  const ciphertext = Buffer.concat([
    cipher.update(employeePin, "utf8"),
    cipher.final(),
  ]);

  const authenticationTag = cipher.getAuthTag();

  return {
    version: KEY_VERSION,
    algorithm: ALGORITHM,
    ciphertext: ciphertext.toString("base64"),
    initializationVector: initializationVector.toString("base64"),
    authenticationTag: authenticationTag.toString("base64"),
  };
}

export function decryptEmployeePin(encryptedValue) {
  if (
    !encryptedValue ||
    encryptedValue.version !== KEY_VERSION ||
    encryptedValue.algorithm !== ALGORITHM
  ) {
    throw new Error("Employee PIN encryption format is not supported.");
  }

  const initializationVector = Buffer.from(
    encryptedValue.initializationVector,
    "base64",
  );

  const authenticationTag = Buffer.from(
    encryptedValue.authenticationTag,
    "base64",
  );

  const ciphertext = Buffer.from(encryptedValue.ciphertext, "base64");

  const decipher = createDecipheriv(
    ALGORITHM,
    encryptionKey,
    initializationVector,
    {
      authTagLength: AUTH_TAG_LENGTH_BYTES,
    },
  );

  decipher.setAuthTag(authenticationTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
