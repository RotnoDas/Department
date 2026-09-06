"use client";

import Link from "next/link";
import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { Button } from "@heroui/react";

const PANELS = [
  {
    role: "Student",
    title: "Student Portal",
    description: "Access lecture notes, submit assignments, track attendance, and manage your academic profile.",
    icon: <GraduationCap className="h-8 w-8 text-indigo-600" />,
    loginPath: "/student/login",
    signupPath: "/student/signup",
    badgeColor: "text-indigo-600 bg-indigo-50 ring-indigo-200",
  },
  {
    role: "Teacher",
    title: "Faculty Hub",
    description: "Manage course distributions, publish study materials, and review student assignment submissions.",
    icon: <Presentation className="h-8 w-8 text-sky-600" />,
    loginPath: "/teacher/login",
    signupPath: "/teacher/signup",
    badgeColor: "text-sky-600 bg-sky-50 ring-sky-200",
  },
  {
    role: "Admin",
    title: "Admin Control",
    description: "Full oversight of the department portal, user approvals, course assignments, and routine management.",
    icon: <ShieldCheck className="h-8 w-8 text-purple-600" />,
    loginPath: "/admin/login",
    signupPath: "/admin/signup",
    badgeColor: "text-purple-600 bg-purple-50 ring-purple-200",
  },
];

export function PortalsPreview({ portalCardsRef }) {
  return (
    <div id="portals" className="py-24 relative z-10">
      <div className="gsap-portal-header space-y-3 text-center mb-20">
        <h2 className="text-xs font-bold tracking-[0.3em] text-indigo-600 uppercase">
          Choose Your Path
        </h2>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          Role-Based Access
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((panel, idx) => (
          <article
            key={panel.role}
            ref={(el) => {
              if (portalCardsRef) {
                  portalCardsRef.current[idx] = el;
              }
            }}
            className="group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white/80 backdrop-blur-xl p-8 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] ring-1 ring-slate-100 transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-indigo-100/50 hover:ring-indigo-100"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-1 flex-col">
              <div className="mb-8 flex items-start justify-between">
                <div className={`rounded-xl px-4 py-1.5 text-xs font-bold tracking-widest uppercase shadow-sm ring-1 ${panel.badgeColor}`}>
                  {panel.role}
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-50 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  {panel.icon}
                </div>
              </div>

              <h3 className="mb-4 text-2xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600">
                {panel.title}
              </h3>
              <p className="mb-10 text-[15px] leading-relaxed font-medium text-slate-500">
                {panel.description}
              </p>

              <div className="mt-auto flex gap-4 pt-6">
                <Button 
                  as={Link} 
                  href={panel.loginPath} 
                  color="primary" 
                  className="flex-1 font-semibold text-sm h-12 shadow-lg shadow-indigo-200/50 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  Sign In
                </Button>
                <Button 
                  as={Link} 
                  href={panel.signupPath} 
                  variant="flat" 
                  className="flex-1 font-semibold text-sm h-12 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
