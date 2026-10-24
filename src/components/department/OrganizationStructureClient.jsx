"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBuildingOffice2,
  HiOutlinePlus,
  HiOutlineUser,
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
        <section className="flex flex-col gap-5 rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-400">
              Organization Structure
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              ข้อมูลแผนก
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              จัดการแผนกและหัวหน้าแผนก
              ซึ่งระบบจะนำไปใช้เป็นหัวหน้างานเริ่มต้นของพนักงาน
            </p>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={openDialog}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <HiOutlinePlus className="size-5" aria-hidden="true" />
              เพิ่มแผนก
            </button>
          ) : null}
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Department
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                แผนกทั้งหมด
              </h2>
            </div>

            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              {departments.length} แผนก
            </span>
          </div>

          {departments.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <HiOutlineBuildingOffice2
                  className="size-7"
                  aria-hidden="true"
                />
              </div>

              <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                ยังไม่มีข้อมูลแผนก
              </h3>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                เริ่มต้นด้วยการเพิ่มแผนกแรกของบริษัท
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {departments.map((department) => (
                <article
                  key={department.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
                      <HiOutlineBuildingOffice2
                        className="size-5"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={department.status} />

                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => openEditDialog(department)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-300"
                        >
                          <HiOutlinePencilSquare
                            className="size-4"
                            aria-hidden="true"
                          />
                          แก้ไข
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                    {department.nameTh}
                  </h3>

                  <p className="mt-3 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {department.description || "ยังไม่มีรายละเอียดแผนก"}
                  </p>

                  <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      หัวหน้าแผนก
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <HiOutlineUser
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />

                      <span className="truncate">
                        {department.managerEmployeeId
                          ? employeeMap.get(department.managerEmployeeId) ||
                            "ไม่พบข้อมูลพนักงาน"
                          : "ยังไม่กำหนด"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
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
