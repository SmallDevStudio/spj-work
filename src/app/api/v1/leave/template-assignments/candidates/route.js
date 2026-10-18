import { PERMISSIONS } from "@/constants/permissions";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requirePermission } from "@/lib/auth/authorization";
import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await requirePermission(PERMISSIONS.LEAVE_BALANCE_MANAGE);

    const companyId = new URL(request.url).searchParams.get("companyId");

    if (!companyId || companyId.length > 128 || companyId.includes("/")) {
      throw new ApplicationError({
        code: "INVALID_COMPANY_ID",
        message: "กรุณาเลือกบริษัท",
        status: 400,
      });
    }

    if (!canAccessCompany(session.access.membership.companyAccess, companyId)) {
      throw new ApplicationError({
        code: "LEAVE_COMPANY_ACCESS_DENIED",
        message: "ไม่มีสิทธิ์เข้าถึงพนักงานบริษัทนี้",
        status: 403,
      });
    }

    const collection = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id)
      .collection("employees");

    const items = [];
    let cursor = null;
    let scanned = 0;

    while (true) {
      let query = collection.orderBy("__name__").limit(100);

      if (cursor) query = query.startAfter(cursor);

      const page = await query.get();
      scanned += page.size;

      if (scanned > 5000) {
        throw new ApplicationError({
          code: "CANDIDATE_LIST_TOO_LARGE",
          message: "ข้อมูลพนักงานเกินขนาดที่หน้านี้รองรับ",
          status: 409,
        });
      }

      for (const snapshot of page.docs) {
        const employee = snapshot.data();

        if (employee.isDeleted === true || employee.companyId !== companyId) {
          continue;
        }

        items.push({
          id: snapshot.id,
          employeeCode: employee.employeeCode ?? "",
          displayName:
            employee.displayName ||
            [employee.firstName, employee.lastName].filter(Boolean).join(" "),
          positionTitle: employee.positionTitle ?? null,
          employmentStatus: employee.employmentStatus ?? null,
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
    });
  } catch (error) {
    return createApiErrorResponse(error, "Leave Template Candidates API");
  }
}
