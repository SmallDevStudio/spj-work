import { redirect } from "next/navigation";

import LeaveHistoryClient from "@/components/leave/LeaveHistoryClient";
import { PERMISSIONS } from "@/constants/permissions";
import { ROLES } from "@/constants/roles";
import { requirePermission } from "@/lib/auth/authorization";
import { getManagedLeaveHistory } from "@/services/leave/leave-history.service";
import { getCompanyList } from "@/services/company/company.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "ประวัติการลา | SPJ Work" };

export default async function LeaveHistoryPage() {
  const session = await requirePermission(PERMISSIONS.LEAVE_READ_ALL).catch(() => null);

  if (!session) redirect("/manage/leave");

  const [initial, allCompanies] = await Promise.all([
    getManagedLeaveHistory({ session, cursor: null, includeDeleted: false }),
    getCompanyList({ currentSession: session, query: { status: "ALL", limit: 100 } }),
  ]);

  const access = session.access.membership.companyAccess;
  const companies = allCompanies.filter((item) =>
    access.scope === "ALL" || access.companyIds.includes(item.id),
  );

  return <LeaveHistoryClient
    initial={initial}
    companies={companies}
    canDelete={[ROLES.SUPERADMIN, ROLES.ADMIN].includes(session.access.membership.role)}
  />;
}
