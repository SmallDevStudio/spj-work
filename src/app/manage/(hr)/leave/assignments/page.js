import { redirect } from "next/navigation";

import LeaveTemplateAssignmentClient from "@/components/hr/LeaveTemplateAssignmentClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { listCompanies } from "@/repositories/company/company.repository";

export const metadata = {
  title: "มอบ Leave Template | SPJ Work",
};

export default async function LeaveAssignmentsPage() {
  const session = await requirePermission(
    PERMISSIONS.LEAVE_BALANCE_MANAGE,
  ).catch(() => null);

  if (!session) redirect("/manage");

  const allCompanies = await listCompanies({
    organizationId: session.access.organization.id,
    limit: 100,
  });

  const access = session.access.membership.companyAccess;

  const companies = allCompanies
    .filter(
      (company) =>
        company.status === "ACTIVE" &&
        (access?.scope === "ALL" || access?.companyIds?.includes(company.id)),
    )
    .map((company) => ({
      id: company.id,
      code: company.code,
      nameTh: company.nameTh,
    }));

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <LeaveTemplateAssignmentClient companies={companies} />
    </main>
  );
}
