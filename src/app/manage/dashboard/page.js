import ManagePageHero from "@/components/layout/ManagePageHero";

export const metadata = { title: "Dashboard | SPJ Work" };

export default function ManageDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-7xl">
      <ManagePageHero
        eyebrow="Management Dashboard"
        title="Dashboard"
        description="ภาพรวมข้อมูลและรายงานของบริษัทที่คุณมีสิทธิ์เข้าถึง"
      />
    </main>
  );
}
