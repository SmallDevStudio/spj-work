import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminFirestore } from "@/lib/firebase/admin";

export async function readAppSettings(organizationId) {
  const snapshot = await adminFirestore.collection("organizations").doc(organizationId)
    .collection("appSettings").doc("general").get();
  return { notifications: { email: false, line: false, ...snapshot.data()?.notifications } };
}

export async function saveAppSettings({ organizationId, actor, settings }) {
  const root = adminFirestore.collection("organizations").doc(organizationId);
  const ref = root.collection("appSettings").doc("general");
  const auditRef = root.collection("auditLogs").doc();
  await adminFirestore.runTransaction(async (tx) => {
    const before = (await tx.get(ref)).data() ?? null;
    tx.set(ref, { ...settings, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
    tx.set(auditRef, {
      organizationId, actor, action: "APP_SETTINGS_UPDATE", entityType: "APP_SETTINGS",
      entityId: "general", source: "WEB", summary: "Updated app notification preferences.",
      before: before ? { notifications: before.notifications ?? null } : null,
      after: settings, metadata: null, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return settings;
}
