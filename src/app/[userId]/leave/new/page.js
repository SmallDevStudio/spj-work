import { notFound, redirect } from "next/navigation";

import LeaveDraftForm from "@/components/leave/LeaveDraftForm";
import { PERMISSIONS } from "@/constants/permissions";
import { ROUTES } from "@/constants/routes";
import { getUserRoutes } from "@/constants/user-routes";
import { requireOwnEmployeePermission } from "@/lib/auth/authorization";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { listLeaveTypeConfigs } from "@/repositories/leave/leave-type-config.repository";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "เขียนใบลา | SPJ Work",
};

function validDate(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}

export default async function NewLeavePage({ params, searchParams }) {
  const { userId } = await params;

  if (!userId) {
    notFound();
  }

  const currentSession = await requireOwnEmployeePermission({
    userId,
    permission: PERMISSIONS.LEAVE_REQUEST,
  });

  const organizationId = currentSession.access.organization.id;

  const employee = await getEmployeeById({
    organizationId,
    employeeId: currentSession.access.membership.employeeId,
  });

  if (
    !employee ||
    employee.isDeleted === true ||
    employee.userId !== userId ||
    !employee.companyId
  ) {
    redirect(ROUTES.HOME);
  }

  const leaveTypes = await listLeaveTypeConfigs({
    organizationId,
    companyId: employee.companyId,
  });

  const options = leaveTypes
    .filter((item) => item.status === "ACTIVE" && item.isDeleted !== true)
    .map((item) => ({
      code: item.code,
      nameTh: item.nameTh,
      effectiveFrom: item.effectiveFrom,
    }));

  const query = await searchParams;
  const initialDate = validDate(query?.date) ? query.date : "";

  return (
    <LeaveDraftForm
      leaveTypes={options}
      initialDate={initialDate}
      leaveHref={getUserRoutes(userId).LEAVE}
    />
  );
}
