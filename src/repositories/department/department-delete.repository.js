import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export async function softDeleteDepartment({ organizationId, departmentId, actor }) {
  const root = adminFirestore.collection("organizations").doc(organizationId);
  const ref = root.collection("departments").doc(departmentId);
  const employeesQuery = root.collection("employees").where("departmentId", "==", departmentId).limit(501);

  await adminFirestore.runTransaction(async (transaction) => {
    const [snapshot, employees] = await Promise.all([
      transaction.get(ref), transaction.get(employeesQuery),
    ]);
    const current = snapshot.data();
    if (!snapshot.exists || current?.isDeleted === true) throw new ApplicationError({
      code: "DEPARTMENT_NOT_FOUND", message: "ไม่พบข้อมูลแผนก", status: 404,
    });
    if (employees.size > 500 || employees.docs.some((doc) => doc.data().isDeleted !== true)) {
      throw new ApplicationError({
        code: "DEPARTMENT_HAS_EMPLOYEES",
        message: "กรุณาย้ายพนักงานออกจากแผนกก่อนลบ",
        status: 409,
      });
    }
    transaction.update(ref, {
      isDeleted: true, deletedAt: FieldValue.serverTimestamp(), deletedBy: actor.uid,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    transaction.set(root.collection("auditLogs").doc(), {
      organizationId, actor, action: "DEPARTMENT_DELETE", entityType: "DEPARTMENT",
      entityId: departmentId, source: "WEB",
      summary: `Soft-deleted department ${current.nameTh}.`,
      before: { nameTh: current.nameTh, managerEmployeeId: current.managerEmployeeId ?? null, isDeleted: false },
      after: { isDeleted: true }, metadata: null, createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { id: departmentId, isDeleted: true };
}
