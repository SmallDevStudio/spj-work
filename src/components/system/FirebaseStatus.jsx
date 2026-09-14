"use client";

import { HiCheckCircle } from "react-icons/hi2";

import { clientEnv } from "@/config/env.client";
import { firebaseApp } from "@/lib/firebase/client";

export default function FirebaseStatus() {
  const isReady =
    firebaseApp.name === "[DEFAULT]" && Boolean(clientEnv.firebaseProjectId);

  if (!isReady) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
      <HiCheckCircle className="size-5" aria-hidden="true" />

      <span>Firebase connected: {clientEnv.firebaseProjectId}</span>
    </div>
  );
}
