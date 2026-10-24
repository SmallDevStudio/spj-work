import { redirect } from "next/navigation";

import LeaveTypeSettingsClient from "@/components/leave/LeaveTypeSettingsClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { listCompanies } from "@/repositories/company/company.repository";

export const metadata = {
  title: "ตั้งค่าประเภทการลา | SPJ Work",
};

export default async function LeaveTypeSettingsPage() {
  const session = await requirePermission(PERMISSIONS.HR_SETTINGS_READ).catch(
    () => null,
  );

  if (!session) redirect("/manage");

  const allCompanies = await listCompanies({
    organizationId: session.access.organization.id,
    limit: 100,
  });

  const companyAccess = session.access.membership.companyAccess;

  const companies = allCompanies
    .filter(
      (company) =>
        company.status === "ACTIVE" &&
        (companyAccess?.scope === "ALL" ||
          companyAccess?.companyIds?.includes(company.id)),
    )
    .map((company) => ({
      id: company.id,
      code: company.code,
      nameTh: company.nameTh,
    }));

  const canManage = session.access.permissions.includes(
    PERMISSIONS.LEAVE_POLICY_MANAGE,
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <LeaveTypeSettingsClient companies={companies} canManage={canManage} />
    </main>
  );
}
