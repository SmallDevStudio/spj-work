import { createHash } from "node:crypto";

import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const IGNORED_FIELDS = new Set([
  "organizationId",
  "companyId",
  "createdAt",
  "updatedAt",
  "createdBy",
  "updatedBy",
  "installedAt",
  "installedBy",
]);

function comparableValue(value) {
  if (Array.isArray(value)) {
    return value.map(comparableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => !IGNORED_FIELDS.has(key))
        .sort()
        .map((key) => [key, comparableValue(value[key])]),
    );
  }

  return value;
}

function fingerprint(value) {
  return createHash("sha256")
    .update(JSON.stringify(comparableValue(value)))
    .digest("hex")
    .slice(0, 16);
}

async function inspectTypes(collectionRef) {
  const snapshot = await collectionRef.limit(101).get();

  if (snapshot.size > 100) {
    throw new ApplicationError({
      code: "LEAVE_MIGRATION_PREVIEW_LIMIT",
      message: "ประเภทลามากกว่า 100 รายการ กรุณาตรวจฐานข้อมูลก่อนย้าย",
      status: 409,
    });
  }

  const types = [];

  for (const typeDoc of snapshot.docs) {
    const versionsSnapshot = await typeDoc.ref
      .collection("versions")
      .limit(1001)
      .get();

    if (versionsSnapshot.size > 1000) {
      throw new ApplicationError({
        code: "LEAVE_MIGRATION_VERSION_LIMIT",
        message: `ประเภทลา ${typeDoc.id} มี revision มากเกินขนาดที่รองรับ`,
        status: 409,
      });
    }

    types.push({
      code: typeDoc.id,
      status: typeDoc.data().status ?? null,
      isDeleted: typeDoc.data().isDeleted === true,
      fingerprint: fingerprint(typeDoc.data()),
      revisions: versionsSnapshot.docs.map((versionDoc) => ({
        id: versionDoc.id,
        revision: versionDoc.data().revision ?? null,
        effectiveFrom: versionDoc.data().effectiveFrom ?? null,
        status: versionDoc.data().status ?? null,
        fingerprint: fingerprint(versionDoc.data()),
      })),
    });
  }

  return types.sort((a, b) => a.code.localeCompare(b.code));
}

export async function GET() {
  try {
    const currentSession = await requirePermission(
      PERMISSIONS.LEAVE_BALANCE_MANAGE,
    );

    if (currentSession.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "LEAVE_MIGRATION_SUPERADMIN_REQUIRED",
        message: "เฉพาะ SUPERADMIN เท่านั้นที่ตรวจข้อมูลก่อนย้ายได้",
        status: 403,
      });
    }

    const organizationRef = adminFirestore
      .collection("organizations")
      .doc(currentSession.access.organization.id);

    const companiesSnapshot = await organizationRef
      .collection("companies")
      .limit(101)
      .get();

    if (companiesSnapshot.size > 100) {
      throw new ApplicationError({
        code: "COMPANY_MIGRATION_PREVIEW_LIMIT",
        message: "จำนวนบริษัทเกินขนาดที่รองรับ",
        status: 409,
      });
    }

    const [sharedTypes, ...companyTypes] = await Promise.all([
      inspectTypes(organizationRef.collection("leaveTypes")),
      ...companiesSnapshot.docs.map((companyDoc) =>
        inspectTypes(companyDoc.ref.collection("leaveTypes")),
      ),
    ]);

    const companies = companiesSnapshot.docs.map((companyDoc, index) => ({
      id: companyDoc.id,
      code: companyDoc.data().code ?? null,
      name: companyDoc.data().name ?? null,
      leaveTypes: companyTypes[index],
    }));

    return createSuccessResponse({
      migrationPreview: {
        sharedLeaveTypes: sharedTypes,
        companies,
      },
    });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type Migration Preview API");
  }
}
