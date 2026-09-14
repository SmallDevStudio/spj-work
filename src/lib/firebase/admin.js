import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import { serverEnv } from "@/config/env.server";

function normalizePrivateKey(privateKey) {
  return privateKey.replace(/\\n/g, "\n");
}

const firebaseAdminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: serverEnv.firebaseAdminProjectId,
          clientEmail: serverEnv.firebaseAdminClientEmail,
          privateKey: normalizePrivateKey(serverEnv.firebaseAdminPrivateKey),
        }),
      });

export const adminAuth = getAuth(firebaseAdminApp);

export const adminFirestore = getFirestore(firebaseAdminApp);

export { firebaseAdminApp };
