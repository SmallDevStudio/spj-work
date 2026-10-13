import "server-only";

const rawAllowedOrigins = process.env.APP_ALLOWED_ORIGINS ?? "";

const allowedOrigins = rawAllowedOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const employeeDataEncryptionKey =
  process.env.EMPLOYEE_DATA_ENCRYPTION_KEY?.trim();

const serverEnvironment = Object.freeze({
  firebaseAdminProjectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  firebaseAdminClientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  firebaseAdminPrivateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  csrfSecret: process.env.CSRF_SECRET,
  allowedOrigins: Object.freeze(allowedOrigins),
  emergencySuperadminEmail:
    process.env.EMERGENCY_SUPERADMIN_EMAIL?.trim().toLowerCase(),
  employeeDataEncryptionKey,
});

const requiredEnvironmentVariables = {
  FIREBASE_ADMIN_PROJECT_ID: serverEnvironment.firebaseAdminProjectId,
  FIREBASE_ADMIN_CLIENT_EMAIL: serverEnvironment.firebaseAdminClientEmail,
  FIREBASE_ADMIN_PRIVATE_KEY: serverEnvironment.firebaseAdminPrivateKey,
  CSRF_SECRET: serverEnvironment.csrfSecret,
  APP_ALLOWED_ORIGINS:
    serverEnvironment.allowedOrigins.length > 0 ? rawAllowedOrigins : null,
  EMERGENCY_SUPERADMIN_EMAIL: serverEnvironment.emergencySuperadminEmail,
  EMPLOYEE_DATA_ENCRYPTION_KEY: serverEnvironment.employeeDataEncryptionKey,
};

const missingEnvironmentVariables = Object.entries(requiredEnvironmentVariables)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing server environment variables: ${missingEnvironmentVariables.join(", ")}`,
  );
}

if (serverEnvironment.csrfSecret.length < 32) {
  throw new Error("CSRF_SECRET must contain at least 32 characters.");
}

let decodedEmployeeEncryptionKey;

try {
  decodedEmployeeEncryptionKey = Buffer.from(
    serverEnvironment.employeeDataEncryptionKey,
    "base64",
  );
} catch {
  throw new Error("EMPLOYEE_DATA_ENCRYPTION_KEY must be valid Base64.");
}

if (decodedEmployeeEncryptionKey.length !== 32) {
  throw new Error(
    "EMPLOYEE_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.",
  );
}

for (const origin of serverEnvironment.allowedOrigins) {
  let parsedOrigin;

  try {
    parsedOrigin = new URL(origin);
  } catch {
    throw new Error(`Invalid origin in APP_ALLOWED_ORIGINS: ${origin}`);
  }

  if (parsedOrigin.origin !== origin) {
    throw new Error(
      `APP_ALLOWED_ORIGINS must contain origins without paths: ${origin}`,
    );
  }
}

if (!serverEnvironment.emergencySuperadminEmail.includes("@")) {
  throw new Error("EMERGENCY_SUPERADMIN_EMAIL must be a valid email address.");
}

export const serverEnv = serverEnvironment;
