"use client";

import { useState } from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children, session, workspace = "me" }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
