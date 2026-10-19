"use client";

import { motion } from "framer-motion";
import { BrainCircuit, Bell, Clock, ShieldCheck, LayoutGrid, Users } from "lucide-react";

const FEATURES = [
  {
    title: "AI Result Processing",
    description: "Automated grading, CGPA prediction, and instant transcripts flawlessly.",
    icon: <BrainCircuit className="h-6 w-6 text-white" />,
    iconWrapper: "bg-white/20 border-white/20",
    colSpan: "md:col-span-2 lg:col-span-2",
    bgClass: "bg-gradient-to-br from-indigo-600 to-purple-600",
    textClass: "text-white",
    descClass: "text-indigo-100",
    borderClass: "border-transparent",
    visual: (
      <div className="flex items-end gap-1.5 h-12 mt-4 opacity-90">
        {[40, 65, 45, 80, 55, 90, 70, 100].map((h, i) => (
          <motion.div 
            key={i} 
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            transition={{ duration: 1, delay: i * 0.1 }}
            className={`w-full rounded-t-sm ${i % 2 === 0 ? 'bg-white/40' : 'bg-white/70'}`}
          ></motion.div>
        ))}
      </div>
    )
  },
  {
    title: "Live Notice Board",
    description: "Instant push notifications for urgent announcements.",
    icon: <Bell className="h-5 w-5 text-rose-500" />,
    iconWrapper: "bg-rose-50 dark:bg-rose-950/60 border-rose-100 dark:border-rose-900/40",
    colSpan: "md:col-span-1 lg:col-span-1",
    bgClass: "bg-white/80 dark:bg-slate-900/80",
    textClass: "text-slate-800 dark:text-white",
    descClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-white dark:border-white/10",
    visual: (
      <div className="mt-4 flex flex-col gap-1.5 opacity-80">
        <div className="w-full h-2 rounded-full bg-rose-200 dark:bg-rose-800"></div>
        <div className="w-3/4 h-2 rounded-full bg-rose-200/60 dark:bg-rose-800/60"></div>
      </div>
    )
  },
  {
    title: "Dynamic Routine",
    description: "Conflict-free scheduling with real-time tracking.",
    icon: <Clock className="h-5 w-5 text-sky-500" />,
    iconWrapper: "bg-sky-50 dark:bg-sky-950/60 border-sky-100 dark:border-sky-900/40",
    colSpan: "md:col-span-1 lg:col-span-1",
    bgClass: "bg-white/80 dark:bg-slate-900/80",
    textClass: "text-slate-800 dark:text-white",
    descClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-white dark:border-white/10",
    visual: (
      <div className="mt-4 grid grid-cols-2 gap-1.5 opacity-80">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-4 rounded-sm ${i % 2 === 0 ? 'bg-sky-200 dark:bg-sky-800' : 'bg-sky-100 dark:bg-sky-900'}`}></div>
        ))}
      </div>
    )
  },
  {
    title: "Member Directory",
    description: "Easily find and communicate with faculty and peers.",
    icon: <Users className="h-5 w-5 text-purple-500" />,
    iconWrapper: "bg-purple-50 dark:bg-purple-950/60 border-purple-100 dark:border-purple-900/40",
    colSpan: "md:col-span-1 lg:col-span-1",
    bgClass: "bg-white/80 dark:bg-slate-900/80",
    textClass: "text-slate-800 dark:text-white",
    descClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-white dark:border-white/10",
    visual: (
      <div className="mt-4 flex -space-x-2 opacity-90">
        <div className="w-7 h-7 rounded-full bg-purple-200 dark:bg-purple-700 border-2 border-white dark:border-slate-800"></div>
        <div className="w-7 h-7 rounded-full bg-purple-300 dark:bg-purple-600 border-2 border-white dark:border-slate-800"></div>
        <div className="w-7 h-7 rounded-full bg-purple-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] text-white font-bold">+5k</div>
      </div>
    )
  },
  {
    title: "Secure Assignments",
    description: "End-to-end encrypted assignment submissions.",
    icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
    iconWrapper: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-900/40",
    colSpan: "md:col-span-1 lg:col-span-1",
    bgClass: "bg-white/80 dark:bg-slate-900/80",
    textClass: "text-slate-800 dark:text-white",
    descClass: "text-slate-500 dark:text-slate-400",
    borderClass: "border-white dark:border-white/10",
    visual: (
      <div className="mt-4 h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
         <motion.div initial={{ width: 0 }} whileInView={{ width: '100%' }} transition={{ duration: 1.5 }} className="h-full bg-emerald-400"></motion.div>
      </div>
    )
  },
  {
    title: "Exam Seat Planner",
    description: "Automated seat planning algorithms for midterms and finals.",
    icon: <LayoutGrid className="h-6 w-6 text-amber-500" />,
    iconWrapper: "bg-white/50 dark:bg-amber-950/80 border-amber-200/50 dark:border-amber-800/40",
    colSpan: "md:col-span-2 lg:col-span-2",
    bgClass: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30",
    textClass: "text-amber-900 dark:text-amber-200",
    descClass: "text-amber-700/70 dark:text-amber-300/70",
    borderClass: "border-amber-100 dark:border-amber-900/40",
    visual: (
      <div className="mt-4 grid grid-cols-6 gap-1.5 opacity-70">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`h-4 rounded-sm ${i % 4 === 0 ? 'bg-amber-300 dark:bg-amber-700' : 'bg-amber-200 dark:bg-amber-800'}`}></div>
        ))}
      </div>
    )
  }
];

export function CoreFeatures() {
  return (
    <div id="features" className="py-16 relative z-10 scroll-mt-24">
      <div className="space-y-2 text-center mb-10">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-black tracking-[0.3em] text-indigo-600 dark:text-indigo-400 uppercase"
        >
          Everything You Need
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white"
        >
          Powerful Core Features
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto px-4 lg:px-0">
        {FEATURES.map((feat, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
            className={`group relative overflow-hidden backdrop-blur-xl p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border ${feat.borderClass} ${feat.bgClass} transition-all duration-300 hover:shadow-[0_20px_40px_rgba(79,70,229,0.15)] hover:-translate-y-1 ${feat.colSpan} flex flex-col justify-between min-h-[160px]`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-10 w-10 rounded-xl border flex items-center justify-center shadow-sm ${feat.iconWrapper}`}>
                  {feat.icon}
                </div>
              </div>
              <h3 className={`font-extrabold text-lg mb-1 tracking-tight ${feat.textClass}`}>{feat.title}</h3>
              <p className={`font-medium leading-snug text-xs ${feat.descClass}`}>{feat.description}</p>
              
              <div className="mt-auto pt-2">
                {feat.visual}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
