"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, ArrowRight, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";

export default function NoticesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading department notice board...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin" || (user?.email || "").toLowerCase().trim() === "admin@cse.edu";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40 relative">
      <Navbar />

      {/* Dynamic Background Blur Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px]">
        <div className="absolute top-[5%] left-[20%] h-[400px] w-[400px] rounded-full bg-indigo-300/20 dark:bg-indigo-800/20 blur-[130px]" />
        <div className="absolute top-[40%] right-[10%] h-[450px] w-[450px] rounded-full bg-purple-300/20 dark:bg-purple-900/20 blur-[140px]" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto pt-36 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>

        <NoticeBoardSection 
          isAdmin={isAdmin}
          title="Official Department Circulars & Notices"
          subtitle="Real-time circulars, exam schedules, events, and voice announcements for students and faculty."
        />
      </main>

      <Footer />
    </div>
  );
}
