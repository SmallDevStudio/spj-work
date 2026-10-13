import "server-only";

import { ORGANIZATION_STRUCTURE_SOURCE } from "@/constants/organization-structure";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  departmentCreateSchema,
  departmentListQuerySchema,
  formatOrganizationStructureValidationErrors,
} from "@/lib/validation/organization-structure.schema";
import {
  createDepartment,
  listDepartments,
} from "@/repositories/hr/organization-structure.repository";

function normalizeSearchValue(value) {
  return value?.trim().toLocaleLowerCase("th") ?? "";
}

function includesSearchValue(record, search) {
  if (!search) {
    return true;
  }

  const searchableValues = [
    record.code,
    record.nameTh,
    record.nameEn,
    record.description,
  ];

  return searchableValues.some((value) =>
    normalizeSearchValue(value).includes(search),
  );
}

function sortDepartments(firstDepartment, secondDepartment) {
  const sortOrderDifference =
    (firstDepartment.sortOrder ?? 0) - (secondDepartment.sortOrder ?? 0);

  if (sortOrderDifference !== 0) {
    return sortOrderDifference;
  }

  return (firstDepartment.nameTh ?? firstDepartment.code).localeCompare(
    secondDepartment.nameTh ?? secondDepartment.code,
    "th",
  );
}

function createActor(currentSession) {
  return {
    uid: currentSession.identity.uid,
    email: currentSession.identity.email,
    role: currentSession.access.membership.role,
  };
}

export async function getDepartmentList({ currentSession, query }) {
  const validationResult = departmentListQuerySchema.safeParse(query);

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "INVALID_QUERY",
      message: "ตัวกรองข้อมูลไม่ถูกต้อง",
      status: 400,
      details: formatOrganizationStructureValidationErrors(
        validationResult.error,
      ),
    });
  }

  const filters = validationResult.data;

  const departments = await listDepartments({
    organizationId: currentSession.access.organization.id,
    limit: filters.limit,
  });

  const search = normalizeSearchValue(filters.search);

  return departments
    .filter((department) => {
      if (filters.status !== "ALL" && department.status !== filters.status) {
        return false;
      }

      return includesSearchValue(department, search);
    })
    .sort(sortDepartments);
}

export async function addDepartment({ currentSession, input }) {
  const validationResult = departmentCreateSchema.safeParse(input);

  if (!validationResult.success) {
    throw new ApplicationError({
      code: "VALIDATION_ERROR",
      message: "ข้อมูลแผนกไม่ถูกต้อง",
      status: 400,
      details: formatOrganizationStructureValidationErrors(
        validationResult.error,
      ),
    });
  }

  return createDepartment({
    organizationId: currentSession.access.organization.id,
    data: {
      ...validationResult.data,
      source: ORGANIZATION_STRUCTURE_SOURCE.MANUAL,
    },
    actor: createActor(currentSession),
  });
}
