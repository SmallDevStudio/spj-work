import { redirect } from "next/navigation";

import EmployeeAccessRoleClient from "@/components/settings/EmployeeAccessRoleClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { adminFirestore } from "@/lib/firebase/admin";
import { getEmployeeList } from "@/services/employee/employee.service";
import { getCompanyList } from "@/services/company/company.service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "สิทธิ์พนักงาน | SPJ Work",
};

export default async function EmployeeRolesPage() {
  const session = await requirePermission(PERMISSIONS.ROLE_MANAGE).catch(
    () => null,
  );

  if (!session) {
    redirect("/manage");
  }

  const organizationId = session.access.organization.id;

  const [employees, companies] = await Promise.all([
    getEmployeeList({
      currentSession: session,
      query: {
        status: "ALL",
        search: "",
        limit: 200,
      },
    }),
    getCompanyList({
      currentSession: session,
      query: { limit: 100 },
    }),
  ]);

  const membershipSnapshots = await Promise.all(
    employees.map((employee) =>
      employee.userId
        ? adminFirestore
            .collection("organizations")
            .doc(organizationId)
            .collection("memberships")
            .doc(employee.userId)
            .get()
        : Promise.resolve(null),
    ),
  );

  const companyNames = Object.fromEntries(
    companies.map((company) => [
      company.id,
      company.nameTh || company.code || company.id,
    ]),
  );

  const items = employees.map((employee, index) => {
    const membershipSnapshot = membershipSnapshots[index];

    const membership = membershipSnapshot?.exists
      ? membershipSnapshot.data()
      : null;

    const linked = Boolean(employee.userId);

    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      displayName:
        employee.displayName ||
        [employee.firstName, employee.lastName].filter(Boolean).join(" "),
      workEmail: employee.workEmail,
      companyId: employee.companyId,
      companyName:
        companyNames[employee.companyId] ?? employee.companyId ?? "-",
      role: membership?.role ?? employee.role,
      employeeRole: employee.role,
      linked,
      isSelf: employee.userId === session.identity.uid,
      membershipValid:
        !linked ||
        (membership?.status === "ACTIVE" &&
          membership.employeeId === employee.id &&
          membership.isDeleted !== true),
    };
  });

  return <EmployeeAccessRoleClient initialItems={items} />;
}
