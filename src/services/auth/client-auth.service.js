"use client";

import axios from "axios";
import {
  inMemoryPersistence,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as signOutFirebase,
} from "firebase/auth";

import { apiClient, getCsrfCredentials } from "@/lib/axios/api-client";
import { firebaseAuth, googleAuthProvider } from "@/lib/firebase/client";

export class ClientAuthError extends Error {
  constructor({ code, message, originalError = null }) {
    super(message);

    this.name = "ClientAuthError";
    this.code = code;
    this.originalError = originalError;
  }
}

function normalizeClientAuthError(error) {
  if (error instanceof ClientAuthError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    return new ClientAuthError({
      code: error.response?.data?.error?.code ?? "AUTH_API_REQUEST_FAILED",
      message:
        error.response?.data?.error?.message ??
        "Authentication request failed.",
      originalError: error,
    });
  }

  return new ClientAuthError({
    code: error?.code ?? "AUTH_UNKNOWN_ERROR",
    message: error?.message ?? "An unexpected authentication error occurred.",
    originalError: error,
  });
}

async function createServerSession(firebaseUser) {
  const idToken = await firebaseUser.getIdToken(true);
  const { csrfToken, headerName } = await getCsrfCredentials();

  const response = await apiClient.post(
    "/auth/session",
    {
      idToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
        [headerName]: csrfToken,
      },
    },
  );

  return response.data.data;
}

async function completeFirebaseSignIn(signInOperation) {
  await setPersistence(firebaseAuth, inMemoryPersistence);

  let firebaseCredential;

  try {
    firebaseCredential = await signInOperation();

    return await createServerSession(firebaseCredential.user);
  } catch (error) {
    throw normalizeClientAuthError(error);
  } finally {
    try {
      await signOutFirebase(firebaseAuth);
    } catch {
      // The server session remains independent from
      // the temporary Firebase client session.
    }
  }
}

export async function signInWithGoogleWorkspace() {
  return completeFirebaseSignIn(() =>
    signInWithPopup(firebaseAuth, googleAuthProvider),
  );
}

export async function signInWithEmergencyAccount({ email, password }) {
  return completeFirebaseSignIn(() =>
    signInWithEmailAndPassword(
      firebaseAuth,
      email.trim().toLowerCase(),
      password,
    ),
  );
}

export async function getCurrentClientSession() {
  try {
    const response = await apiClient.get("/auth/session");

    return response.data.data;
  } catch (error) {
    throw normalizeClientAuthError(error);
  }
}

export async function signOutApplication() {
  try {
    const { csrfToken, headerName } = await getCsrfCredentials();

    const response = await apiClient.delete("/auth/session", {
      data: {},
      headers: {
        "Content-Type": "application/json",
        [headerName]: csrfToken,
      },
    });

    return response.data.data;
  } catch (error) {
    throw normalizeClientAuthError(error);
  } finally {
    try {
      await signOutFirebase(firebaseAuth);
    } catch {
      // Firebase client authentication uses
      // in-memory persistence only.
    }
  }
}
