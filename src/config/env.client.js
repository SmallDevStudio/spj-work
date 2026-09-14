const clientEnvironment = Object.freeze({
  firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  firebaseMessagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const requiredEnvironmentVariables = {
  NEXT_PUBLIC_FIREBASE_API_KEY: clientEnvironment.firebaseApiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: clientEnvironment.firebaseAuthDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: clientEnvironment.firebaseProjectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: clientEnvironment.firebaseStorageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    clientEnvironment.firebaseMessagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: clientEnvironment.firebaseAppId,
};

const missingEnvironmentVariables = Object.entries(requiredEnvironmentVariables)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing client environment variables: ${missingEnvironmentVariables.join(", ")}`,
  );
}

export const clientEnv = clientEnvironment;
