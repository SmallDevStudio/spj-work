import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { ROLES } from "@/constants/roles";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireCurrentSession();

    if (session.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "EMPLOYEE_COMPANY_MIGRATION_DENIED",
        message: "เฉพาะ SUPERADMIN ที่จัดบริษัทให้ข้อมูลเดิมได้",
        status: 403,
      });
    }

    const collection = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id)
      .collection("employees");

    const items = [];
    let cursor = null;

    while (true) {
      let query = collection.orderBy("__name__").limit(100);

      if (cursor) query = query.startAfter(cursor);

      const page = await query.get();

      for (const snapshot of page.docs) {
        const employee = snapshot.data();

        if (employee.isDeleted === true) continue;

        items.push({
          id: snapshot.id,
          employeeCode: employee.employeeCode ?? "",
          displayName:
            employee.displayName ||
            [employee.firstName, employee.lastName].filter(Boolean).join(" "),
          workEmail: employee.workEmail ?? "",
          companyId: employee.companyId ?? null,
        });
      }

      if (items.length > 5000) {
        throw new ApplicationError({
          code: "MIGRATION_LIST_TOO_LARGE",
          message: "มีพนักงานเกิน 5,000 รายการ ต้องใช้การย้ายข้อมูลแบบแบ่งหน้า",
          status: 409,
        });
      }

      cursor = page.docs.at(-1) ?? null;
      if (page.size < 100) break;
    }

    items.sort((a, b) =>
      a.employeeCode.localeCompare(b.employeeCode, "en", {
        numeric: true,
      }),
    );

    return createSuccessResponse({
      items,
      total: items.length,
      unassigned: items.filter((item) => !item.companyId).length,
    });
  } catch (error) {
    return createApiErrorResponse(error, "Employee Company Migration List API");
  }
}
