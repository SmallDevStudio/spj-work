import CompanyDirectoryClient from "@/components/company/CompanyDirectoryClient";
import CompanyWorkScheduleClient from "@/components/company/CompanyWorkScheduleClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readCompanyWorkSchedules } from "@/services/company/company-work-schedule.service";
import { listWorkScheduleCompanyOptions } from "@/services/company/company-work-schedule-options.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "ข้อมูลบริษัท | SPJ Work" };

export default async function CompaniesPage() {
  const session = await requirePermission(PERMISSIONS.ORGANIZATION_MANAGE);
  const canSchedule = session.access.permissions.includes(PERMISSIONS.HR_SETTINGS_MANAGE);
  const companies = canSchedule ? await listWorkScheduleCompanyOptions({ currentSession: session }) : [];
  const initialCompanyId = companies[0]?.id ?? null;
  const initialHistory = initialCompanyId ? await readCompanyWorkSchedules({ currentSession: session, companyId: initialCompanyId }) : null;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-9 px-5 py-8 sm:px-8">
      <CompanyDirectoryClient />
      {canSchedule && <section id="work-schedules" className="scroll-mt-24 border-t border-slate-200 pt-8 dark:border-slate-800">
        <CompanyWorkScheduleClient companies={companies} initialCompanyId={initialCompanyId} initialHistory={initialHistory} />
      </section>}
    </main>
  );
}
