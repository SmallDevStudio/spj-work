"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBuildingOffice2,
  HiOutlinePlus,
  HiOutlineMagnifyingGlass,
  HiOutlineXMark,
  HiOutlinePencilSquare,
} from "react-icons/hi2";

import {
  MASTER_DATA_STATUS,
  MASTER_DATA_STATUS_LABELS,
} from "@/constants/organization-structure";
import {
  createDepartmentRequest,
  getApiErrorMessage,
  updateDepartmentRequest,
} from "@/services/department/organization-structure.api";
import ManagePageHero from "@/components/layout/ManagePageHero";

const initialDepartmentForm = {
  nameTh: "",
  description: "",
  managerEmployeeId: "",
};

function StatusBadge({ status }) {
  const active = status === MASTER_DATA_STATUS.ACTIVE;
  const label = MASTER_DATA_STATUS_LABELS[status]?.th ?? status;

  return (
    <span
      className={
        active
          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }
    >
      {label}
    </span>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="เพิ่มแผนก"
        className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[2rem] dark:bg-slate-900"
      >
        {children}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

export default function OrganizationStructureClient({
  departments,
  employees,
  canManage,
}) {
  const router = useRouter();

  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState(initialDepartmentForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const employeeMap = useMemo(
    () =>
      new Map(
        employees.map((employee) => [
          employee.id,
          employee.displayName || employee.employeeCode,
        ]),
      ),
    [employees],
  );

  const filteredDepartments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    return departments.filter((department) => {
      if (statusFilter !== "ALL" && department.status !== statusFilter) return false;
      if (!term) return true;
      const manager = employeeMap.get(department.managerEmployeeId) ?? "";
      return [department.nameTh, department.description, manager].some((value) =>
        String(value ?? "").toLocaleLowerCase("th").includes(term),
      );
    });
  }, [departments, employeeMap, search, statusFilter]);

  function openDialog() {
    setEditingDepartmentId(null);
    setDepartmentForm(initialDepartmentForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(department) {
    setEditingDepartmentId(department.id);

    setDepartmentForm({
      nameTh: department.nameTh ?? "",
      description: department.description ?? "",
      managerEmployeeId: department.managerEmployeeId ?? "",
    });

    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setEditingDepartmentId(null);
    setDialogOpen(false);
    setDepartmentForm(initialDepartmentForm);
    setFormError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setDepartmentForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      const input = {
        nameTh: departmentForm.nameTh,
        description: departmentForm.description.trim() || null,
        managerEmployeeId: departmentForm.managerEmployeeId || null,
      };

      if (editingDepartmentId) {
        await updateDepartmentRequest({
          departmentId: editingDepartmentId,
          input,
        });
      } else {
        await createDepartmentRequest(input);
      }

      setEditingDepartmentId(null);
      setDialogOpen(false);
      setDepartmentForm(initialDepartmentForm);
      router.refresh();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <main className="mx-auto w-full max-w-7xl">
        <ManagePageHero
          eyebrow="Organization Structure"
          title="ข้อมูลแผนก"
          description="จัดการแผนกและหัวหน้าแผนก ซึ่งระบบจะนำไปใช้เป็นหัวหน้างานเริ่มต้นของพนักงาน"
          action={canManage ? (
            <button
              type="button"
              onClick={openDialog}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <HiOutlinePlus className="size-5" aria-hidden="true" />
              เพิ่มแผนก
            </button>
          ) : null}
        />

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
            <label className="relative block">
              <span className="sr-only">ค้นหาแผนก</span>
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาชื่อ รายละเอียด หรือหัวหน้าแผนก"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="กรองตามสถานะแผนก"
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">ทุกสถานะ</option>
              {Object.values(MASTER_DATA_STATUS).map((status) => (
                <option key={status} value={status}>{MASTER_DATA_STATUS_LABELS[status]?.th ?? status}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <h2 className="font-bold text-slate-950 dark:text-white">รายชื่อแผนก</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">{filteredDepartments.length} รายการ</span>
          </div>

          {filteredDepartments.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center text-sm text-slate-500 dark:border-slate-700">
              {departments.length === 0 ? "ยังไม่มีข้อมูลแผนก" : "ไม่พบแผนกที่ตรงกับการค้นหา"}
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  <tr>
                    <th scope="col" className="px-4 py-4 font-semibold">แผนก</th>
                    <th scope="col" className="px-4 py-4 font-semibold">รายละเอียด</th>
                    <th scope="col" className="px-4 py-4 font-semibold">หัวหน้าแผนก</th>
                    <th scope="col" className="px-4 py-4 font-semibold">สถานะ</th>
                    {canManage ? <th scope="col" className="px-4 py-4 text-right font-semibold">จัดการ</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDepartments.map((department) => (
                    <tr key={department.id} className="text-slate-700 hover:bg-slate-50/70 dark:text-slate-200 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{department.nameTh}</td>
                      <td className="max-w-xs px-4 py-4 text-slate-600 dark:text-slate-300">{department.description || "—"}</td>
                      <td className="px-4 py-4">{department.managerEmployeeId ? employeeMap.get(department.managerEmployeeId) || "ไม่พบข้อมูลพนักงาน" : "ยังไม่กำหนด"}</td>
                      <td className="px-4 py-4"><StatusBadge status={department.status} /></td>
                      {canManage ? (
                        <td className="px-4 py-4 text-right">
                          <button type="button" onClick={() => openEditDialog(department)} aria-label={`แก้ไข ${department.nameTh}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold hover:bg-amber-50 dark:border-slate-700 dark:hover:bg-slate-800">
                            <HiOutlinePencilSquare className="size-4" aria-hidden="true" />แก้ไข
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {dialogOpen ? (
        <Modal onClose={closeDialog}>
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                {editingDepartmentId ? "แก้ไขข้อมูลแผนก" : "เพิ่มแผนก"}
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {editingDepartmentId
                  ? "แก้ไขชื่อ รายละเอียด และหัวหน้าแผนก"
                  : "ระบุชื่อ รายละเอียด และหัวหน้าแผนก"}
              </p>
            </div>

            <button
              type="button"
              onClick={closeDialog}
              aria-label="ปิด"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <HiOutlineXMark className="size-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-7">
            {formError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
              >
                {formError}
              </div>
            ) : null}

            <Field
              label="ชื่อแผนก"
              name="nameTh"
              value={departmentForm.nameTh}
              onChange={handleChange}
              placeholder="เช่น บัญชี"
              required
            />

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                หัวหน้าแผนก
              </span>

              <select
                name="managerEmployeeId"
                value={departmentForm.managerEmployeeId}
                onChange={handleChange}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="">ยังไม่กำหนดหัวหน้าแผนก</option>

                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeCode} — {employee.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                รายละเอียด
              </span>

              <textarea
                name="description"
                value={departmentForm.description}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="รายละเอียดหรือหน้าที่ของแผนก"
                className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end dark:border-slate-800">
              <button
                type="button"
                onClick={closeDialog}
                disabled={submitting}
                className="min-h-12 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 rounded-xl bg-amber-400 px-6 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
              >
                {submitting
                  ? "กำลังบันทึก..."
                  : editingDepartmentId
                    ? "บันทึกการแก้ไข"
                    : "บันทึกแผนก"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
