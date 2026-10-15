import { redirect } from "next/navigation";

import OrganizationStructureClient from "@/components/hr/OrganizationStructureClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/auth/authorization";
import { getEmployeeList } from "@/services/hr/employee.service";
import { getDepartmentList } from "@/services/hr/organization-structure.service";

export const metadata = {
  title: "ข้อมูลแผนก",
};

function serializeDepartment(department) {
  return {
    id: department.id,
    nameTh: department.nameTh,
    description: department.description ?? null,
    managerEmployeeId: department.managerEmployeeId ?? null,
    status: department.status,
  };
}

function serializeEmployee(employee) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    displayName:
      employee.displayName ||
      [employee.firstName, employee.lastName].filter(Boolean).join(" "),
    employmentStatus: employee.employmentStatus,
  };
}

export default async function OrganizationStructurePage() {
  const currentSession = await requirePermission(
    PERMISSIONS.DEPARTMENT_READ,
  ).catch(() => null);

  if (!currentSession) {
    redirect("/app");
  }

  const [departments, employees] = await Promise.all([
    getDepartmentList({
      currentSession,
      query: {
        status: "ALL",
        limit: 200,
      },
    }),
    getEmployeeList({
      currentSession,
      query: {
        status: "ALL",
        search: "",
        limit: 200,
      },
    }),
  ]);

  const canManage = currentSession.access.permissions.includes(
    PERMISSIONS.DEPARTMENT_MANAGE,
  );

  return (
    <OrganizationStructureClient
      departments={departments.map(serializeDepartment)}
      employees={employees.map(serializeEmployee)}
      canManage={canManage}
    />
  );
}
