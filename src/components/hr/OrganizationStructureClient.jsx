"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBuildingOffice2,
  HiOutlinePlus,
  HiOutlineXMark,
} from "react-icons/hi2";

import {
  MASTER_DATA_STATUS,
  MASTER_DATA_STATUS_LABELS,
} from "@/constants/organization-structure";
import {
  createDepartmentRequest,
  getApiErrorMessage,
} from "@/services/hr/organization-structure.api";

const initialDepartmentForm = {
  code: "",
  nameTh: "",
  nameEn: "",
  description: "",
  managerEmployeeId: null,
  status: MASTER_DATA_STATUS.ACTIVE,
  sortOrder: 0,
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
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-7 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              เพิ่มแผนก
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              สร้างแผนกใหม่ในโครงสร้างบริษัท
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <HiOutlineXMark className="size-6" aria-hidden="true" />
          </button>
        </div>

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
  type = "text",
  placeholder = "",
  min,
  max,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}

        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

export default function OrganizationStructureClient({
  departments,
  canManage,
}) {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentForm, setDepartmentForm] = useState(initialDepartmentForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function openDialog() {
    setDepartmentForm(initialDepartmentForm);
    setFormError("");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
    setFormError("");
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setDepartmentForm((currentForm) => ({
      ...currentForm,
      [name]: name === "sortOrder" ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      await createDepartmentRequest({
        ...departmentForm,
        nameEn: departmentForm.nameEn || null,
        description: departmentForm.description || null,
      });

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

            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              แผนก
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              จัดการแผนกสำหรับข้อมูลพนักงาน สายบังคับบัญชา
              และขั้นตอนอนุมัติภายในบริษัท
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
                Department Master
              </p>

              <h3 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                แผนกทั้งหมด
              </h3>
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

                    <StatusBadge status={department.status} />
                  </div>

                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    {department.code}
                  </p>

                  <h3 className="mt-2 text-lg font-bold text-slate-950 dark:text-white">
                    {department.nameTh}
                  </h3>

                  {department.nameEn ? (
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {department.nameEn}
                    </p>
                  ) : null}

                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {department.description || "ยังไม่มีรายละเอียด"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {dialogOpen ? (
        <Modal onClose={closeDialog}>
          <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-7">
            {formError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
              >
                {formError}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="รหัสแผนก"
                name="code"
                value={departmentForm.code}
                onChange={handleChange}
                placeholder="เช่น HR"
                required
              />

              <Field
                label="ลำดับการแสดงผล"
                name="sortOrder"
                type="number"
                min={0}
                max={9999}
                value={departmentForm.sortOrder}
                onChange={handleChange}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="ชื่อแผนกภาษาไทย"
                name="nameTh"
                value={departmentForm.nameTh}
                onChange={handleChange}
                placeholder="เช่น ทรัพยากรบุคคล"
                required
              />

              <Field
                label="ชื่อแผนกภาษาอังกฤษ"
                name="nameEn"
                value={departmentForm.nameEn}
                onChange={handleChange}
                placeholder="เช่น Human Resources"
              />
            </div>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                รายละเอียด
              </span>

              <textarea
                name="description"
                value={departmentForm.description}
                onChange={handleChange}
                placeholder="รายละเอียดหน้าที่ของแผนก"
                rows={4}
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
                {submitting ? "กำลังบันทึก..." : "บันทึกแผนก"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
