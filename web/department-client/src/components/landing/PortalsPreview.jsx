"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Presentation, Briefcase, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const PANELS = [
  {
    role: "Student",
    title: "Student Portal",
    description: "Access course materials, turn in assignments, track real-time attendance, and view academic progress.",
    icon: <GraduationCap className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/60",
    badgeColor: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 ring-indigo-200 dark:ring-indigo-800",
    btnColor: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200/50 dark:shadow-none",
    loginPath: "/login",
    signupPath: "/register",
    dashboardPath: "/dashboard/student",
  },
  {
    role: "Teacher",
    title: "Faculty Hub",
    description: "Schedule lectures, publish course slides and lab manuals, oversee student rosters, and grade assignments.",
    icon: <Presentation className="h-7 w-7 text-sky-600 dark:text-sky-400" />,
    iconBg: "bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/60",
    badgeColor: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 ring-sky-200 dark:ring-sky-800",
    btnColor: "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200/50 dark:shadow-none",
    loginPath: "/login",
    signupPath: "/register",
    dashboardPath: "/dashboard/teacher",
  },
  {
    role: "Employee",
    title: "Staff Desk",
    description: "Monitor computer labs, track hardware maintenance work tickets, log duty shifts, and oversee facility readiness.",
    icon: <Briefcase className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60",
    badgeColor: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 ring-emerald-200 dark:ring-emerald-800",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/50 dark:shadow-none",
    loginPath: "/login",
    signupPath: "/register",
    dashboardPath: "/dashboard/employee",
  },
  {
    role: "Admin",
    title: "Admin Console",
    description: "Full institutional governance, approving registrations, managing curriculum routines, and circular dispatch.",
    icon: <ShieldCheck className="h-7 w-7 text-purple-600 dark:text-purple-400" />,
    iconBg: "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/60",
    badgeColor: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 ring-purple-200 dark:ring-purple-800",
    btnColor: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200/50 dark:shadow-none",
    loginPath: "/login",
    signupPath: "/register",
    dashboardPath: "/dashboard/admin",
  },
];

export function PortalsPreview() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <div id="portals" className="py-20 relative z-10 scroll-mt-24">
      <div className="space-y-3 text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-widest uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Role-Based Gateways</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Choose Your Department Portal
        </h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Tailored dashboards designed specifically for students, faculty members, staff technicians, and department administrators.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {PANELS.map((panel, idx) => (
          <article
            key={panel.role || idx}
            className="group relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-[0_10px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200/80 dark:border-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-500/50"
          >
            <div>
              <div className="mb-6 flex items-start justify-between">
                <span className={`rounded-xl px-3 py-1 text-[11px] font-bold tracking-widest uppercase shadow-2xs ring-1 ${panel.badgeColor}`}>
                  {panel.role}
                </span>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${panel.iconBg}`}>
                  {panel.icon}
                </div>
              </div>

              <h3 className="mb-2.5 text-xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {panel.title}
              </h3>
              <p className="text-xs leading-relaxed font-medium text-slate-500 dark:text-slate-400 mb-8">
                {panel.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex gap-2.5">
              {user ? (
                <Link 
                  href={panel.dashboardPath}
                  className={`w-full font-bold text-xs h-10 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${panel.btnColor}`}
                >
                  <span>Enter {panel.title}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <>
                  <Link 
                    href={panel.loginPath}
                    className={`flex-1 font-bold text-xs h-10 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 ${panel.btnColor}`}
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link 
                    href={panel.signupPath}
                    className="px-3.5 font-bold text-xs h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center active:scale-95"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
