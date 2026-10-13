import { redirect } from "next/navigation";

import OrganizationStructureClient from "@/components/hr/OrganizationStructureClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getDepartmentList } from "@/services/hr/organization-structure.service";

export const metadata = {
  title: "แผนก",
};

function serializeDepartment(department) {
  return {
    id: department.id,
    code: department.code,
    nameTh: department.nameTh,
    nameEn: department.nameEn ?? null,
    description: department.description ?? null,
    managerEmployeeId: department.managerEmployeeId ?? null,
    status: department.status,
    sortOrder: department.sortOrder ?? 0,
  };
}

export default async function OrganizationStructurePage() {
  const currentSession = await requirePermission(
    PERMISSIONS.DEPARTMENT_READ,
  ).catch(() => null);

  if (!currentSession) {
    redirect("/app");
  }

  const departments = await getDepartmentList({
    currentSession,
    query: {
      status: "ALL",
      limit: 200,
    },
  });

  const canManage = currentSession.access.permissions.includes(
    PERMISSIONS.DEPARTMENT_MANAGE,
  );

  return (
    <OrganizationStructureClient
      departments={departments.map(serializeDepartment)}
      canManage={canManage}
    />
  );
}
