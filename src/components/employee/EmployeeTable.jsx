"use client";

import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";

import { EMPLOYMENT_STATUS_LABELS } from "@/constants/employees";

export default function EmployeeTable({
  employees,
  allEmployees = employees,
  departments,
  companies,
  showCompany,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  const departmentNames = new Map(
    departments.map((item) => [item.id, item.nameTh]),
  );

  const companyNames = new Map(companies.map((item) => [item.id, item.nameTh]));

  const employeeNames = new Map(
    allEmployees.map((item) => [item.id, item.displayName || item.employeeCode]),
  );

  if (employees.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700">
        ไม่พบข้อมูลพนักงาน
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          <tr>
            <th scope="col" className="px-4 py-4 font-semibold">
              รหัส
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              พนักงาน
            </th>
            {showCompany && (
              <th scope="col" className="px-4 py-4 font-semibold">
                บริษัท
              </th>
            )}
            <th scope="col" className="px-4 py-4 font-semibold">
              แผนก / ตำแหน่ง
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              หัวหน้างาน
            </th>
            <th scope="col" className="px-4 py-4 font-semibold">
              สถานะ
            </th>
            {(canEdit || canDelete) && (
              <th scope="col" className="px-4 py-4 text-right font-semibold">
                จัดการ
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {employees.map((employee) => (
            <tr
              key={employee.id}
              className="text-slate-700 hover:bg-slate-50/70 dark:text-slate-200 dark:hover:bg-slate-800/50"
            >
              <td className="whitespace-nowrap px-4 py-4 font-bold">
                {employee.employeeCode}
              </td>

              <td className="px-4 py-4">
                <p className="font-semibold text-slate-950 dark:text-white">
                  {employee.displayName || "—"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {employee.workEmail || "—"}
                </p>
              </td>

              {showCompany && (
                <td className="px-4 py-4">
                  {companyNames.get(employee.companyId) || "ยังไม่กำหนด"}
                </td>
              )}

              <td className="px-4 py-4">
                <p>
                  {departmentNames.get(employee.departmentId) ||
                    "ยังไม่กำหนดแผนก"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {employee.positionTitle || "—"}
                </p>
              </td>

              <td className="px-4 py-4">
                {employee.effectiveManagerEmployeeId
                  ? employeeNames.get(employee.effectiveManagerEmployeeId) ||
                    "หัวหน้างานอยู่นอกผลลัพธ์"
                  : "ยังไม่กำหนด"}
              </td>

              <td className="px-4 py-4">
                {EMPLOYMENT_STATUS_LABELS[employee.employmentStatus]?.th ||
                  employee.employmentStatus ||
                  "—"}
              </td>

              {(canEdit || canDelete) && (
                <td className="whitespace-nowrap px-4 py-4 text-right">
                  {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onEdit(employee)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    aria-label={`แก้ไข ${employee.displayName || employee.employeeCode}`}
                  >
                    <HiOutlinePencilSquare
                      className="size-4"
                      aria-hidden="true"
                    />
                    แก้ไข
                  </button>
                  ) : null}
                  {canDelete ? (
                    <button type="button" onClick={() => onDelete(employee)}
                      className="ml-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 font-semibold text-rose-700 hover:bg-rose-50"
                      aria-label={`ลบ ${employee.displayName || employee.employeeCode}`}>
                      <HiOutlineTrash className="size-4" aria-hidden="true" />ลบ
                    </button>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
