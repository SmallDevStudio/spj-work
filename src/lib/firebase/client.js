import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { APP_CONFIG } from "@/config/app.config";
import { clientEnv } from "@/config/env.client";

const firebaseConfig = {
  apiKey: clientEnv.firebaseApiKey,
  authDomain: clientEnv.firebaseAuthDomain,
  projectId: clientEnv.firebaseProjectId,
  storageBucket: clientEnv.firebaseStorageBucket,
  messagingSenderId: clientEnv.firebaseMessagingSenderId,
  appId: clientEnv.firebaseAppId,
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);

export const firestore = getFirestore(firebaseApp);

export const googleAuthProvider = new GoogleAuthProvider();

googleAuthProvider.setCustomParameters({
  hd: APP_CONFIG.emailDomain,
  prompt: "select_account",
});
