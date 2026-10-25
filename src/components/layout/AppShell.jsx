"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children, session, workspace = "hr" }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === "/manage/leave/holidays/print") {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        session={session}
        workspace={workspace}
      />

      <div className="min-h-screen lg:pl-72">
        <Header
          session={session}
          workspace={workspace}
          onOpenSidebar={() => setIsSidebarOpen(true)}
        />

        <div className="p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
