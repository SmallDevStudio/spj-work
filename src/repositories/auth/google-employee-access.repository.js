import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import {
  EMPLOYEE_ACCESS_STATUS,
  EMPLOYMENT_STATUS,
} from "@/constants/employees";
import { ROLES } from "@/constants/roles";
import { AuthSessionError } from "@/lib/auth/auth-session-error";
import { adminFirestore } from "@/lib/firebase/admin";

const ACTIVE_STATUS = "ACTIVE";
const GOOGLE_PROVIDER_ID = "google.com";

function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? "";
}

function createEmailKey(email) {
  return createHash("sha256")
    .update(normalizeEmail(email), "utf8")
    .digest("hex");
}

function createDeniedError({ code, message }) {
  return new AuthSessionError({
    code,
    message,
    status: 403,
  });
}

function validateEmailDirectory({ directory, email }) {
  if (!directory) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_NOT_REGISTERED",
      message: "ไม่พบอีเมลนี้ในข้อมูลพนักงาน กรุณาติดต่อฝ่าย HR ก่อนเข้าใช้งาน",
    });
  }

  if (normalizeEmail(directory.workEmail) !== email) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_EMAIL_MISMATCH",
      message: "ข้อมูลอีเมลพนักงานไม่ตรงกับบัญชี Google",
    });
  }

  if (!directory.organizationId || !directory.employeeId) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_DIRECTORY_INVALID",
      message: "ข้อมูลสิทธิ์เข้าใช้งานของพนักงานไม่สมบูรณ์",
    });
  }
}

function validateEmployee({ employee, email, uid }) {
  if (!employee || employee.isDeleted === true) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_NOT_FOUND",
      message: "ไม่พบข้อมูลพนักงานสำหรับบัญชีนี้",
    });
  }

  if (normalizeEmail(employee.workEmail) !== email) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_EMAIL_MISMATCH",
      message: "อีเมล Google ไม่ตรงกับอีเมลในข้อมูลพนักงาน",
    });
  }

  if (employee.employmentStatus !== EMPLOYMENT_STATUS.ACTIVE) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_INACTIVE",
      message: "สถานะพนักงานไม่ได้รับอนุญาตให้เข้าใช้งานระบบ",
    });
  }

  if (employee.accessStatus !== EMPLOYEE_ACCESS_STATUS.ACTIVE) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_ACCESS_INACTIVE",
      message: "สิทธิ์เข้าใช้งานของพนักงานยังไม่เปิดใช้งาน",
    });
  }

  if (employee.userId && employee.userId !== uid) {
    throw createDeniedError({
      code: "AUTH_EMPLOYEE_ALREADY_LINKED",
      message: "ข้อมูลพนักงานนี้เชื่อมกับบัญชีผู้ใช้อื่นแล้ว",
    });
  }
}

function validateExistingUser({ platformUser, email, organizationId }) {
  if (!platformUser) {
    return;
  }

  const existingEmail = normalizeEmail(
    platformUser.primaryEmail ?? platformUser.email,
  );

  if (existingEmail && existingEmail !== email) {
    throw createDeniedError({
      code: "AUTH_USER_EMAIL_CONFLICT",
      message: "บัญชีผู้ใช้นี้เชื่อมกับอีเมลอื่นแล้ว",
    });
  }

  if (
    platformUser.defaultOrganizationId &&
    platformUser.defaultOrganizationId !== organizationId
  ) {
    throw createDeniedError({
      code: "AUTH_USER_ORGANIZATION_CONFLICT",
      message: "บัญชีผู้ใช้นี้เชื่อมกับองค์กรอื่นแล้ว",
    });
  }
}

function validateExistingMembership({ membership, employeeId }) {
  if (membership?.employeeId && membership.employeeId !== employeeId) {
    throw createDeniedError({
      code: "AUTH_MEMBERSHIP_EMPLOYEE_CONFLICT",
      message: "สมาชิกผู้ใช้นี้เชื่อมกับพนักงานคนอื่นแล้ว",
    });
  }
}

