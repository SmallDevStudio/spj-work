import ManagePageHero from "@/components/layout/ManagePageHero";
import { PERMISSIONS } from "@/constants/permissions";
import { requireAnyPermission } from "@/lib/auth/authorization";

export const metadata = { title: "รายงาน | SPJ Work" };

export default async function ReportsPage() {
  await requireAnyPermission([PERMISSIONS.LEAVE_REPORT_READ, PERMISSIONS.ORGANIZATION_MANAGE]);
  return <main className="mx-auto w-full max-w-7xl"><ManagePageHero eyebrow="Reports" title="รายงาน" description="พื้นที่รวมรายงานของระบบ จะเพิ่มตัวเลือกและการส่งออกข้อมูลเมื่อแต่ละ module พร้อมใช้งาน" /></main>;
}
