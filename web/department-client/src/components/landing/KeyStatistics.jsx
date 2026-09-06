"use client";

import { Users, GraduationCap, Building2, Trophy } from "lucide-react";

const STATS = [
  { label: "Active Students", value: "850+", icon: <Users className="h-6 w-6 text-indigo-500" /> },
  { label: "Faculty Members", value: "45+", icon: <GraduationCap className="h-6 w-6 text-sky-500" /> },
  { label: "Laboratories", value: "12", icon: <Building2 className="h-6 w-6 text-purple-500" /> },
  { label: "Research Papers", value: "200+", icon: <Trophy className="h-6 w-6 text-amber-500" /> },
];

export function KeyStatistics() {
  return (
    <div className="py-16 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <div key={idx} className="gsap-stat-card flex flex-col items-center justify-center p-8 rounded-3xl bg-white/60 backdrop-blur-md shadow-xl shadow-slate-200/40 border border-white/80 hover:-translate-y-1 transition-transform">
            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4">
              {stat.icon}
            </div>
            <h4 className="text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</h4>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
