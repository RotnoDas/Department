"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  UserCheck, 
  GraduationCap, 
  Layers, 
  Calendar, 
  CheckCircle2, 
  Home, 
  Sparkles 
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";

function LoginRequiredContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("target") || searchParams.get("redirect") || "/dashboard/student";
  const portalName = searchParams.get("portal") || "Departmental Dashboard";

  const { data: sessionData, isPending } = authClient.useSession();
  const user = sessionData?.user;

  // If already logged in, redirect straight to their requested dashboard
  useEffect(() => {
    if (!isPending && user?.email) {
      router.push(redirectTarget);
    }
  }, [user, isPending, redirectTarget, router]);

  const PANELS = [
    {
      title: "Student Portal",
      desc: "Weekly class routine timetable, 10m geofenced face verification check-in, lecture materials & assignments.",
      role: "Enrolled CSE Students",
      icon: GraduationCap,
      href: `/login?redirect=${encodeURIComponent("/dashboard/student")}`,
      color: "from-blue-500 to-indigo-600"
    },
    {
      title: "Faculty Hub",
      desc: "Teaching schedule, course material uploads, live attendance monitors, and assignment evaluation.",
      role: "Department Faculty",
      icon: Calendar,
      href: `/login?redirect=${encodeURIComponent("/dashboard/teacher")}`,
      color: "from-emerald-500 to-teal-600"
    },
    {
      title: "Administrator Console",
      desc: "Student signup approvals, conflict-free routine builder, geofence setup, and grievance resolution desk.",
      role: "System Administrators",
      icon: ShieldAlert,
      href: `/login?redirect=${encodeURIComponent("/dashboard/admin")}`,
      color: "from-purple-500 to-indigo-600"
    },
    {
      title: "Staff & Employee Desk",
      desc: "Laboratory maintenance duties, inventory updates, and official departmental circulars.",
      role: "Support & Lab Staff",
      icon: Layers,
      href: `/login?redirect=${encodeURIComponent("/dashboard/employee")}`,
      color: "from-amber-500 to-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 flex flex-col justify-between relative overflow-hidden transition-colors duration-300">
      {/* Background dynamic blur gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px]">
        <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-30 dark:opacity-15">
          <div className="w-full h-full rounded-full bg-indigo-200 dark:bg-indigo-800 blur-[150px] animate-blob" />
        </div>
        <div className="absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-30 dark:opacity-15">
          <div className="w-full h-full rounded-full bg-sky-200 dark:bg-sky-800 blur-[150px] animate-blob" style={{ animationDelay: "2s" }} />
        </div>
      </div>

      {/* Top Bar */}
      <header className="relative z-10 mx-auto max-w-6xl w-full px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
              PUST CSE Portal
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-1 block">
              Pabna University of Science and Technology
            </span>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 mx-auto max-w-3xl w-full px-4 sm:px-6 py-8 my-auto">
        <div className="rounded-[2.5rem] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-10 space-y-8">
          
          {/* Header Banner */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <ShieldAlert className="w-3.5 h-3.5" />
                Access Restricted • Login Required
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Authentication Required for {portalName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                You attempted to open a restricted departmental portal. To view schedules, participate in active biometric face attendance, or access course modules, please sign in with your authorized account.
              </p>
            </div>
          </div>

          {/* Quick Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 px-7 h-12 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Sign In to Continue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-6 h-12 rounded-xl border border-slate-200/80 dark:border-slate-700 transition"
            >
              <UserCheck className="w-4 h-4 text-indigo-500" />
              <span>Create New Student Account</span>
            </Link>
          </div>

          {/* Available Roles & Panels Grid */}
          <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Available Authorized Departmental Panels
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PANELS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <Link
                    key={idx}
                    href={p.href}
                    className="group p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${p.color} text-white shadow-xs`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {p.title}
                          </h3>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                          {p.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                        {p.desc}
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      <span>Log In to Access</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom Return */}
          <div className="pt-2 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Homepage Overview</span>
            </Link>
          </div>

        </div>
      </main>

      {/* Footer info */}
      <footer className="relative z-10 py-6 text-center text-xs text-slate-400">
        Department of Computer Science & Engineering • PUST
      </footer>
    </div>
  );
}

export default function LoginRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#030712] text-slate-400 text-sm">
        Checking departmental authorization...
      </div>
    }>
      <LoginRequiredContent />
    </Suspense>
  );
}

