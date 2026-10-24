import { redirect } from "next/navigation";

import LeaveHrTakeoverClient from "@/components/leave/LeaveHrTakeoverClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getCompanyList } from "@/services/company/company.service";
import { getEmployeeList } from "@/services/employee/employee.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "โอนงาน HR ค้าง | SPJ Work",
};

export default async function LeaveHrTakeoverPage() {
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

  return (
    <LeaveHrTakeoverClient
      companies={companies
        .filter(
          (company) =>
            company.status === "ACTIVE" &&
            (access.scope === "ALL" || access.companyIds.includes(company.id)),
        )
        .map((company) => ({
          id: company.id,
          name: company.nameTh || company.code,
        }))}
      employees={employees.map((employee) => ({
        id: employee.id,
        code: employee.employeeCode,
        name:
          employee.displayName ||
          [employee.firstName, employee.lastName].filter(Boolean).join(" "),
        email: employee.workEmail,
        linked: Boolean(employee.userId),
      }))}
    />
  );
}
