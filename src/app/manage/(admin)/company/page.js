import Link from "next/link";
import { HiArrowLeft } from "react-icons/hi2";

import CompanyDirectoryClient from "@/components/company/CompanyDirectoryClient";

export const metadata = {
  title: "บริษัท | SPJ Work",
};

export default function CompaniesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <HiArrowLeft className="size-4" aria-hidden="true" />
        กลับไปตั้งค่าระบบ
      </Link>

      <div className="mt-7">
        <CompanyDirectoryClient />
      </div>
    </main>
  );
}
