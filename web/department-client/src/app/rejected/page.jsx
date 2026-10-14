"use client";

import React from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  XCircle,
  LogOut,
  Mail,
  HelpCircle,
  AlertTriangle,
  FileX,
  ShieldAlert,
  Home
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function RejectedPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-rose-500/20 dark:bg-rose-600/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 -translate-y-1/2 rounded-full bg-orange-500/20 dark:bg-orange-600/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-amber-500/20 dark:bg-amber-600/10 blur-3xl animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Top Navbar */}
      <div className="relative z-20 w-full max-w-5xl flex items-center justify-between mb-4">
        <Link 
          href="/" 
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <ThemeToggle className="w-9 h-9 rounded-xl shadow-xs" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl"
      >
        <div className="group relative overflow-hidden rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-1">
          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
              
              {/* Left Column: Header & Student Info */}
              <div className="flex flex-col justify-center border-b border-slate-100 dark:border-white/10 pb-10 lg:col-span-5 lg:border-r lg:border-b-0 lg:pr-10 lg:pb-0">
                <header className="text-center lg:text-left">
                  <motion.div
                    variants={itemVariants}
                    className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-rose-50 dark:bg-rose-950/50 shadow-inner ring-1 ring-rose-200/50 dark:ring-rose-800/50 lg:mx-0"
                  >
                    <XCircle className="relative z-10 h-10 w-10 text-rose-500 dark:text-rose-400" />
                  </motion.div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/60 text-xs font-bold text-rose-600 dark:text-rose-400 mb-3 shadow-xs">
                    <span>Registration Review Completed</span>
                  </div>

                  <motion.h1
                    variants={itemVariants}
                    className="bg-gradient-to-r from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl"
                  >
                    Access Denied
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="mt-3 text-sm sm:text-base leading-relaxed font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Hi <span className="font-bold text-rose-600 dark:text-rose-400">{user?.name || "there"}</span>, your application for department portal access was declined by the administrator.
                  </motion.p>
                </header>

                <motion.div variants={itemVariants} className="mt-8 space-y-3.5">
                  <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 ring-1 ring-slate-100 dark:ring-white/10 transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 shadow-sm">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Registered Email
                      </p>
                      <p className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {user?.email || "Account on file"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 ring-1 ring-slate-100 dark:ring-white/10 transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 shadow-sm">
                      <FileX className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Status
                      </p>
                      <p className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                        Registration Not Approved
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Reason & Actions */}
              <div className="flex flex-col justify-between gap-6 lg:col-span-7">
                <motion.div
                  variants={itemVariants}
                  className="rounded-[2rem] bg-rose-50/60 dark:bg-rose-950/20 p-6 sm:p-8 shadow-sm ring-1 ring-rose-200/60 dark:ring-rose-800/40"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-rose-200/60 dark:bg-rose-800/60"></div>
                    <h3 className="text-[11px] font-bold tracking-[0.3em] text-rose-600 dark:text-rose-400 uppercase">
                      Application Feedback
                    </h3>
                    <div className="h-px flex-1 bg-rose-200/60 dark:bg-rose-800/60"></div>
                  </div>

                  <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 ring-4 ring-white dark:ring-slate-900">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Review Outcome
                        </h4>
                        <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                          Your profile or roll credentials could not be verified against official university department enrollment records. This might be due to an incorrect roll number, session mismatch, or duplicate registration.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 ring-1 ring-rose-200/50 dark:ring-rose-800/30">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                        <p className="text-[10px] font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">
                          Next Steps
                        </p>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                        Please reach out to the CSE Department Administration office with your student identity card to resolve the discrepancies or register again with accurate details.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Actions Row */}
                <motion.footer
                  variants={itemVariants}
                  className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-100 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Admin Office Support
                      </p>
                      <a
                        href="mailto:admin@cse.edu"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 transition-colors hover:underline"
                      >
                        admin@cse.edu
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </motion.footer>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Caption */}
        <p className="mt-8 text-center text-xs font-bold tracking-[0.3em] text-slate-400 dark:text-slate-600 uppercase">
          CSE Department Management System • Identity Verification
        </p>
      </motion.div>
    </div>
  );
}
