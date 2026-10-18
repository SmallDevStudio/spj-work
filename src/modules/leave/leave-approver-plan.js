export const LEAVE_APPROVAL_MODE = Object.freeze({
  ANY_ONE: "ANY_ONE",
  ALL: "ALL",
});

function normalizeIds(ids, requesterId, label) {
  if (!Array.isArray(ids)) {
    throw new Error(`${label}: รายชื่อผู้อนุมัติไม่ถูกต้อง`);
  }

  const result = [];
  const seen = new Set();

  for (const id of ids) {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error(`${label}: รหัสผู้อนุมัติไม่ถูกต้อง`);
    }

    const normalized = id.trim();

    if (normalized === requesterId) {
      throw new Error(`${label}: พนักงานอนุมัติใบลาของตนเองไม่ได้`);
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  if (!result.length) {
    throw new Error(`${label}: ไม่มีผู้อนุมัติ`);
  }

  return result;
}

/**
 * selectedRuleSteps คือขั้นอนุมัติที่ระบบกฎเลือกและแปลงเป็น
 * employee IDs จริงแล้ว
 *
 * null = ไม่มีกฎที่ตรง จึงใช้ข้อมูลพนักงาน
 * [] = กฎมีข้อผิดพลาด ต้องแก้ก่อนส่งใบลา
 */
export function resolveLeaveApprovalPlan({
  employee,
  selectedRuleSteps = null,
}) {
  if (!employee?.id) {
    throw new Error("ไม่พบพนักงานผู้ขอลา");
  }

  if (selectedRuleSteps !== null) {
    if (!Array.isArray(selectedRuleSteps) || !selectedRuleSteps.length) {
      throw new Error("กฎอนุมัติที่เลือกไม่มีขั้นตอน");
    }

    return {
      source: "WORKFLOW_RULE",

      steps: selectedRuleSteps.map((step, index) => {
        const mode = step.approvalMode ?? LEAVE_APPROVAL_MODE.ANY_ONE;

        if (!Object.values(LEAVE_APPROVAL_MODE).includes(mode)) {
          throw new Error(`ขั้นที่ ${index + 1}: โหมดอนุมัติไม่ถูกต้อง`);
        }

        return {
          order: index + 1,
          approvalMode: mode,

          approverEmployeeIds: normalizeIds(
            step.approverEmployeeIds,
            employee.id,
            `ขั้นที่ ${index + 1}`,
          ),

          status: "PENDING",
          decidedByEmployeeId: null,
          decidedAt: null,
          comment: null,
        };
      }),
    };
  }

  const importedIds = employee.defaultLeaveApproverEmployeeIds;

  if (Array.isArray(importedIds) && importedIds.length) {
    return {
      source: "EMPLOYEE_IMPORT",

      steps: [
        {
          order: 1,
          approvalMode: LEAVE_APPROVAL_MODE.ANY_ONE,

          approverEmployeeIds: normalizeIds(
            importedIds,
            employee.id,
            "ข้อมูลพนักงาน",
          ),

          status: "PENDING",
          decidedByEmployeeId: null,
          decidedAt: null,
          comment: null,
        },
      ],
    };
  }

  const departmentManagerId = employee.effectiveManagerEmployeeId;

  if (!departmentManagerId) {
    throw new Error("ยังไม่มีผู้อนุมัติสำหรับพนักงานคนนี้");
  }

  return {
    source: "DEPARTMENT_MANAGER",

    steps: [
      {
        order: 1,
        approvalMode: LEAVE_APPROVAL_MODE.ANY_ONE,

        approverEmployeeIds: normalizeIds(
          [departmentManagerId],
          employee.id,
          "หัวหน้าแผนก",
        ),

        status: "PENDING",
        decidedByEmployeeId: null,
        decidedAt: null,
        comment: null,
      },
    ],
  };
}
