import "server-only";

import { canAccessCompany } from "@/lib/auth/company-access";
import { ApplicationError } from "@/lib/errors/application-error";
import { leaveOpeningBalanceSchema } from "@/modules/leave/leave-opening-balance.schema";
import { getLeaveOpeningBalancePreviewRecords } from "@/repositories/leave/leave-opening-balance-preview.repository";
import { getEffectiveLeaveTypeVersion } from "@/repositories/leave/leave-type-version.repository";

function periodsOverlap(a, b) {
  return a.periodStart <= b.periodEnd && b.periodStart <= a.periodEnd;
}

function rowError(code, message) {
  return { code, message };
}

export async function previewLeaveOpeningBalances({ currentSession, input }) {
  if (
    !Array.isArray(input?.rows) ||
    input.rows.length < 1 ||
    input.rows.length > 50
  ) {
    throw new ApplicationError({
      code: "LEAVE_OPENING_PREVIEW_SIZE_INVALID",
      message: "กรุณาส่งข้อมูล 1–50 รายการต่อครั้ง",
      status: 400,
    });
  }

  const organizationId = currentSession.access.organization.id;
  const companyAccess = currentSession.access.membership.companyAccess;
  const seen = [];
  const results = [];

  for (let index = 0; index < input.rows.length; index += 1) {
    const parsed = leaveOpeningBalanceSchema.safeParse(input.rows[index]);
    const errors = [];

    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map((issue) =>
          rowError(
            "VALIDATION_ERROR",
            `${issue.path.join(".")}: ${issue.message}`,
          ),
        ),
      );
      results.push({ rowNumber: index + 1, data: null, errors });
      continue;
    }

    const data = parsed.data;

    if (!canAccessCompany(companyAccess, data.companyId)) {
      errors.push(rowError("COMPANY_ACCESS_DENIED", "ไม่มีสิทธิ์ในบริษัทนี้"));
      results.push({ rowNumber: index + 1, data, errors });
      continue;
    }

    const sameScope = seen.filter(
      (prior) =>
        prior.companyId === data.companyId &&
        prior.employeeId === data.employeeId &&
        prior.leaveTypeCode === data.leaveTypeCode,
    );

    if (sameScope.some((prior) => periodsOverlap(prior, data))) {
      errors.push(
        rowError("DUPLICATE_IN_FILE", "รอบวันลาซ้ำหรือทับซ้อนกับแถวก่อนหน้า"),
      );
    }

    seen.push(data);

    const records = await getLeaveOpeningBalancePreviewRecords({
      organizationId,
      companyId: data.companyId,
      employeeId: data.employeeId,
    });

    if (
      !records.company ||
      records.company.isDeleted === true ||
      records.company.status !== "ACTIVE"
    ) {
      errors.push(rowError("COMPANY_NOT_ACTIVE", "บริษัทไม่ได้เปิดใช้งาน"));
    }

    if (
      !records.employee ||
      records.employee.isDeleted === true ||
      records.employee.companyId !== data.companyId
    ) {
      errors.push(
        rowError("EMPLOYEE_COMPANY_MISMATCH", "ไม่พบพนักงานในบริษัทนี้"),
      );
    }

    if (records.ledgerTruncated) {
      errors.push(
        rowError(
          "LEDGER_TOO_LARGE",
          "รายการ ledger มากเกินขนาด Preview ที่รองรับ",
        ),
      );
    } else if (
      records.openingEntries.some(
        (entry) =>
          entry.leaveTypeCode === data.leaveTypeCode &&
          periodsOverlap(entry, data),
      )
    ) {
      errors.push(
        rowError("OPENING_PERIOD_OVERLAP", "มียอดยกมาในรอบวันที่ทับซ้อนแล้ว"),
      );
    }

    if (records.company && records.company.status === "ACTIVE") {
      try {
        await getEffectiveLeaveTypeVersion({
          organizationId,
          companyId: data.companyId,
          code: data.leaveTypeCode,
          onDate: data.cutoverDate,
        });
      } catch (error) {
        if (!(error instanceof ApplicationError)) throw error;
        errors.push(rowError(error.code, error.message));
      }
    }

    results.push({
      rowNumber: index + 1,
      data: {
        ...data,
        employeeCode: records.employee?.employeeCode ?? null,
        employeeName: records.employee?.displayName ?? null,
      },
      errors,
    });
  }

  return {
    total: results.length,
    valid: results.filter((row) => row.errors.length === 0).length,
    invalid: results.filter((row) => row.errors.length > 0).length,
    rows: results,
  };
}
