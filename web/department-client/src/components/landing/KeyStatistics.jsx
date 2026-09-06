"use client";

import { useRef, useEffect } from "react";
import { Users, GraduationCap, Building2, Trophy } from "lucide-react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

const STATS = [
  { label: "Active Students", value: 850, suffix: "+", icon: <Users className="h-6 w-6 text-indigo-500" /> },
  { label: "Faculty Members", value: 45, suffix: "+", icon: <GraduationCap className="h-6 w-6 text-sky-500" /> },
  { label: "Laboratories", value: 12, suffix: "", icon: <Building2 className="h-6 w-6 text-purple-500" /> },
  { label: "Research Papers", value: 200, suffix: "+", icon: <Trophy className="h-6 w-6 text-amber-500" /> },
];

function Counter({ from, to, suffix }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      animate(count, to, { duration: 2, ease: "easeOut" });
    }
  }, [count, isInView, to]);

  return (
    <div className="flex items-center justify-center">
      <motion.span ref={ref}>{rounded}</motion.span>
      <span>{suffix}</span>
    </div>
  );
}

export function KeyStatistics() {
  return (
    <div className="py-16 relative z-10">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map((stat, idx) => (
          <motion.div 
            key={idx} 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: idx * 0.1, ease: "easeOut" }}
            whileHover={{ y: -10, scale: 1.02 }}
            className="gsap-stat-card group flex flex-col items-center justify-center p-8 rounded-3xl bg-white/60 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 hover:shadow-[0_20px_40px_rgba(79,70,229,0.1)] transition-all duration-300 cursor-pointer overflow-hidden relative"
          >
            {/* Hover Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            
            <div className="h-14 w-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 relative z-10">
              {stat.icon}
            </div>
            <h4 className="text-4xl font-extrabold text-slate-900 mb-1.5 tracking-tight relative z-10">
              <Counter from={0} to={stat.value} suffix={stat.suffix} />
            </h4>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center relative z-10 group-hover:text-indigo-600 transition-colors duration-300">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
