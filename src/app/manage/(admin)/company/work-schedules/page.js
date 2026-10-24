import CompanyWorkScheduleClient from "@/components/company/CompanyWorkScheduleClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { readCompanyWorkSchedules } from "@/services/company/company-work-schedule.service";
import { listWorkScheduleCompanyOptions } from "@/services/company/company-work-schedule-options.service";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage() {
  const currentSession = await requirePermission(
    PERMISSIONS.HR_SETTINGS_MANAGE,
  );

  const companies = await listWorkScheduleCompanyOptions({
    currentSession,
  });

  const initialCompanyId = companies[0]?.id ?? null;

  const initialHistory = initialCompanyId
    ? await readCompanyWorkSchedules({
        currentSession,
        companyId: initialCompanyId,
      })
    : null;

  return (
    <CompanyWorkScheduleClient
      companies={companies}
      initialCompanyId={initialCompanyId}
      initialHistory={initialHistory}
    />
  );
}
