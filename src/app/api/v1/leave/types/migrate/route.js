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

const EXPECTED_CODES = [
  "ANNUAL",
  "MATERNITY",
  "ORDINATION",
  "OTHER",
  "PERSONAL",
  "SICK",
  "UNPAID",
];

function conflict(message) {
  return new ApplicationError({
    code: "LEAVE_POLICY_MIGRATION_CONFLICT",
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
        code: "LEAVE_MIGRATION_SUPERADMIN_REQUIRED",
        message: "เฉพาะ SUPERADMIN เท่านั้นที่ย้ายนโยบายได้",
        status: 403,
      });
    }

    // เปิดหลังจาก API แก้ไขประเภทลาทั้งหมดเขียนส่วนกลางแล้วเท่านั้น
    if (process.env.LEAVE_POLICY_CUTOVER_ENABLED !== "true") {
      throw conflict("ยังไม่ได้เปิดการย้ายนโยบายส่วนกลาง");
    }

    const organizationRef = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id);

    const [sourceCompanyRef, otherCompanyRef] = await Promise.all([
      findCompany(organizationRef, "SPJ01"),
      findCompany(organizationRef, "SPJ02"),
    ]);

    const migratedCodes = await adminFirestore.runTransaction(async (tx) => {
      const [sourceCompany, otherCompany, shared, source, other] =
        await Promise.all([
          tx.get(sourceCompanyRef),
          tx.get(otherCompanyRef),
          tx.get(organizationRef.collection("leaveTypes")),
          tx.get(sourceCompanyRef.collection("leaveTypes")),
          tx.get(otherCompanyRef.collection("leaveTypes")),
        ]);

      if (
        !sourceCompany.exists ||
        !otherCompany.exists ||
        sourceCompany.data().code !== "SPJ01" ||
        otherCompany.data().code !== "SPJ02"
      ) {
        throw conflict(
          "ข้อมูลบริษัทเปลี่ยนไป กรุณาตรวจ migration preview ใหม่",
        );
      }

      if (!shared.empty || !other.empty) {
        throw conflict(
          "ส่วนกลางหรือ SPJ02 มีประเภทลาแล้ว กรุณาตรวจข้อมูลก่อนย้าย",
        );
      }

      const codes = source.docs.map((doc) => doc.id).sort();

      if (
        JSON.stringify(codes) !== JSON.stringify([...EXPECTED_CODES].sort())
      ) {
        throw conflict(
          "ชุดประเภทลาของ SPJ01 เปลี่ยนไป กรุณาตรวจ migration preview ใหม่",
        );
      }

      const versionsByType = [];

      for (const typeDoc of source.docs) {
        const versions = await tx.get(typeDoc.ref.collection("versions"));

        if (versions.size !== 1 || versions.docs[0].data().revision !== 1) {
          throw conflict(`revision ของ ${typeDoc.id} เปลี่ยนไป กรุณาตรวจใหม่`);
        }

        versionsByType.push({ typeDoc, versions });
      }

      // อ่านครบทุกเอกสารก่อนเริ่มเขียน
      for (const { typeDoc, versions } of versionsByType) {
        const typeData = { ...typeDoc.data() };
        delete typeData.companyId;

        const targetRef = organizationRef
          .collection("leaveTypes")
          .doc(typeDoc.id);

        tx.create(targetRef, {
          ...typeData,
          storageScope: "ORGANIZATION",
          migratedFromCompanyId: sourceCompanyRef.id,
          migratedAt: FieldValue.serverTimestamp(),
        });

        for (const versionDoc of versions.docs) {
          const versionData = { ...versionDoc.data() };
          delete versionData.companyId;

          tx.create(targetRef.collection("versions").doc(versionDoc.id), {
            ...versionData,
            storageScope: "ORGANIZATION",
            migratedFromCompanyId: sourceCompanyRef.id,
          });
        }
      }

      tx.create(organizationRef.collection("auditLogs").doc(), {
        organizationId: organizationRef.id,
        actor: {
          uid: session.identity.uid,
          email: session.identity.email,
          role: session.access.membership.role,
        },
        action: "LEAVE_TYPES_MIGRATE_TO_ORGANIZATION",
        entityType: "ORGANIZATION",
        entityId: organizationRef.id,
        source: "WEB",
        summary:
          "Migrated leave types from SPJ01 to shared organization policy.",
        before: {
          sourceCompanyId: sourceCompanyRef.id,
          codes,
        },
        after: {
          storageScope: "ORGANIZATION",
          codes,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      return codes;
    });

    return createSuccessResponse({ migratedCodes }, { status: 201 });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Type Migration API");
  }
}
