import { redirect } from "next/navigation";

import PortalShell from "@/components/layout/PortalShell";
import PortalHero from "@/components/portal/PortalHero";
import PortalSections from "@/components/portal/PortalSections";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { getAvailableServices } from "@/constants/services";
import { requirePermission } from "@/lib/auth/authorization";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { getDepartmentById } from "@/repositories/department/organization-structure.repository";
import StoreProvider from "@/providers/StoreProvider";

export const metadata = {
  title: "SPJ Work Portal",
};

export default async function HomePage() {
  const currentSession = await requirePermission(
    PERMISSIONS.PORTAL_ACCESS,
  ).catch(() => null);

  if (!currentSession) {
    redirect(ROUTES.LOGIN);
  }

  const { identity, access } = currentSession;
  const organizationId = access.organization.id;
  const employeeId = access.membership.employeeId;

  const employee = employeeId
    ? await getEmployeeById({ organizationId, employeeId })
    : null;

  const [department, manager] = await Promise.all([
    employee?.departmentId
      ? getDepartmentById({
          organizationId,
          departmentId: employee.departmentId,
        })
      : Promise.resolve(null),

    employee?.effectiveManagerEmployeeId &&
    employee.effectiveManagerEmployeeId !== employee.id
      ? getEmployeeById({
          organizationId,
          employeeId: employee.effectiveManagerEmployeeId,
        })
      : Promise.resolve(null),
  ]);

  const initialSession = {
    initialized: true,
    authenticated: true,
    user: identity,
    employee: null,
    organization: access.organization,
    role: access.membership.role,
    permissions: access.permissions,
  };

  const services = getAvailableServices(access.permissions);

  return (
    <StoreProvider initialSession={initialSession}>
      <PortalShell session={initialSession}>
        <main>
          <PortalHero
            employee={employee}
            departmentName={department?.nameTh ?? null}
            managerName={manager?.displayName ?? null}
            fallbackName={identity.name ?? identity.email}
            userId={identity.uid}
          />

          <div className="mx-auto w-full max-w-[1536px] px-4 sm:px-7 xl:px-12">
            <PortalSections services={services} />
          </div>
        </main>
      </PortalShell>
    </StoreProvider>
  );
}
