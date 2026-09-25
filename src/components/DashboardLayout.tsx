"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F4F7F6]">
      {/* Desktop: Sidebar takes 80px (w-20) on left */}
      {/* Mobile: Bottom bar takes 64px (h-16) + safe area at bottom */}

      <Sidebar />

      <main className="md:ml-20 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
