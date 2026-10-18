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

async function inspectTemplates(collectionRef) {
  const snapshot = await collectionRef.limit(101).get();

  if (snapshot.size > 100) {
    throw new ApplicationError({
      code: "LEAVE_TEMPLATE_PREVIEW_LIMIT",
      message: "Leave Template มากกว่า 100 รายการ กรุณาตรวจฐานข้อมูลก่อนย้าย",
      status: 409,
    });
  }

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        code: data.code ?? null,
        name: data.name ?? data.nameTh ?? null,
        revision: data.revision ?? null,
        effectiveFrom: data.effectiveFrom ?? null,
        status: data.status ?? null,
        isDeleted: data.isDeleted === true,
        entryCount: Array.isArray(data.entries) ? data.entries.length : null,
        fingerprint: fingerprint(data),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function GET() {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_BALANCE_MANAGE);

    if (session.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "LEAVE_TEMPLATE_MIGRATION_SUPERADMIN_REQUIRED",
        message: "เฉพาะ SUPERADMIN เท่านั้นที่ตรวจข้อมูลก่อนย้ายได้",
        status: 403,
      });
    }

    const orgRef = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id);

    const companiesSnapshot = await orgRef
      .collection("companies")
      .limit(101)
      .get();

    if (companiesSnapshot.size > 100) {
      throw new ApplicationError({
        code: "COMPANY_PREVIEW_LIMIT",
        message: "จำนวนบริษัทเกินขนาดที่รองรับ",
        status: 409,
      });
    }

    const [shared, ...companyTemplates] = await Promise.all([
      inspectTemplates(orgRef.collection("leaveTemplates")),
      ...companiesSnapshot.docs.map((doc) =>
        inspectTemplates(doc.ref.collection("leaveTemplates")),
      ),
    ]);

    return createSuccessResponse({
      migrationPreview: {
        sharedTemplates: shared,
        companies: companiesSnapshot.docs.map((doc, index) => ({
          id: doc.id,
          code: doc.data().code ?? null,
          templates: companyTemplates[index],
        })),
      },
    });
  } catch (error) {
    return createApiErrorResponse(
      error,
      "Leave Template Migration Preview API",
    );
  }
}
