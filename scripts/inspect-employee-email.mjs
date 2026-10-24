import { createHash } from "node:crypto";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2]?.trim().toLowerCase();
const organizationId = process.argv[3]?.trim() || "superjeew";

if (!email || !email.includes("@")) {
  throw new Error(
    "Usage: node --env-file=.env.local scripts/inspect-employee-email.mjs EMAIL ORGANIZATION_ID",
  );
}

const required = [
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });

const db = getFirestore(app);
const auth = getAuth(app);

const emailKey = createHash("sha256").update(email, "utf8").digest("hex");

const keySnapshot = await db
  .collection("employeeEmailKeys")
  .doc(emailKey)
  .get();

const key = keySnapshot.exists ? keySnapshot.data() : null;

let pointedEmployee = null;
let pointedMembership = null;
let pointedPlatformUser = null;
let pointedCompany = null;

if (key?.organizationId && key?.employeeId) {
  const orgRef = db.collection("organizations").doc(key.organizationId);

  const employeeSnapshot = await orgRef
    .collection("employees")
    .doc(key.employeeId)
    .get();

  if (employeeSnapshot.exists) {
    const data = employeeSnapshot.data();

    pointedEmployee = {
      id: employeeSnapshot.id,
      employeeCode: data.employeeCode ?? null,
      workEmail: data.workEmail ?? null,
      displayName: data.displayName ?? null,
      companyId: data.companyId ?? null,
      employmentStatus: data.employmentStatus ?? null,
      accessStatus: data.accessStatus ?? null,
      isDeleted: data.isDeleted === true,
      userId: data.userId ?? null,
    };

    if (data.companyId) {
      const companySnapshot = await orgRef
        .collection("companies")
        .doc(data.companyId)
        .get();

      pointedCompany = companySnapshot.exists
        ? {
            id: companySnapshot.id,
            status: companySnapshot.data().status ?? null,
            isDeleted: companySnapshot.data().isDeleted === true,
          }
        : { id: data.companyId, exists: false };
    }

    if (data.userId) {
      const [membershipSnapshot, userSnapshot] = await Promise.all([
        orgRef.collection("memberships").doc(data.userId).get(),
        db.collection("users").doc(data.userId).get(),
      ]);

      pointedMembership = membershipSnapshot.exists
        ? {
            uid: membershipSnapshot.id,
            employeeId: membershipSnapshot.data().employeeId ?? null,
            status: membershipSnapshot.data().status ?? null,
            role: membershipSnapshot.data().role ?? null,
            companyAccess: membershipSnapshot.data().companyAccess ?? null,
          }
        : null;

      pointedPlatformUser = userSnapshot.exists
        ? {
            uid: userSnapshot.id,
            primaryEmail:
              userSnapshot.data().primaryEmail ??
              userSnapshot.data().email ??
              null,
            status: userSnapshot.data().status ?? null,
            authProviders: userSnapshot.data().authProviders ?? [],
          }
        : null;
    }
  }
}

const directMatches = await db
  .collection("organizations")
  .doc(organizationId)
  .collection("employees")
  .where("workEmail", "==", email)
  .limit(20)
  .get();

let firebaseAuthUser = null;

try {
  const user = await auth.getUserByEmail(email);

  firebaseAuthUser = {
    uid: user.uid,
    disabled: user.disabled,
    emailVerified: user.emailVerified,
    providers: user.providerData.map((provider) => provider.providerId),
  };
} catch (error) {
  if (error.code !== "auth/user-not-found") {
    throw error;
  }
}

console.log(
  JSON.stringify(
    {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      searchedEmail: email,
      searchedOrganizationId: organizationId,
      emailKey: key
        ? {
            exists: true,
            organizationId: key.organizationId ?? null,
            employeeId: key.employeeId ?? null,
            workEmail: key.workEmail ?? null,
            status: key.status ?? null,
            uid: key.uid ?? null,
          }
        : { exists: false },
      pointedEmployee,
      pointedCompany,
      pointedMembership,
      pointedPlatformUser,
      directMatches: directMatches.docs.map((doc) => ({
        id: doc.id,
        employeeCode: doc.data().employeeCode ?? null,
        companyId: doc.data().companyId ?? null,
        isDeleted: doc.data().isDeleted === true,
        employmentStatus: doc.data().employmentStatus ?? null,
        accessStatus: doc.data().accessStatus ?? null,
        userId: doc.data().userId ?? null,
      })),
      firebaseAuthUser,
    },
    null,
    2,
  ),
);
