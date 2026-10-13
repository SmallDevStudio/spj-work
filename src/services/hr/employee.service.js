import "server-only";

import { z } from "zod";

import { ALL_EMPLOYMENT_STATUSES } from "@/constants/employees";
import { ApplicationError } from "@/lib/errors/application-error";
import { formatEmployeeValidationErrors } from "@/lib/validation/employee.schema";
import {
  employeeWithOnboardingCreateSchema,
  formatOnboardingValidationErrors,
} from "@/lib/validation/onboarding.schema";
import { createEmployeeAndOnboarding } from "@/repositories/hr/employee-onboarding.repository";
import { listEmployees } from "@/repositories/hr/employee.repository";

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
    .sort(sortEmployees);
}

export async function addEmployee({ currentSession, input }) {
  const validationResult = employeeWithOnboardingCreateSchema.safeParse(input);

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลพนักงานหรือ Onboarding ไม่ถูกต้อง",
      status: 400,
      details: formatOnboardingValidationErrors(validationResult.error),
    });
  }

  return createEmployeeAndOnboarding({
    organizationId: currentSession.access.organization.id,
    employeeInput: validationResult.data.employee,
    onboardingInput: validationResult.data.onboarding,
    actor: createActor(currentSession),
  });
}
