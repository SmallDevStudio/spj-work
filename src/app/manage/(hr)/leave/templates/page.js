import { redirect } from "next/navigation";

import LeaveTemplateClient from "@/components/leave/LeaveTemplateClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { listCompanies } from "@/repositories/company/company.repository";

export const metadata = {
  title: "Leave Templates | SPJ Work",
};

export default async function LeaveTemplatesPage() {
  const session = await requirePermission(PERMISSIONS.HR_SETTINGS_READ).catch(
    () => null,
  );

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
      <LeaveTemplateClient
        companies={companies}
        canManage={session.access.permissions.includes(
          PERMISSIONS.LEAVE_POLICY_MANAGE,
        )}
      />
    </main>
  );
}
