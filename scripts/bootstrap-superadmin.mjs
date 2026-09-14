import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const ORGANIZATION_ID = "superjeew";
const ORGANIZATION_NAME = "Superjeew Co., Ltd.";
const ORGANIZATION_CODE = "SPJ";
const ORGANIZATION_EMAIL_DOMAIN = "superjeew.com";
const DEFAULT_LOCALE = "th";
const TIMEZONE = "Asia/Bangkok";

const REQUIRED_ENVIRONMENT_VARIABLES = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "EMERGENCY_SUPERADMIN_EMAIL",
];

function validateEnvironment() {
  const missingVariables = REQUIRED_ENVIRONMENT_VARIABLES.filter(
    (variableName) => !process.env[variableName],
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(", ")}`,
    );
  }
}

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, "\n");
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_ADMIN_PRIVATE_KEY),
    }),
  });
}

async function bootstrapSuperadmin() {
  validateEnvironment();

  const firebaseAdminApp = initializeFirebaseAdmin();

  const auth = getAuth(firebaseAdminApp);
  const firestore = getFirestore(firebaseAdminApp);

  const emergencyEmail = normalizeEmail(process.env.EMERGENCY_SUPERADMIN_EMAIL);

  let authUser;

  try {
    authUser = await auth.getUserByEmail(emergencyEmail);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      throw new Error(`Emergency Firebase user not found: ${emergencyEmail}`);
    }

    throw error;
  }

  if (authUser.disabled) {
    throw new Error("Emergency Firebase user is disabled.");
  }

  authUser = await auth.updateUser(authUser.uid, {
    emailVerified: true,
    displayName: authUser.displayName ?? "Emergency SUPERADMIN",
  });

  const organizationRef = firestore
    .collection("organizations")
    .doc(ORGANIZATION_ID);

  const userRef = firestore.collection("users").doc(authUser.uid);

  const membershipRef = organizationRef
    .collection("memberships")
    .doc(authUser.uid);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  await firestore.runTransaction(async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    const userSnapshot = await transaction.get(userRef);

    const membershipSnapshot = await transaction.get(membershipRef);

    if (organizationSnapshot.exists) {
      throw new Error(`Organization already exists: ${ORGANIZATION_ID}`);
    }

    if (userSnapshot.exists) {
      throw new Error(`Platform user already exists: ${authUser.uid}`);
    }

    if (membershipSnapshot.exists) {
      throw new Error(`Membership already exists: ${authUser.uid}`);
    }

    transaction.set(organizationRef, {
      name: ORGANIZATION_NAME,
      code: ORGANIZATION_CODE,
      slug: ORGANIZATION_ID,
      emailDomain: ORGANIZATION_EMAIL_DOMAIN,
      defaultLocale: DEFAULT_LOCALE,
      timezone: TIMEZONE,
      status: "ACTIVE",
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authUser.uid,
    });

    transaction.set(userRef, {
      uid: authUser.uid,
      email: emergencyEmail,
      displayName: authUser.displayName ?? "Emergency SUPERADMIN",
      photoURL: authUser.photoURL ?? null,
      userType: "INTERNAL",
      status: "ACTIVE",
      defaultOrganizationId: ORGANIZATION_ID,
      authProviders: ["password"],
      preferredLocale: DEFAULT_LOCALE,
      lastLoginAt: null,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authUser.uid,
    });

    transaction.set(membershipRef, {
      userId: authUser.uid,
      employeeId: null,
      role: "SUPERADMIN",
      permissionMode: "ROLE_DEFAULT",
      permissions: [],
      groupIds: [],
      status: "ACTIVE",
      emergencyAccess: {
        enabled: true,
        enabledAt: FieldValue.serverTimestamp(),
        enabledBy: authUser.uid,
      },
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authUser.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authUser.uid,
    });

    transaction.set(auditLogRef, {
      organizationId: ORGANIZATION_ID,
      actor: {
        uid: authUser.uid,
        email: emergencyEmail,
        role: "SUPERADMIN",
      },
      action: "SYSTEM_BOOTSTRAP",
      entityType: "ORGANIZATION",
      entityId: ORGANIZATION_ID,
      source: "BOOTSTRAP_SCRIPT",
      summary: "Created organization and Emergency SUPERADMIN.",
      before: null,
      after: {
        organizationId: ORGANIZATION_ID,
        userId: authUser.uid,
        role: "SUPERADMIN",
        status: "ACTIVE",
      },
      metadata: {
        script: "bootstrap-superadmin.mjs",
        environment: process.env.NODE_ENV ?? "development",
      },
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  console.log("");
  console.log("SPJ Work bootstrap completed.");
  console.log(`Organization: ${ORGANIZATION_NAME}`);
  console.log(`Organization ID: ${ORGANIZATION_ID}`);
  console.log(`SUPERADMIN email: ${emergencyEmail}`);
  console.log(`Firebase UID: ${authUser.uid}`);
  console.log("");
}

bootstrapSuperadmin()
  .then(() => {
    process.exitCode = 0;
  })
  .catch((error) => {
    console.error("");
    console.error("SPJ Work bootstrap failed.");
    console.error(error.message);
    console.error("");

    process.exitCode = 1;
  });
