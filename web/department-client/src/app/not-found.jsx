"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Home, 
  ArrowLeft, 
  LayoutDashboard, 
  SearchX, 
  GraduationCap, 
  Compass, 
  FileQuestion,
  Sparkles,
  HelpCircle,
  Bell
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Background Dynamic Ambient Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[15%] h-[350px] w-[350px] rounded-full bg-indigo-300 dark:bg-indigo-900/30 blur-[130px] opacity-60 dark:opacity-40 animate-pulse"></div>
        <div className="absolute bottom-[15%] right-[15%] h-[400px] w-[400px] rounded-full bg-purple-300 dark:bg-purple-900/30 blur-[140px] opacity-60 dark:opacity-40 animate-pulse" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-[40%] right-[30%] h-[300px] w-[300px] rounded-full bg-pink-200 dark:bg-pink-900/20 blur-[120px] opacity-40 dark:opacity-20 animate-pulse" style={{ animationDelay: "4s" }}></div>
      </div>

      {/* Main Glassmorphic 404 Card */}
      <div className="relative z-10 max-w-xl w-full mx-auto rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-8 sm:p-12 text-center animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Top Department Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-6 shadow-sm">
          <GraduationCap className="w-4 h-4" />
          <span>CSE Department Portal System</span>
        </div>

        {/* 404 Visual Icon Cluster */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="h-full w-full rounded-[22px] bg-white dark:bg-slate-900 flex items-center justify-center relative overflow-hidden">
              <SearchX className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-pink-500/10 pointer-events-none" />
            </div>
          </div>
          {/* Floating Accents */}
          <div className="absolute -top-2 -right-2 p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-md animate-bounce" style={{ animationDuration: "3s" }}>
            <FileQuestion className="w-4 h-4" />
          </div>
          <div className="absolute -bottom-2 -left-2 p-2 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-md animate-bounce" style={{ animationDuration: "2.5s", animationDelay: "1s" }}>
            <Compass className="w-4 h-4" />
          </div>
        </div>

        {/* 404 Headline */}
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 drop-shadow-sm select-none">
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white mt-2 mb-3 tracking-tight">
          Page or Academic Record Not Found
        </h2>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto mb-8">
          The requested syllabus, department portal route, or administrative URL could not be located. It might have been updated, relocated, or requires specific role credentials.
        </p>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <button
            onClick={handleGoBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-500/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>

          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 text-purple-700 dark:text-purple-300 text-sm font-bold transition-all border border-purple-200 dark:border-purple-800 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Quick Directory Links */}
        <div className="mt-8 pt-6 border-t border-slate-200/70 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold uppercase tracking-wider block mb-3 text-slate-400 dark:text-slate-500">
            Quick Navigation
          </span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link 
              href="/login" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
            >
              Sign In Portal
            </Link>
            <span>•</span>
            <Link 
              href="/register" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
            >
              Student Registration
            </Link>
            <span>•</span>
            <Link 
              href="/#notices" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
            >
              Notice Board
            </Link>
            <span>•</span>
            <Link 
              href="/dashboard/admin" 
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors underline-offset-4 hover:underline"
            >
              Admin Board
            </Link>
          </div>
        </div>
      </div>

      {/* Subtle Bottom System Watermark */}
      <div className="relative z-10 mt-8 text-center text-xs text-slate-400 dark:text-slate-600">
        Department Management System v2.0 • Computer Science & Engineering
      </div>
    </div>
  );
}
