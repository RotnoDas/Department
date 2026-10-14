"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  Clock,
  LogOut,
  Mail,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Hash,
  GraduationCap,
  RefreshCw,
  Home,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import Loading from "@/components/common/Loading";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function PendingApprovalPage() {
  const router = useRouter();
  const { data: sessionData, isPending: isSessionLoading } = authClient.useSession();
  const [student, setStudent] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const user = sessionData?.user;

  const fetchStudentStatus = async (showFeedback = false) => {
    const targetEmail = user?.email || (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("email") : null);
    if (!targetEmail) {
      setIsLoadingProfile(false);
      return;
    }

    if (showFeedback) setIsChecking(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/students/email/${targetEmail}`);
      if (res.ok) {
        const data = await res.json();
        setStudent(data);

        if (data.status === "approved") {
          toast.success("Account Approved! Redirecting to student dashboard...");
          setTimeout(() => {
            router.push("/dashboard/student");
          }, 1200);
          return;
        }

        if (data.status === "rejected") {
          router.push("/rejected");
          return;
        }

        if (showFeedback) {
          toast("Status: Still Pending Administrator Approval.", { icon: "⏳" });
        }
      }
    } catch (e) {
      console.error("Error checking student approval status:", e);
      if (showFeedback) toast.error("Could not reach verification server. Please retry.");
    } finally {
      setIsLoadingProfile(false);
      if (showFeedback) setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchStudentStatus();
  }, [user?.email, isSessionLoading]);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  if (isSessionLoading && isLoadingProfile && !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#030712]">
        <Loading text="Verifying Clearance..." subtext="Checking student authorization records" fullScreen />
      </div>
    );
  }

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

  const activeEmail = student?.email || user?.email || "Student Account";
  const activeName = student?.name || user?.name || "Student";
  const activeStudentId = student?.studentId || "Verification Pending";
  const activeBatch = student?.batch ? `Batch ${student.batch}` : "CSE Department";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4 sm:p-6 bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 -translate-y-1/2 rounded-full bg-indigo-500/20 dark:bg-indigo-600/10 blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute -bottom-24 left-1/4 h-96 w-96 rounded-full bg-orange-400/20 dark:bg-orange-500/10 blur-3xl animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Top Navbar actions */}
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
              
              {/* Left Column: Header & Student Profile */}
              <div className="flex flex-col justify-center border-b border-slate-100 dark:border-white/10 pb-10 lg:col-span-5 lg:border-r lg:border-b-0 lg:pr-10 lg:pb-0">
                <header className="text-center lg:text-left">
                  <motion.div
                    variants={itemVariants}
                    className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-amber-50 dark:bg-amber-950/50 shadow-inner ring-1 ring-amber-200/50 dark:ring-amber-800/50 lg:mx-0"
                  >
                    <div className="absolute inset-0 rounded-[1.75rem] bg-amber-400/20 dark:bg-amber-400/10 animate-pulse" />
                    <Clock className="relative z-10 h-10 w-10 text-amber-500 dark:text-amber-400" />
                  </motion.div>

                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-xs font-bold text-amber-600 dark:text-amber-400 mb-3 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <span>Account Verification In Progress</span>
                  </div>

                  <motion.h1
                    variants={itemVariants}
                    className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 dark:from-amber-400 dark:via-orange-400 dark:to-amber-300 bg-clip-text text-3xl font-black tracking-tight text-transparent md:text-4xl"
                  >
                    Approval Pending
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="mt-3 text-sm sm:text-base leading-relaxed font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Hi <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeName}</span>! Your student registration is currently pending approval by the department administrator.
                  </motion.p>
                </header>

                <motion.div variants={itemVariants} className="mt-8 space-y-3.5">
                  <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 ring-1 ring-slate-100 dark:ring-white/10 transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Registered Email
                      </p>
                      <p className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 ring-1 ring-slate-100 dark:ring-white/10 transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-sm">
                      <Hash className="h-4 w-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Roll / Student ID
                      </p>
                      <p className="truncate font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {activeStudentId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 ring-1 ring-slate-100 dark:ring-white/10 transition-all hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shadow-sm">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                        Academic Department
                      </p>
                      <p className="text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                        CSE • {activeBatch}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: Verification Progress & Actions */}
              <div className="flex flex-col justify-between gap-6 lg:col-span-7">
                {/* Timeline Section */}
                <motion.div
                  variants={itemVariants}
                  className="rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/40 p-6 sm:p-8 shadow-sm ring-1 ring-slate-100 dark:ring-white/10"
                >
                  <div className="mb-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/60"></div>
                    <h3 className="text-[11px] font-bold tracking-[0.3em] text-slate-400 dark:text-slate-500 uppercase">
                      Verification Flow
                    </h3>
                    <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-700/60"></div>
                  </div>

                  <div className="relative space-y-6 px-2 sm:px-6 before:absolute before:top-2 before:bottom-2 before:left-[23px] sm:before:left-[39px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    
                    {/* Step 1: Registered */}
                    <div className="relative flex items-start gap-4 sm:gap-6">
                      <div className="relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-white dark:ring-slate-900">
                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Registration Submitted
                        </h4>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Credentials and student profile details registered in system
                        </p>
                      </div>
                    </div>

                    {/* Step 2: In Review */}
                    <div className="relative flex items-start gap-4 sm:gap-6">
                      <div className="relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20 ring-4 ring-white dark:ring-slate-900">
                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
                      </div>
                      <div className="pt-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Department Admin Review
                        </h4>
                        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Awaiting authorization and roll number confirmation
                        </p>
                        <div className="mt-2 inline-flex items-center gap-2">
                          <span className="inline-flex items-center rounded-lg bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-300 uppercase">
                            STATUS: UNDER MODERATION
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Locked */}
                    <div className="relative flex items-start gap-4 sm:gap-6">
                      <div className="relative z-10 flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 ring-4 ring-white dark:ring-slate-900">
                        <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <div className="pt-1 opacity-50">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Full Student Portal Unlocked
                        </h4>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                          Semester 1-8 courses, GPS attendance, and notice feeds
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Bottom Actions Row */}
                <motion.footer
                  variants={itemVariants}
                  className="mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-100 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => fetchStudentStatus(true)}
                      disabled={isChecking}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`} />
                      <span>{isChecking ? "Checking..." : "Check Status Now"}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={handleSignOut}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 text-xs font-bold transition-all border border-rose-200 dark:border-rose-800 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.footer>

                {/* Contact Help */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Need urgent clearance? Contact department admin at</span>
                  <a href="mailto:admin@cse.edu" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                    admin@cse.edu
                  </a>
                </div>
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
