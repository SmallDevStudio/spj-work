import PortalEmployeeCard from "@/components/portal/PortalEmployeeCard";

export default function PortalHero({
  employee,
  departmentName,
  managerName,
  fallbackName,
  userId,
}) {
  const firstName = (employee?.firstName || fallbackName || "คุณ")
    .trim()
    .split(/\s+/)[0];

  return (
    <section
      aria-label="ภาพรวมข้อมูลของฉัน"
      className="relative isolate overflow-hidden bg-[#f7f9fb] dark:bg-slate-950 xl:min-h-[320px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-cover bg-center xl:block"
        style={{
          backgroundImage: "url('/images/portal-studio.png')",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-gradient-to-r from-white/75 via-white/30 to-transparent xl:block"
      />

      <div className="relative mx-auto w-full max-w-[1536px] px-4 pt-6 pb-2 sm:px-7 sm:pt-8 xl:px-12 xl:py-8">
        <div className="mb-5 xl:hidden">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
            SPJ Work Portal
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            สวัสดี {firstName} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            ขอให้วันนี้เป็นอีกหนึ่งวันที่ดีนะ
          </p>
        </div>

        <div className="xl:max-w-[1120px]">
          <PortalEmployeeCard
            employee={employee}
            departmentName={departmentName}
            managerName={managerName}
            fallbackName={fallbackName}
            userId={userId}
          />
        </div>
      </div>
    </section>
  );
}
