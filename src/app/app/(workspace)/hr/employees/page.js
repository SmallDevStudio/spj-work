import { redirect } from "next/navigation";

import EmployeeDirectoryClient from "@/components/hr/EmployeeDirectoryClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requireAnyPermission } from "@/lib/auth/authorization";
import { getEmployeeList } from "@/services/hr/employee.service";
import { getDepartmentList } from "@/services/hr/organization-structure.service";

export const metadata = {
  title: "ข้อมูลพนักงาน",
};

function serializeDate(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

function serializeEmployee(employee) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    firstName: employee.firstName,
    lastName: employee.lastName,
    displayName:
      employee.displayName ||
      [employee.firstName, employee.lastName].filter(Boolean).join(" "),
    gender: employee.gender,
    birthDate: employee.birthDate ?? null,
    phoneNumber: employee.phoneNumber ?? null,
    positionTitle: employee.positionTitle,
    departmentId: employee.departmentId,
    managerEmployeeId: employee.managerEmployeeId ?? null,
    notes: employee.notes ?? null,
    employmentType: employee.employmentType,
    employmentStatus: employee.employmentStatus,
    effectiveDate: employee.effectiveDate,
    workEmail: employee.workEmail ?? null,
    role: employee.role,
    accessStatus: employee.accessStatus,
    hasEmployeePin: Boolean(employee.hasEmployeePin),
    createdAt: serializeDate(employee.createdAt),
    updatedAt: serializeDate(employee.updatedAt),
  };
}

function serializeDepartment(department) {
  return {
    id: department.id,
    code: department.code,
    nameTh: department.nameTh,
    nameEn: department.nameEn ?? null,
    status: department.status,
  };
}

export default async function EmployeesPage() {
  const currentSession = await requireAnyPermission([
    PERMISSIONS.EMPLOYEE_READ_ALL,
    PERMISSIONS.EMPLOYEE_READ,
  ]).catch(() => null);

  if (!currentSession) {
    redirect("/app");
  }

  const [employees, departments] = await Promise.all([
    getEmployeeList({
      currentSession,
      query: {
        status: "ALL",
        search: "",
        limit: 200,
      },
    }),
    getDepartmentList({
      currentSession,
      query: {
        status: "ALL",
        limit: 200,
      },
    }),
  ]);

  const permissions = currentSession.access.permissions;

  const canCreate =
    permissions.includes(PERMISSIONS.EMPLOYEE_CREATE) &&
    permissions.includes(PERMISSIONS.EMPLOYEE_PIN_CREATE) &&
    permissions.includes(PERMISSIONS.ONBOARDING_CREATE);

  return (
    <EmployeeDirectoryClient
      employees={employees.map(serializeEmployee)}
      departments={departments.map(serializeDepartment)}
      canCreate={canCreate}
    />
  );
}
