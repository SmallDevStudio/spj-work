import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { EMPLOYEE_ACCESS_STATUS } from "@/constants/employees";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

function fail(code, message, status = 409) {
  throw new ApplicationError({ code, message, status });
}

export async function softDeleteEmployee({ organizationId, employeeId, actor, companyAccess }) {
  const root = adminFirestore.collection("organizations").doc(organizationId);
  const employeeRef = root.collection("employees").doc(employeeId);
  const assignedDepartments = root.collection("departments").where("managerEmployeeId", "==", employeeId).limit(501);
  const assignedEmployees = root.collection("employees").where("managerEmployeeId", "==", employeeId).limit(501);
  const pendingRequests = root.collection("leaveRequests").where("status", "==", "PENDING_APPROVAL").limit(501);

  await adminFirestore.runTransaction(async (transaction) => {
    const [snapshot, departments, reports, pending] = await Promise.all([
      transaction.get(employeeRef), transaction.get(assignedDepartments),
      transaction.get(assignedEmployees), transaction.get(pendingRequests),
    ]);
    const employee = snapshot.data();
    if (!snapshot.exists || employee?.isDeleted === true) fail("EMPLOYEE_NOT_FOUND", "ไม่พบข้อมูลพนักงาน", 404);
    if (!canAccessCompany(companyAccess, employee.companyId)) fail("EMPLOYEE_COMPANY_ACCESS_DENIED", "ไม่มีสิทธิ์ลบพนักงานของบริษัทนี้", 403);
    if (employee.userId === actor.uid) fail("EMPLOYEE_DELETE_SELF_DENIED", "ไม่สามารถลบบัญชีพนักงานของตนเอง", 409);
    if (departments.size > 500 || reports.size > 500) fail("EMPLOYEE_MANAGER_HISTORY_LIMIT", "ประวัติหัวหน้างานมากเกินกว่าจะตรวจสอบ กรุณาติดต่อผู้ดูแลระบบ");
    if (departments.docs.some((doc) => doc.data().isDeleted !== true) ||
        reports.docs.some((doc) => doc.id !== employeeId && doc.data().isDeleted !== true)) {
      fail("EMPLOYEE_IS_MANAGER", "กรุณาเปลี่ยนหัวหน้าแผนกและหัวหน้างานของพนักงานก่อนลบ");
    }
    if (pending.size > 500) fail("EMPLOYEE_PENDING_REQUESTS_LIMIT", "รายการใบลาค้างมากเกินกว่าจะตรวจสอบ กรุณาติดต่อผู้ดูแลระบบ");
    if (pending.docs.some((doc) => {
      const request = doc.data();
      return request.isDeleted !== true &&
        (request.employeeId === employeeId || request.approval?.steps?.some((step) =>
          step.status === "PENDING" && step.approverEmployeeIds?.includes(employeeId)));
    })) fail("EMPLOYEE_PENDING_LEAVE", "กรุณาจัดการใบลาและงานอนุมัติที่ค้างก่อนลบพนักงาน");

    const membershipRef = employee.userId ? root.collection("memberships").doc(employee.userId) : null;
    const userRef = employee.userId ? adminFirestore.collection("users").doc(employee.userId) : null;
    const [membership, user] = await Promise.all([
      membershipRef ? transaction.get(membershipRef) : null,
      userRef ? transaction.get(userRef) : null,
    ]);
    if (membership?.exists && membership.data().employeeId !== employeeId) {
      fail("EMPLOYEE_ACCOUNT_MISMATCH", "บัญชีผู้ใช้เชื่อมกับพนักงานคนอื่น กรุณาตรวจสอบก่อนลบ");
    }

    transaction.update(employeeRef, {
      isDeleted: true, deletedAt: FieldValue.serverTimestamp(), deletedBy: actor.uid,
      accessStatus: EMPLOYEE_ACCESS_STATUS.REVOKED,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    if (membership?.exists) transaction.update(membershipRef, {
      status: "INACTIVE", updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    if (user?.exists) transaction.update(userRef, {
      status: "INACTIVE", updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    // คง key รหัสและอีเมลไว้เพื่อไม่ให้พนักงานใหม่ใช้ตัวตนเดิมซ้ำโดยไม่ตั้งใจ
    transaction.set(root.collection("auditLogs").doc(), {
      organizationId, actor, action: "EMPLOYEE_DELETE", entityType: "EMPLOYEE",
      entityId: employeeId, source: "WEB",
      summary: `Soft-deleted employee ${employee.employeeCode}.`,
      before: { employeeCode: employee.employeeCode, workEmail: employee.workEmail, companyId: employee.companyId, isDeleted: false },
      after: { isDeleted: true, accessStatus: EMPLOYEE_ACCESS_STATUS.REVOKED },
      metadata: { linkedUserId: employee.userId ?? null }, createdAt: FieldValue.serverTimestamp(),
    });
  });

  return { id: employeeId, isDeleted: true };
}
