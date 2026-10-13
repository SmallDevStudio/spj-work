"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  HiOutlineBuildingOffice2,
  HiOutlineDevicePhoneMobile,
  HiOutlineEnvelope,
  HiOutlineEye,
  HiOutlineEyeSlash,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineUserGroup,
  HiOutlineXMark,
} from "react-icons/hi2";

import {
  DEFAULT_EMPLOYEE_VALUES,
  EMPLOYEE_ACCESS_STATUS,
  EMPLOYEE_ACCESS_STATUS_LABELS,
  EMPLOYEE_GENDER,
  EMPLOYEE_GENDER_LABELS,
  EMPLOYMENT_STATUS,
  EMPLOYMENT_STATUS_LABELS,
  EMPLOYMENT_TYPE,
  EMPLOYMENT_TYPE_LABELS,
} from "@/constants/employees";
import {
  DEVICE_REQUIREMENT,
  DEVICE_REQUIREMENT_LABELS,
} from "@/constants/onboarding";
import {
  createEmployeeRequest,
  getEmployeeApiErrorMessage,
} from "@/services/hr/employee.api";

function createInitialForm() {
  return {
    employeeCode: "",
    firstName: "",
    lastName: "",
    gender: DEFAULT_EMPLOYEE_VALUES.gender,
    birthDate: "",
    phoneNumber: "",
    positionTitle: "",
    departmentId: "",
    managerEmployeeId: "",
    employeePin: "",
    notes: "",
    employmentType: DEFAULT_EMPLOYEE_VALUES.employmentType,
    employmentStatus: DEFAULT_EMPLOYEE_VALUES.employmentStatus,
    effectiveDate: "",
    role: DEFAULT_EMPLOYEE_VALUES.role,

    submitToIT: true,
    deviceRequirement: DEVICE_REQUIREMENT.NOTEBOOK,
    deviceRequirementNotes: "",
    onboardingNotes: "",
  };
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
        aria-label="เพิ่มพนักงาน"
        className="relative z-10 max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-4xl sm:rounded-[2rem] dark:bg-slate-900"
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
  type = "text",
  placeholder = "",
  min,
  max,
  inputMode,
  pattern,
  autoComplete,
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
        inputMode={inputMode}
        pattern={pattern}
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  required = false,
  children,
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

function EmploymentStatusBadge({ status }) {
  const label = EMPLOYMENT_STATUS_LABELS[status]?.th ?? status;

  const classNames = {
    [EMPLOYMENT_STATUS.ACTIVE]:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    [EMPLOYMENT_STATUS.ONBOARDING]:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    [EMPLOYMENT_STATUS.PRE_HIRE]:
      "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    [EMPLOYMENT_STATUS.SUSPENDED]:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    [EMPLOYMENT_STATUS.TERMINATED]:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    [EMPLOYMENT_STATUS.INACTIVE]:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        classNames[status] ??
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      {label}
    </span>
  );
}

function AccessStatusBadge({ status }) {
  const label = EMPLOYEE_ACCESS_STATUS_LABELS[status]?.th ?? status;

  const active = status === EMPLOYEE_ACCESS_STATUS.ACTIVE;

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

export default function EmployeeDirectoryClient({
  employees,
  departments,
  canCreate,
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [form, setForm] = useState(createInitialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const departmentMap = useMemo(
    () =>
      new Map(
        departments.map((department) => [
          department.id,
          department.nameTh || department.code,
        ]),
      ),
    [departments],
  );

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

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("th");

    return employees.filter((employee) => {
      if (
        departmentFilter !== "ALL" &&
        employee.departmentId !== departmentFilter
      ) {
        return false;
      }

      if (
        statusFilter !== "ALL" &&
        employee.employmentStatus !== statusFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableValues = [
        employee.employeeCode,
        employee.displayName,
        employee.positionTitle,
        employee.workEmail,
        employee.phoneNumber,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLocaleLowerCase("th")
          .includes(normalizedSearch),
      );
    });
  }, [departmentFilter, employees, search, statusFilter]);

  function openDialog() {
    setForm(createInitialForm());
    setFormError("");
    setSuccessMessage("");
    setShowPin(false);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (submitting) {
      return;
    }

    setDialogOpen(false);
    setFormError("");
    setShowPin(false);
  }

  function handleChange(event) {
    const { checked, name, type, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handlePinChange(event) {
    const value = event.target.value.replace(/\D/g, "").slice(0, 4);

    setForm((currentForm) => ({
      ...currentForm,
      employeePin: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setFormError("");

    try {
      const result = await createEmployeeRequest({
        employee: {
          employeeCode: form.employeeCode,
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          birthDate: form.birthDate,
          phoneNumber: form.phoneNumber,
          positionTitle: form.positionTitle,
          departmentId: form.departmentId,
          managerEmployeeId: form.managerEmployeeId || null,
          employeePin: form.employeePin,
          notes: form.notes || null,
          employmentType: form.employmentType,
          employmentStatus: form.employmentStatus,
          effectiveDate: form.effectiveDate,
          workEmail: null,
          role: form.role,
        },
        onboarding: {
          submitToIT: form.submitToIT,
          deviceRequirement: form.deviceRequirement,
          deviceRequirementNotes: form.deviceRequirementNotes || null,
          notes: form.onboardingNotes || null,
        },
      });

      const employeeName =
        result?.employee?.displayName ||
        `${form.firstName} ${form.lastName}`.trim();

      setDialogOpen(false);
      setForm(createInitialForm());
      setShowPin(false);
      setSuccessMessage(
        form.submitToIT
          ? `เพิ่ม ${employeeName} และส่งคำขอไปยังฝ่าย IT แล้ว`
          : `บันทึกข้อมูล ${employeeName} เป็นแบบร่างแล้ว`,
      );

      router.refresh();
    } catch (error) {
      setFormError(getEmployeeApiErrorMessage(error));
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
              Employee Directory
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              ข้อมูลพนักงาน
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              จัดการข้อมูลพนักงาน โครงสร้างผู้บังคับบัญชา และส่งงานเตรียมบัญชี
              กับอุปกรณ์ไปยังฝ่าย IT
            </p>
          </div>

          {canCreate ? (
            <button
              type="button"
              onClick={openDialog}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
            >
              <HiOutlinePlus className="size-5" aria-hidden="true" />
              เพิ่มพนักงาน
            </button>
          ) : null}
        </section>

        {successMessage ? (
          <div
            role="status"
            className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            {successMessage}
          </div>
        ) : null}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              พนักงานทั้งหมด
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              {employees.length}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              อยู่ระหว่าง Onboarding
            </p>
            <p className="mt-2 text-3xl font-black text-amber-600 dark:text-amber-400">
              {
                employees.filter(
                  (employee) =>
                    employee.employmentStatus === EMPLOYMENT_STATUS.ONBOARDING,
                ).length
              }
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ใช้งานระบบแล้ว
            </p>
            <p className="mt-2 text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {
                employees.filter(
                  (employee) =>
                    employee.accessStatus === EMPLOYEE_ACCESS_STATUS.ACTIVE,
                ).length
              }
            </p>
          </article>
        </section>

        <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <label className="relative block">
              <span className="sr-only">ค้นหาพนักงาน</span>
              <HiOutlineMagnifyingGlass
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหารหัส ชื่อ ตำแหน่ง อีเมล หรือเบอร์โทร"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </label>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              aria-label="กรองตามแผนก"
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">ทุกแผนก</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.nameTh}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="กรองตามสถานะ"
              className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">ทุกสถานะ</option>
              {Object.values(EMPLOYMENT_STATUS).map((status) => (
                <option key={status} value={status}>
                  {EMPLOYMENT_STATUS_LABELS[status].th}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <h2 className="font-bold text-slate-950 dark:text-white">
              รายชื่อพนักงาน
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {filteredEmployees.length} รายการ
            </span>
          </div>

          {filteredEmployees.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
              <HiOutlineUserGroup className="mx-auto size-10 text-slate-400" />
              <p className="mt-3 font-semibold text-slate-700 dark:text-slate-300">
                ไม่พบข้อมูลพนักงาน
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {filteredEmployees.map((employee) => (
                <article
                  key={employee.id}
                  className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      <HiOutlineUser className="size-6" aria-hidden="true" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            {employee.employeeCode}
                          </p>
                          <h3 className="mt-1 truncate font-bold text-slate-950 dark:text-white">
                            {employee.displayName}
                          </h3>
                        </div>

                        <EmploymentStatusBadge
                          status={employee.employmentStatus}
                        />
                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {employee.positionTitle}
                      </p>

                      <div className="mt-3 grid gap-2 text-sm text-slate-500 sm:grid-cols-2 dark:text-slate-400">
                        <p className="flex items-center gap-2">
                          <HiOutlineBuildingOffice2 className="size-4 shrink-0" />
                          {departmentMap.get(employee.departmentId) ||
                            "ไม่พบแผนก"}
                        </p>

                        <p className="flex items-center gap-2">
                          <HiOutlineUser className="size-4 shrink-0" />
                          หัวหน้า:{" "}
                          {employee.managerEmployeeId
                            ? employeeMap.get(employee.managerEmployeeId) ||
                              "ไม่พบข้อมูล"
                            : "ยังไม่กำหนด"}
                        </p>

                        <p className="flex items-center gap-2">
                          <HiOutlineEnvelope className="size-4 shrink-0" />
                          <span className="truncate">
                            {employee.workEmail || "รอ IT สร้างอีเมล"}
                          </span>
                        </p>

                        <p className="flex items-center gap-2">
                          <HiOutlineDevicePhoneMobile className="size-4 shrink-0" />
                          {employee.phoneNumber || "-"}
                        </p>
                      </div>

                      <div className="mt-4">
                        <AccessStatusBadge status={employee.accessStatus} />
                      </div>
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
                เพิ่มพนักงาน
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                บันทึกข้อมูลพนักงานและส่งงานเตรียมบัญชีไปยังฝ่าย IT
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

          <form onSubmit={handleSubmit} className="space-y-7 px-5 py-6 sm:px-7">
            {formError ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
              >
                {formError}
              </div>
            ) : null}

            <section>
              <h3 className="font-bold text-slate-950 dark:text-white">
                ข้อมูลส่วนตัวและการจ้างงาน
              </h3>

              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field
                  label="รหัสพนักงาน"
                  name="employeeCode"
                  value={form.employeeCode}
                  onChange={handleChange}
                  placeholder="เช่น SPJ001"
                  required
                />

                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    รหัสเครื่องพิมพ์ 4 หลัก
                    <span className="ml-1 text-red-500">*</span>
                  </span>

                  <div className="relative mt-2">
                    <input
                      type={showPin ? "text" : "password"}
                      name="employeePin"
                      value={form.employeePin}
                      onChange={handlePinChange}
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      autoComplete="new-password"
                      placeholder="0000"
                      className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm tracking-[0.35em] text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPin((current) => !current)}
                      aria-label={showPin ? "ซ่อนรหัส" : "แสดงรหัส"}
                      className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {showPin ? (
                        <HiOutlineEyeSlash className="size-5" />
                      ) : (
                        <HiOutlineEye className="size-5" />
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    ระบบจะเข้ารหัสและไม่แสดงรหัสนี้ในรายชื่อพนักงาน
                  </p>
                </div>

                <Field
                  label="ชื่อ"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />

                <Field
                  label="นามสกุล"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />

                <SelectField
                  label="เพศ"
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  required
                >
                  {Object.values(EMPLOYEE_GENDER).map((gender) => (
                    <option key={gender} value={gender}>
                      {EMPLOYEE_GENDER_LABELS[gender].th}
                    </option>
                  ))}
                </SelectField>

                <Field
                  label="วันเดือนปีเกิด"
                  name="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={handleChange}
                  required
                />

                <Field
                  label="เบอร์โทร"
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  inputMode="tel"
                  placeholder="เช่น 0812345678"
                  required
                />

                <Field
                  label="ตำแหน่ง"
                  name="positionTitle"
                  value={form.positionTitle}
                  onChange={handleChange}
                  placeholder="เช่น Video Editor"
                  required
                />

                <SelectField
                  label="แผนก"
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleChange}
                  required
                >
                  <option value="">เลือกแผนก</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.nameTh} ({department.code})
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="หัวหน้างาน"
                  name="managerEmployeeId"
                  value={form.managerEmployeeId}
                  onChange={handleChange}
                >
                  <option value="">ยังไม่กำหนดหัวหน้างาน</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.employeeCode} — {employee.displayName}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="ประเภทการจ้าง"
                  name="employmentType"
                  value={form.employmentType}
                  onChange={handleChange}
                  required
                >
                  {Object.values(EMPLOYMENT_TYPE).map((type) => (
                    <option key={type} value={type}>
                      {EMPLOYMENT_TYPE_LABELS[type].th}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="สถานะพนักงาน"
                  name="employmentStatus"
                  value={form.employmentStatus}
                  onChange={handleChange}
                  required
                >
                  {Object.values(EMPLOYMENT_STATUS).map((status) => (
                    <option key={status} value={status}>
                      {EMPLOYMENT_STATUS_LABELS[status].th}
                    </option>
                  ))}
                </SelectField>

                <Field
                  label="วันที่มีผล"
                  name="effectiveDate"
                  type="date"
                  value={form.effectiveDate}
                  onChange={handleChange}
                  required
                />
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  หมายเหตุพนักงาน
                </span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </section>

            <section className="border-t border-slate-200 pt-7 dark:border-slate-800">
              <h3 className="font-bold text-slate-950 dark:text-white">
                การเตรียมบัญชีและอุปกรณ์
              </h3>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <input
                  type="checkbox"
                  name="submitToIT"
                  checked={form.submitToIT}
                  onChange={handleChange}
                  className="mt-0.5 size-5 rounded border-slate-300 accent-amber-400"
                />

                <span>
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">
                    ส่งคำขอให้ฝ่าย IT หลังบันทึก
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-400">
                    IT จะได้รับงานสร้าง Domain, อีเมลบริษัท, ผู้ใช้เครื่องพิมพ์
                    และจัดสรรอุปกรณ์
                  </span>
                </span>
              </label>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="อุปกรณ์ที่ต้องการ"
                  name="deviceRequirement"
                  value={form.deviceRequirement}
                  onChange={handleChange}
                  required
                >
                  {Object.values(DEVICE_REQUIREMENT).map((requirement) => (
                    <option key={requirement} value={requirement}>
                      {DEVICE_REQUIREMENT_LABELS[requirement].th}
                    </option>
                  ))}
                </SelectField>

                <Field
                  label={
                    form.deviceRequirement === DEVICE_REQUIREMENT.OTHER
                      ? "รายละเอียดอุปกรณ์"
                      : "รายละเอียดอุปกรณ์เพิ่มเติม"
                  }
                  name="deviceRequirementNotes"
                  value={form.deviceRequirementNotes}
                  onChange={handleChange}
                  required={form.deviceRequirement === DEVICE_REQUIREMENT.OTHER}
                  placeholder="เช่น Notebook สำหรับงานตัดต่อ"
                />
              </div>

              <label className="mt-5 block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  หมายเหตุถึงฝ่าย IT
                </span>
                <textarea
                  name="onboardingNotes"
                  value={form.onboardingNotes}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  placeholder="ข้อมูลเพิ่มเติมสำหรับการเตรียมบัญชีหรืออุปกรณ์"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-300/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
            </section>

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
                  : form.submitToIT
                    ? "บันทึกและส่งให้ IT"
                    : "บันทึกเป็นแบบร่าง"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </>
  );
}
