import { redirect } from "next/navigation";

import LeaveHrDelegationClient from "@/components/leave/LeaveHrDelegationClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getCompanyList } from "@/services/company/company.service";
import { getEmployeeList } from "@/services/employee/employee.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ผู้ทำหน้าที่ HR แทน | SPJ Work",
};

export default async function LeaveHrDelegationsPage() {
  const session = await requirePermission(
    PERMISSIONS.LEAVE_WORKFLOW_MANAGE,
  ).catch(() => null);

  if (!session) {
    redirect("/manage/leave");
  }

  const [companies, employees] = await Promise.all([
    getCompanyList({
      currentSession: session,
      query: { limit: 100 },
    }),
    getEmployeeList({
      currentSession: session,
      query: {
        status: "ALL",
        search: "",
        limit: 200,
      },
    }),
  ]);

  const access = session.access.membership.companyAccess;

  const visibleCompanies = companies
    .filter(
      (company) =>
        company.status === "ACTIVE" &&
        (access.scope === "ALL" || access.companyIds.includes(company.id)),
    )
    .map((company) => ({
      id: company.id,
      name: company.nameTh || company.code,
      code: company.code,
    }));

  const employeeOptions = employees
    .filter(
      (employee) =>
        employee.userId &&
        employee.employmentStatus === "ACTIVE" &&
        employee.accessStatus === "ACTIVE",
    )
    .map((employee) => ({
      id: employee.id,
      employeeCode: employee.employeeCode,
      displayName: employee.displayName,
      workEmail: employee.workEmail,
    }));

  return (
    <LeaveHrDelegationClient
      companies={visibleCompanies}
      employees={employeeOptions}
    />
  );
}
