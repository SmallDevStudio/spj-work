import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function assignEmployeeCompany({
  organizationId,
  employeeId,
  companyId,
  actor,
}) {
  const organizationRef = adminFirestore
    .collection("organizations")
    .doc(organizationId);

  const employeeRef = organizationRef.collection("employees").doc(employeeId);

  const companyRef = organizationRef.collection("companies").doc(companyId);

  const auditLogRef = organizationRef.collection("auditLogs").doc();

  let result;

  await adminFirestore.runTransaction(async (transaction) => {
    const [employeeSnapshot, companySnapshot] = await Promise.all([
      transaction.get(employeeRef),
      transaction.get(companyRef),
    ]);

    if (
      !employeeSnapshot.exists ||
      employeeSnapshot.data()?.isDeleted === true
    ) {
      throw new ApplicationError({
        code: "EMPLOYEE_NOT_FOUND",
        message: "ไม่พบข้อมูลพนักงาน",
        status: 404,
      });
    }

    if (
      !companySnapshot.exists ||
      companySnapshot.data()?.isDeleted === true ||
      companySnapshot.data()?.status !== "ACTIVE"
    ) {
      throw new ApplicationError({
        code: "COMPANY_NOT_ACTIVE",
        message: "บริษัทที่เลือกไม่มีอยู่หรือไม่ได้เปิดใช้งาน",
        status: 400,
      });
    }

    const employee = employeeSnapshot.data();
    const previousCompanyId = employee.companyId ?? null;

    if (previousCompanyId === companyId) {
      result = {
        id: employeeId,
        employeeCode: employee.employeeCode,
        companyId,
        changed: false,
      };
      return;
    }

    transaction.update(employeeRef, {
      companyId,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actor.uid,
    });

    transaction.set(auditLogRef, {
      organizationId,
      actor,
      action: "EMPLOYEE_COMPANY_ASSIGN",
      entityType: "EMPLOYEE",
      entityId: employeeId,
      source: "WEB",
      summary: `Assigned company for employee ${employee.employeeCode}.`,
      before: {
        companyId: previousCompanyId,
      },
      after: {
        companyId,
      },
      metadata: {
        employeeCode: employee.employeeCode,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    result = {
      id: employeeId,
      employeeCode: employee.employeeCode,
      companyId,
      changed: true,
    };
  });

  return result;
}
