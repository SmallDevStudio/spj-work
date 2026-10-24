import { redirect } from "next/navigation";

import EmployeeDirectoryClient from "@/components/employee/EmployeeDirectoryClient";
import { PERMISSIONS } from "@/constants/permissions";
import { requireAnyPermission } from "@/lib/auth/authorization";
import { getEmployeeList } from "@/services/employee/employee.service";
import { getDepartmentList } from "@/services/department/organization-structure.service";
import { getCompanyList } from "@/services/company/company.service";

import { ROLES } from "@/constants/roles";

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
    companyId: employee.companyId ?? null,
    departmentId: employee.departmentId,
    managerAssignmentType: employee.managerAssignmentType ?? "DEPARTMENT",
    effectiveManagerEmployeeId: employee.effectiveManagerEmployeeId ?? null,
    effectiveManagerSource: employee.effectiveManagerSource ?? "DEPARTMENT",
    managerEmployeeId: employee.managerEmployeeId ?? null,
    notes: employee.notes ?? null,
    employmentType: employee.employmentType,
    employmentStatus: employee.employmentStatus,
    effectiveDate: employee.effectiveDate,
    workEmail: employee.workEmail ?? null,
    printerCode: employee.printerCode ?? null,
    role: employee.role,
    accessStatus: employee.accessStatus,
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
    managerEmployeeId: department.managerEmployeeId ?? null,
    description: department.description ?? null,
    status: department.status,
  };
}

export default async function EmployeesPage() {
  const currentSession = await requireAnyPermission([
    PERMISSIONS.EMPLOYEE_READ_ALL,
    PERMISSIONS.EMPLOYEE_READ,
  ]).catch(() => null);

  if (!currentSession) {
    redirect("/");
  }

  const [employees, departments, companies] = await Promise.all([
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
    getCompanyList({
      currentSession,
      query: {
        limit: 100,
      },
    }),
  ]);

  const permissions = currentSession.access.permissions;

  const canManageDepartments = permissions.includes(
    PERMISSIONS.DEPARTMENT_MANAGE,
  );

  const canCreate = permissions.includes(PERMISSIONS.EMPLOYEE_CREATE);

  const canEdit =
    permissions.includes(PERMISSIONS.EMPLOYEE_UPDATE) &&
    permissions.includes(PERMISSIONS.PRINTER_CODE_UPDATE);

  const companyAccess = currentSession.access.membership.companyAccess;

  const visibleCompanies =
    companyAccess?.scope === "ALL"
      ? companies
      : companies.filter((company) =>
          companyAccess?.companyIds?.includes(company.id),
        );

  const showCompany =
    currentSession.access.membership.role === ROLES.SUPERADMIN ||
    visibleCompanies.length > 1;

  return (
    <EmployeeDirectoryClient
      employees={employees.map(serializeEmployee)}
      departments={departments.map(serializeDepartment)}
      canCreate={canCreate}
      canEdit={canEdit}
      canManageDepartments={canManageDepartments}
      companies={visibleCompanies}
      showCompany={showCompany}
    />
  );
}
