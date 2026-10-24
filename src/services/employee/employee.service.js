import "server-only";

import { z } from "zod";

import { ALL_EMPLOYMENT_STATUSES } from "@/constants/employees";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  employeeCreateSchema,
  formatEmployeeValidationErrors,
} from "@/modules/employee/employee.schema";
import {
  createEmployee,
  listEmployees,
  updateEmployee,
} from "@/repositories/employee/employee.repository";

import { PERMISSIONS } from "@/constants/permissions";
import { canAccessCompany } from "@/lib/auth/company-access";
import { getEmployeeById } from "@/repositories/employee/employee.repository";
import { softDeleteEmployee } from "@/repositories/employee/employee-delete.repository";

const employeeListQuerySchema = z.object({
  status: z
    .enum(["ALL", ...ALL_EMPLOYMENT_STATUSES], {
      errorMap: () => ({
        message: "ตัวกรองสถานะพนักงานไม่ถูกต้อง",
      }),
    })
    .default("ALL"),

  departmentId: z.string().trim().max(128, "รหัสแผนกไม่ถูกต้อง").optional(),

  search: z
    .string()
    .trim()
    .max(100, "คำค้นหาต้องไม่เกิน 100 ตัวอักษร")
    .default(""),

  limit: z.coerce.number().int().min(1).max(200).default(100),
});

function normalizeSearchValue(value) {
  return value?.trim().toLocaleLowerCase("th") ?? "";
}

function employeeMatchesSearch(employee, search) {
  if (!search) {
    return true;
  }

  const values = [
    employee.employeeCode,
    employee.firstName,
    employee.lastName,
    employee.displayName,
    employee.positionTitle,
    employee.workEmail,
    employee.phoneNumber,
  ];

  return values.some((value) => normalizeSearchValue(value).includes(search));
}

function sortEmployees(firstEmployee, secondEmployee) {
  return (firstEmployee.employeeCode ?? "").localeCompare(
    secondEmployee.employeeCode ?? "",
    "en",
    {
      numeric: true,
      sensitivity: "base",
    },
  );
}

function createActor(currentSession) {
  return {
    uid: currentSession.identity.uid,
    email: currentSession.identity.email,
    role: currentSession.access.membership.role,
  };
}

function applyEmployeeFieldPermissions(employee, currentSession) {
  const canReadPrinterCode = currentSession.access.permissions.includes(
    PERMISSIONS.PRINTER_CODE_READ,
  );

  if (canReadPrinterCode) {
    return employee;
  }

  const { printerCode, ...safeEmployee } = employee;

  return safeEmployee;
}

export async function getEmployeeList({ currentSession, query }) {
  const validationResult = employeeListQuerySchema.safeParse(query);

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "INVALID_QUERY",
      message: "ตัวกรองข้อมูลพนักงานไม่ถูกต้อง",
      status: 400,
      details: formatEmployeeValidationErrors(validationResult.error),
    });
  }

  const filters = validationResult.data;

  const employees = await listEmployees({
    organizationId: currentSession.access.organization.id,
    limit: filters.limit,
    companyAccess: currentSession.access.membership.companyAccess,
  });

  const search = normalizeSearchValue(filters.search);

  return employees
    .filter((employee) => {
      if (
        filters.status !== "ALL" &&
        employee.employmentStatus !== filters.status
      ) {
        return false;
      }

      if (
        filters.departmentId &&
        employee.departmentId !== filters.departmentId
      ) {
        return false;
      }

      return employeeMatchesSearch(employee, search);
    })
    .sort(sortEmployees)
    .map((employee) => applyEmployeeFieldPermissions(employee, currentSession));
}

function requireCompanyInScope(currentSession, companyId) {
  if (
    !canAccessCompany(currentSession.access.membership.companyAccess, companyId)
  ) {
    throw new ApplicationError({
      code: "EMPLOYEE_COMPANY_ACCESS_DENIED",
      message: "ไม่มีสิทธิ์เข้าถึงข้อมูลพนักงานของบริษัทนี้",
      status: 403,
    });
  }
}

export async function addEmployee({ currentSession, input }) {
  const validationResult = employeeCreateSchema.safeParse(input);

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลพนักงานไม่ถูกต้อง",
      status: 400,
      details: formatEmployeeValidationErrors(validationResult.error),
    });
  }

  requireCompanyInScope(currentSession, validationResult.data.companyId);

  return createEmployee({
    organizationId: currentSession.access.organization.id,
    employeeInput: validationResult.data,
    actor: createActor(currentSession),
  });
}

export async function updateEmployeeDetails({
  currentSession,
  employeeId,
  input,
}) {
  if (
    typeof employeeId !== "string" ||
    !employeeId.trim() ||
    employeeId.length > 128
  ) {
    throw new ApplicationError({
      code: "INVALID_EMPLOYEE_ID",
      message: "รหัสอ้างอิงพนักงานไม่ถูกต้อง",
      status: 400,
    });
  }

  // ฟอร์มแก้ข้อมูลทั่วไปไม่ใช่ช่องทางเปลี่ยน role
  // รองรับข้อมูลเดิมจาก UI ที่ยังส่ง role มาด้วยโดยไม่ให้
  // role=ADMIN/HR_ADMIN ทำให้ validation ล้มเหลว
  const validationResult = employeeCreateSchema.safeParse({
    ...input,
    role: "EMPLOYEE",
  });

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลพนักงานไม่ถูกต้อง",
      status: 400,
      details: formatEmployeeValidationErrors(validationResult.error),
    });
  }

  const existingEmployee = await getEmployeeById({
    organizationId: currentSession.access.organization.id,
    employeeId: employeeId.trim(),
  });

  if (!existingEmployee || existingEmployee.isDeleted === true) {
    throw new ApplicationError({
      code: "EMPLOYEE_NOT_FOUND",
      message: "ไม่พบข้อมูลพนักงาน",
      status: 404,
    });
  }

  requireCompanyInScope(currentSession, existingEmployee.companyId);
  requireCompanyInScope(currentSession, validationResult.data.companyId);

  return updateEmployee({
    organizationId: currentSession.access.organization.id,
    employeeId: employeeId.trim(),
    employeeInput: validationResult.data,
    actor: createActor(currentSession),
    companyAccess: currentSession.access.membership.companyAccess,
  });
}

export async function removeEmployee({ currentSession, employeeId }) {
  if (typeof employeeId !== "string" || !/^[^/]{1,128}$/.test(employeeId)) {
    throw new ApplicationError({ code: "INVALID_EMPLOYEE_ID", message: "รหัสพนักงานไม่ถูกต้อง", status: 400 });
  }
  return softDeleteEmployee({
    organizationId: currentSession.access.organization.id,
    employeeId,
    companyAccess: currentSession.access.membership.companyAccess,
    actor: createActor(currentSession),
  });
}
