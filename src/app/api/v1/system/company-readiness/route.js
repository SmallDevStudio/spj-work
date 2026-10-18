import { ROLES } from "@/constants/roles";
import {
  createApiErrorResponse,
  createSuccessResponse,
} from "@/lib/api/api-response";
import { requireCurrentSession } from "@/lib/auth/authorization";
import { ApplicationError } from "@/lib/errors/application-error";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

async function readCollection(collection, maxDocuments = 5000) {
  const documents = [];
  let cursor = null;

  while (true) {
    let query = collection.orderBy("__name__").limit(100);

    if (cursor) query = query.startAfter(cursor);

    const page = await query.get();
    documents.push(...page.docs);

    if (documents.length > maxDocuments) {
      throw new ApplicationError({
        code: "COMPANY_READINESS_TOO_LARGE",
        message: "ข้อมูลมีจำนวนมากเกินกว่าหน้าตรวจสอบนี้รองรับ",
        status: 409,
      });
    }

    cursor = page.docs.at(-1) ?? null;
    if (page.size < 100) return documents;
  }
}

export async function GET() {
  try {
    const session = await requireCurrentSession();

    if (session.access.membership.role !== ROLES.SUPERADMIN) {
      throw new ApplicationError({
        code: "COMPANY_READINESS_DENIED",
        message: "เฉพาะ SUPERADMIN ที่ตรวจความพร้อมนี้ได้",
        status: 403,
      });
    }

    const organizationRef = adminFirestore
      .collection("organizations")
      .doc(session.access.organization.id);

    const [employeeDocs, membershipDocs, companyDocs] = await Promise.all([
      readCollection(organizationRef.collection("employees")),
      readCollection(organizationRef.collection("memberships")),
      readCollection(organizationRef.collection("companies")),
    ]);

    const companies = companyDocs
      .filter(
        (snapshot) =>
          snapshot.data()?.isDeleted !== true &&
          snapshot.data()?.status === "ACTIVE",
      )
      .map((snapshot) => ({
        id: snapshot.id,
        code: snapshot.data().code,
        nameTh: snapshot.data().nameTh,
      }));

    const activeCompanyIds = new Set(companies.map((company) => company.id));

    const employees = employeeDocs
      .filter((snapshot) => snapshot.data()?.isDeleted !== true)
      .map((snapshot) => ({
        id: snapshot.id,
        employeeCode: snapshot.data().employeeCode ?? "",
        displayName: snapshot.data().displayName ?? "",
        companyId: snapshot.data().companyId ?? null,
      }));

    const missingCompany = employees.filter((employee) => !employee.companyId);

    const invalidCompany = employees.filter(
      (employee) =>
        employee.companyId && !activeCompanyIds.has(employee.companyId),
    );

    const membershipIssues = membershipDocs
      .filter(
        (snapshot) =>
          snapshot.data()?.isDeleted !== true &&
          snapshot.data()?.status === "ACTIVE" &&
          snapshot.data()?.role !== ROLES.SUPERADMIN,
      )
      .map((snapshot) => {
        const access = snapshot.data().companyAccess;

        if (!access) {
          return { uid: snapshot.id, issue: "ยังไม่กำหนดสิทธิ์บริษัท" };
        }

        if (access.scope === "ALL") return null;

        if (
          access.scope !== "SELECTED" ||
          !Array.isArray(access.companyIds) ||
          access.companyIds.length === 0 ||
          access.companyIds.some(
            (companyId) => !activeCompanyIds.has(companyId),
          )
        ) {
          return {
            uid: snapshot.id,
            issue: "สิทธิ์บริษัทไม่ถูกต้องหรือบริษัทไม่เปิดใช้งาน",
          };
        }

        return null;
      })
      .filter(Boolean);

    return createSuccessResponse({
      ready:
        missingCompany.length === 0 &&
        invalidCompany.length === 0 &&
        membershipIssues.length === 0,
      totals: {
        companies: companies.length,
        employees: employees.length,
        employeesMissingCompany: missingCompany.length,
        employeesWithInvalidCompany: invalidCompany.length,
        membershipsWithIssues: membershipIssues.length,
      },
      missingCompany: missingCompany.slice(0, 100),
      invalidCompany: invalidCompany.slice(0, 100),
      membershipIssues: membershipIssues.slice(0, 100),
    });
  } catch (error) {
    return createApiErrorResponse(error, "Company Readiness API");
  }
}
