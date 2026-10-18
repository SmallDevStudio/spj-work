import { createHash } from "node:crypto";

import { FieldValue } from "firebase-admin/firestore";

import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { validateStateChangingRequest } from "@/lib/auth/request-security";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const IGNORED = new Set([
  "companyId",
  "organizationId",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
]);

function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !IGNORED.has(key))
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }

  return value;
}

function fingerprint(data) {
  return createHash("sha256")
    .update(JSON.stringify(canonical(data)))
    .digest("hex")
    .slice(0, 16);
}

function conflict(message) {
  return new ApplicationError({
    code: "LEAVE_TEMPLATE_MIGRATION_CONFLICT",
    message,
    status: 409,
  });
}

async function findCompany(organizationRef, code) {
  const snapshot = await organizationRef
    .collection("companies")
    .where("code", "==", code)
    .limit(2)
    .get();

  if (snapshot.size !== 1) {
    throw conflict(`ต้องมีบริษัท ${code} เพียงหนึ่งรายการ`);
  }

  return snapshot.docs[0].ref;
}

export async function POST(request) {
  try {
    validateStateChangingRequest(request);

    const session = await requirePermission(PERMISSIONS.LEAVE_BALANCE_MANAGE);

    if (session.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_MIGRATION_SUPERADMIN_REQUIRED",
        message: "เฉพาะ SUPERADMIN เท่านั้นที่ย้าย Leave Template ได้",
        status: 403,
      });
    }

    if (process.env.LEAVE_TEMPLATE_CUTOVER_ENABLED !== "true") {
      throw conflict("ยังไม่ได้เปิดการย้าย Leave Template ส่วนกลาง");
    }

    const organizationRef = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id);

    const [sourceCompanyRef, otherCompanyRef] = await Promise.all([
      findCompany(organizationRef, "SPJ01"),
      findCompany(organizationRef, "SPJ02"),
    ]);

    const result = await adminFirestore.runTransaction(async (tx) => {
      const sourceRef = sourceCompanyRef
        .collection("leaveTemplates")
        .doc("STAFF01");

      const targetRef = organizationRef
        .collection("leaveTemplates")
        .doc("STAFF01");

      const [source, target, other, sourceVersions, sharedTypes] =
        await Promise.all([
          tx.get(sourceRef),
          tx.get(targetRef),
          tx.get(otherCompanyRef.collection("leaveTemplates")),
          tx.get(sourceRef.collection("versions")),
          tx.get(organizationRef.collection("leaveTypes")),
        ]);

      if (
        !source.exists ||
        source.data().isDeleted === true ||
        source.data().code !== "STAFF01" ||
        source.data().revision !== 1 ||
        source.data().companyId !== sourceCompanyRef.id ||
        fingerprint(source.data()) !== "0242b05efcf8d6c6"
      ) {
        throw conflict("STAFF01 ของ SPJ01 เปลี่ยนไป กรุณาตรวจ Preview ใหม่");
      }

      if (target.exists || !other.empty) {
        throw conflict(
          "ส่วนกลางหรือ SPJ02 มี Template แล้ว กรุณาตรวจ Preview ใหม่",
        );
      }

      if (
        sourceVersions.size !== 1 ||
        sourceVersions.docs[0].id !== source.data().currentVersionId
      ) {
        throw conflict("revision ของ STAFF01 เปลี่ยนไป กรุณาตรวจ Preview ใหม่");
      }

      if (sharedTypes.size !== 7) {
        throw conflict("ประเภทลาส่วนกลางยังไม่ครบ 7 รายการ");
      }

      const typeCodes = new Set(sharedTypes.docs.map((doc) => doc.id));

      const entries = source.data().entries;

      if (
        !Array.isArray(entries) ||
        entries.some((entry) => !typeCodes.has(entry.leaveTypeCode))
      ) {
        throw conflict("STAFF01 อ้างอิงประเภทลาที่ไม่มีในส่วนกลาง");
      }

      const rootData = { ...source.data() };
      delete rootData.companyId;

      const versionData = {
        ...sourceVersions.docs[0].data(),
      };
      delete versionData.companyId;

      tx.create(targetRef, {
        ...rootData,
        storageScope: "ORGANIZATION",
        migratedFromCompanyId: sourceCompanyRef.id,
        migratedAt: FieldValue.serverTimestamp(),
      });

      tx.create(
        targetRef.collection("versions").doc(sourceVersions.docs[0].id),
        {
          ...versionData,
          storageScope: "ORGANIZATION",
          migratedFromCompanyId: sourceCompanyRef.id,
        },
      );

      tx.create(organizationRef.collection("auditLogs").doc(), {
        organizationId: organizationRef.id,
        actor: {
          uid: session.identity.uid,
          email: session.identity.email,
          role: session.access.membership.role,
        },
        action: "LEAVE_TEMPLATE_MIGRATE_TO_ORGANIZATION",
        entityType: "LEAVE_TEMPLATE",
        entityId: "STAFF01",
        source: "WEB",
        summary: "Migrated STAFF01 to shared organization policy.",
        before: {
          sourceCompanyId: sourceCompanyRef.id,
          revision: 1,
        },
        after: {
          storageScope: "ORGANIZATION",
          revision: 1,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        templateCode: "STAFF01",
        versionId: sourceVersions.docs[0].id,
      };
    });

    return createSuccessResponse({ result }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Template Migration API");
  }
}
