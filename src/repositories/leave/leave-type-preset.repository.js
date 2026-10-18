import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { LEAVE_TYPE_PRESETS } from "@/constants/leave-types";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function installLeaveTypePresets({
  organizationId,
  companyId,
  effectiveFrom,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const companyRef = organizationRef.collection("companies").doc(companyId);

  const entries = LEAVE_TYPE_PRESETS.map((preset) => {
    const typeRef = companyRef.collection("leaveTypes").doc(preset.code);

    return {
      preset,
      typeRef,
      versionRef: typeRef.collection("versions").doc(),
      auditRef: organizationRef.collection("auditLogs").doc(),
    };
  });

  let result;

  await adminFirestore.runTransaction(async (transaction) => {
    const [companySnapshot, ...typeSnapshots] = await Promise.all([
      transaction.get(companyRef),
      ...entries.map(({ typeRef }) => transaction.get(typeRef)),
    ]);

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทที่เลือกไม่พร้อมใช้งาน",
        status: 400,
      });
    }

    const createdCodes = [];
    const existingCodes = [];

    for (const [index, entry] of entries.entries()) {
      if (typeSnapshots[index].exists) {
        existingCodes.push(entry.preset.code);
        continue;
      }

      const { preset, typeRef, versionRef, auditRef } = entry;

      const snapshot = {
        companyId,
        code: preset.code,
        nameTh: preset.nameTh,
        description: null,
        countingBasis: preset.countingBasis,
        payTreatment: preset.payTreatment,
        entitlementDays: preset.entitlementDays,
        paidDaysCap: preset.paidDaysCap,
        reasonRequired: preset.reasonRequired,
        effectiveFrom,
        status: "ACTIVE",
        source: "PRESET",
        revision: 1,
        isDeleted: false,
      };

      transaction.set(typeRef, {
        ...snapshot,
        currentVersionId: versionRef.id,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: actor.uid,
      });

      transaction.set(versionRef, {
        ...snapshot,
        versionId: versionRef.id,
        recordedAt: FieldValue.serverTimestamp(),
        recordedBy: actor.uid,
      });

      transaction.set(auditRef, {
        organizationId,
        actor,
        action: "LEAVE_TYPE_PRESET_INSTALL",
        entityType: "LEAVE_TYPE",
        entityId: `${companyId}/${preset.code}`,
        source: "WEB",
        summary: `Installed leave type ${preset.code}.`,
        before: null,
        after: snapshot,
        metadata: {
          companyId,
          versionId: versionRef.id,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      createdCodes.push(preset.code);
    }

    result = {
      companyId,
      createdCodes,
      existingCodes,
    };
  });

  return result;
}