export async function ensureGoogleEmployeeAccess(identity) {
  const email = normalizeEmail(identity.email);
  const emailKey = createEmailKey(email);

  const emailDirectoryRef = adminFirestore
    .collection("employeeEmailKeys")
    .doc(emailKey);

  return adminFirestore.runTransaction(async (transaction) => {
    // Read 1: locate the employee by verified Google email.
    const emailDirectorySnapshot = await transaction.get(emailDirectoryRef);

    const emailDirectory = emailDirectorySnapshot.exists
      ? emailDirectorySnapshot.data()
      : null;

    validateEmailDirectory({
      directory: emailDirectory,
      email,
    });

    const organizationId = emailDirectory.organizationId;
    const employeeId = emailDirectory.employeeId;

    const organizationRef = adminFirestore
      .collection("organizations")
      .doc(organizationId);

    const employeeRef = organizationRef.collection("employees").doc(employeeId);

    const userRef = adminFirestore.collection("users").doc(identity.uid);

    const membershipRef = organizationRef
      .collection("memberships")
      .doc(identity.uid);

    // Read 2: companyId must come from the employee record.
    const employeeSnapshot = await transaction.get(employeeRef);
    const employee = employeeSnapshot.exists ? employeeSnapshot.data() : null;

    validateEmployee({
      employee,
      email,
      uid: identity.uid,
    });

    if (!employee.companyId) {
      throw createDeniedError({
        code: "AUTH_EMPLOYEE_COMPANY_REQUIRED",
        message: "ยังไม่ได้กำหนดบริษัทให้พนักงาน กรุณาติดต่อฝ่าย HR",
      });
    }

    const companyRef = organizationRef
      .collection("companies")
      .doc(employee.companyId);

    // Read 3: finish every read before writing in the transaction.
    const [companySnapshot, userSnapshot, membershipSnapshot] =
      await Promise.all([
        transaction.get(companyRef),
        transaction.get(userRef),
        transaction.get(membershipRef),
      ]);

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== ACTIVE_STATUS
    ) {
      throw createDeniedError({
        code: "AUTH_EMPLOYEE_COMPANY_INACTIVE",
        message: "บริษัทของพนักงานไม่ได้เปิดใช้งาน กรุณาติดต่อฝ่าย HR",
      });
    }

    const platformUser = userSnapshot.exists ? userSnapshot.data() : null;

    const membership = membershipSnapshot.exists
      ? membershipSnapshot.data()
      : null;

    validateExistingUser({
      platformUser,
      email,
      organizationId,
    });

    validateExistingMembership({
      membership,
      employeeId,
    });

    const companyAccess =
      membership?.companyAccess ??
      (membership?.role === ROLES.SUPERADMIN
        ? { scope: "ALL", companyIds: [] }
        : { scope: "SELECTED", companyIds: [employee.companyId] });

    const canAccessHomeCompany =
      companyAccess.scope === "ALL" ||
      (companyAccess.scope === "SELECTED" &&
        Array.isArray(companyAccess.companyIds) &&
        companyAccess.companyIds.includes(employee.companyId));

    if (!canAccessHomeCompany) {
      throw createDeniedError({
        code: "AUTH_EMPLOYEE_COMPANY_ACCESS_DENIED",
        message:
          "บัญชีนี้ไม่มีสิทธิ์เข้าถึงบริษัทที่พนักงานสังกัด กรุณาติดต่อผู้ดูแลระบบ",
      });
    }

    const existingProviders = Array.isArray(platformUser?.authProviders)
      ? platformUser.authProviders
      : [];

    const authProviders = [
      ...new Set([...existingProviders, GOOGLE_PROVIDER_ID]),
    ];

    const shouldCreateUser = !userSnapshot.exists;
    const shouldCreateMembership = !membershipSnapshot.exists;
    const shouldLinkEmployee = employee.userId !== identity.uid;

    transaction.set(
      userRef,
      {
        primaryEmail: email,
        displayName:
          employee.displayName || identity.name || email.split("@")[0],
        photoURL: identity.picture ?? platformUser?.photoURL ?? null,
        status: platformUser?.status ?? ACTIVE_STATUS,
        defaultOrganizationId: organizationId,
        authProviders,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: identity.uid,
        ...(shouldCreateUser
          ? {
              createdAt: FieldValue.serverTimestamp(),
              createdBy: identity.uid,
            }
          : {}),
      },
      { merge: true },
    );

    transaction.set(
      membershipRef,
      {
        organizationId,
        userId: identity.uid,
        employeeId,
        companyAccess,
        role: membership?.role ?? employee.role,
        status: membership?.status ?? ACTIVE_STATUS,
        groupIds: membership?.groupIds ?? [],
        permissions: membership?.permissions ?? [],
        deniedPermissions: membership?.deniedPermissions ?? [],
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: identity.uid,
        ...(shouldCreateMembership
          ? {
              emergencyAccess: {
                enabled: false,
              },
              createdAt: FieldValue.serverTimestamp(),
              createdBy: identity.uid,
            }
          : {}),
      },
      { merge: true },
    );

    transaction.update(employeeRef, {
      userId: identity.uid,
      accessStatus: EMPLOYEE_ACCESS_STATUS.ACTIVE,
      lastIdentityVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: identity.uid,
    });

    transaction.set(
      emailDirectoryRef,
      {
        uid: identity.uid,
        status: EMPLOYEE_ACCESS_STATUS.ACTIVE,
        lastVerifiedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: identity.uid,
      },
      { merge: true },
    );

    if (shouldCreateUser || shouldCreateMembership || shouldLinkEmployee) {
      const auditLogRef = organizationRef.collection("auditLogs").doc();

      transaction.set(auditLogRef, {
        organizationId,
        actor: {
          uid: identity.uid,
          email,
          role: membership?.role ?? employee.role,
        },
        action: "EMPLOYEE_GOOGLE_ACCOUNT_LINK",
        entityType: "EMPLOYEE",
        entityId: employeeId,
        source: "WEB",
        summary: "Linked Google account to employee.",
        before: {
          userId: employee.userId ?? null,
        },
        after: {
          userId: identity.uid,
          providerId: GOOGLE_PROVIDER_ID,
          linked: true,
          companyId: employee.companyId,
          companyAccess,
        },
        metadata: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      organizationId,
      employeeId,
      role: membership?.role ?? employee.role,
    };
  });
}
