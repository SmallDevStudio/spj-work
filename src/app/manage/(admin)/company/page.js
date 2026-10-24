import CompanyDirectoryClient from "@/components/company/CompanyDirectoryClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อมูลบริษัท | SPJ Work" };

export default async function CompaniesPage() {
  const session = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
  return <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
    <CompanyDirectoryClient canManageSchedule={session.access.permissions.includes(PERMISSIONS.HR_SETTINGS_MANAGE)} />
  </main>;
}
