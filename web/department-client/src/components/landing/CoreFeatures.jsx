"use client";

import { Clock, Users, ShieldCheck, FileText, Calendar, BookOpen } from "lucide-react";

const FEATURES = [
  {
    title: "Smart Routine Management",
    description: "Conflict-free dynamic scheduling for theory and lab classes.",
    icon: <Clock className="h-6 w-6 text-indigo-500" />,
    colSpan: "md:col-span-2",
  },
  {
    title: "Member Directory",
    description: "Easily find faculty profiles and student information.",
    icon: <Users className="h-6 w-6 text-sky-500" />,
    colSpan: "md:col-span-1",
  },
  {
    title: "Secure Submissions",
    description: "End-to-end encrypted assignment and thesis submissions.",
    icon: <ShieldCheck className="h-6 w-6 text-purple-500" />,
    colSpan: "md:col-span-1",
  },
  {
    title: "Digital Notice Board",
    description: "Real-time push notifications for urgent departmental announcements.",
    icon: <FileText className="h-6 w-6 text-rose-500" />,
    colSpan: "md:col-span-2",
  },
];

export function CoreFeatures() {
  return (
    <div id="features" className="py-24 relative z-10">
      <div className="gsap-feature-header space-y-3 text-center mb-16">
        <h2 className="text-xs font-bold tracking-[0.3em] text-indigo-600 uppercase">
          Everything You Need
        </h2>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          Core Features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map((feat, idx) => (
          <div key={idx} className={`gsap-feature-card ${feat.colSpan} bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white hover:-translate-y-1 transition-transform`}>
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
              {feat.icon}
            </div>
            <h3 className="font-bold text-xl text-slate-800 mb-2">{feat.title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{feat.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
