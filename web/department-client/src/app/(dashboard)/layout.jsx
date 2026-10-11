"use client";

import React, { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { Menu, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: sessionData, isPending } = authClient.useSession();
  const user = sessionData?.user;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40 selection:text-indigo-900 dark:selection:text-indigo-200 relative flex flex-col lg:flex-row transition-colors duration-300">
      {/* Background Dynamic Blur Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px] transition-colors duration-300">
        <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-30 dark:opacity-15">
          <div className="w-full h-full rounded-full bg-indigo-200 dark:bg-indigo-800 blur-[150px] animate-blob"></div>
        </div>
        <div className="absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-30 dark:opacity-15">
          <div className="w-full h-full rounded-full bg-sky-200 dark:bg-sky-800 blur-[150px] animate-blob" style={{ animationDelay: "2s" }}></div>
        </div>
        <div className="absolute -bottom-[20%] left-[10%] h-[70%] w-[70%] opacity-25 dark:opacity-10">
          <div className="w-full h-full rounded-full bg-purple-200 dark:bg-purple-800 blur-[150px] animate-blob" style={{ animationDelay: "4s" }}></div>
        </div>
      </div>

      {/* Mobile Topbar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-200">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg text-slate-900 dark:text-white">CSE Department</span>
        </Link>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar Component */}
      <DashboardSidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        user={user} 
      />

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-72 z-10 min-h-screen flex flex-col">
        <div className="flex-1 p-6 md:p-10 max-w-[1400px] w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
