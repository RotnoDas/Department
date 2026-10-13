"use client";

import { useEffect, useState } from "react";
import { Bell, Sparkles, Megaphone, Flame, ExternalLink } from "lucide-react";
import Link from "next/link";

const DEFAULT_NOTICES = [
  { id: 1, text: "Semester Final Examination Seating & Schedule published. Exams commence from Nov 15.", badge: "Urgent", category: "Exam" },
  { id: 2, text: "Annual Department Programming Contest & TechFest 2026 registration is now open.", badge: "New", category: "Event" },
  { id: 3, text: "Course registration for upcoming semester portal open for batches 8, 9, and 10.", badge: "Academic", category: "Academic" },
  { id: 4, text: "Software Lab 1 workstation upgrade completed with modern AI/ML toolchains.", badge: "Lab", category: "Notice" },
  { id: 5, text: "Guest seminar on 'Large Language Models in Autonomous Systems' on Friday at 3:00 PM.", badge: "Seminar", category: "Event" }
];

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export function NoticeMarquee() {
  const [notices, setNotices] = useState(DEFAULT_NOTICES);

  useEffect(() => {
    async function fetchNotices() {
      try {
        const res = await fetch(`${SERVER_URL}/api/notices`);
        if (res.ok) {
          const data = await res.json();
          if (data?.notices && data.notices.length > 0) {
            const mapped = data.notices.map((n, i) => ({
              id: n._id || i,
              text: n.title + (n.content ? ` — ${n.content.slice(0, 75)}...` : ""),
              badge: n.priority === "High" ? "Urgent" : n.category || "Notice",
              category: n.category || "General",
            }));
            setNotices(mapped);
          }
        }
      } catch (err) {
        // Silently use defaults on network failure
      }
    }
    fetchNotices();
  }, []);

  const getBadgeStyle = (badge) => {
    switch (badge?.toLowerCase()) {
      case "urgent":
      case "high":
        return "bg-rose-500/15 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-300/40 dark:border-rose-500/30";
      case "new":
      case "event":
        return "bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-300/40 dark:border-emerald-500/30";
      case "academic":
      case "exam":
        return "bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-300/40 dark:border-sky-500/30";
      default:
        return "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-300/40 dark:border-indigo-500/30";
    }
  };

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border-y border-indigo-100/80 dark:border-slate-800/80 shadow-[0_4px_25px_rgba(79,70,229,0.06)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.6)] mb-20 z-10 transition-colors duration-300">
      <div className="flex items-center relative">
        
        {/* Sticky Label on the left with sleek gradient & ambient glow */}
        <div className="relative z-20 flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-700 dark:via-purple-700 dark:to-indigo-600 pl-6 md:pl-8 pr-6 py-4 text-white font-extrabold text-[12px] md:text-[13px] tracking-widest shadow-[4px_0_20px_rgba(79,70,229,0.25)] dark:shadow-[4px_0_25px_rgba(99,102,241,0.35)] shrink-0 uppercase select-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-300"></span>
          </span>
          <Megaphone className="h-4 w-4 text-yellow-300 animate-pulse shrink-0" />
          <span className="font-mono">Live Notices</span>
          
          {/* Subtle blend gradient transitioning seamlessly into both light and dark backgrounds */}
          <div className="absolute top-0 -right-8 bottom-0 w-8 bg-gradient-to-r from-purple-600/40 dark:from-indigo-600/40 to-transparent pointer-events-none"></div>
        </div>

        {/* Marquee Content Wrapper */}
        <div className="flex-1 overflow-hidden group relative">
          {/* Left subtle fade mask */}
          <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-white/80 dark:from-[#070b14]/80 to-transparent pointer-events-none z-10"></div>
          
          {/* Right subtle fade mask */}
          <div className="absolute top-0 right-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-white dark:from-[#070b14] to-transparent pointer-events-none z-10"></div>

          <div className="flex w-fit animate-marquee hover:[animation-play-state:paused] whitespace-nowrap py-3.5">
            
            {/* Duplicated list for infinite seamless loop */}
            {[...notices, ...notices].map((notice, index) => (
              <Link 
                key={`${notice.id}-${index}`}
                href="#notices"
                className="flex items-center gap-3.5 px-8 md:px-10 border-l border-slate-200/80 dark:border-slate-800/80 group/item transition-colors"
              >
                {notice.badge && (
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border shadow-sm transition-transform duration-200 group-hover/item:scale-105 shrink-0 ${getBadgeStyle(notice.badge)}`}>
                    {notice.badge}
                  </span>
                )}
                
                <span className="text-[13px] md:text-[14px] font-medium text-slate-700 dark:text-slate-300 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400 transition-colors tracking-wide">
                  {notice.text}
                </span>

                <Sparkles className="h-3.5 w-3.5 text-indigo-400/60 dark:text-indigo-400/40 group-hover/item:text-indigo-400 ml-1 shrink-0 transition-colors" />
              </Link>
            ))}
            
          </div>
        </div>

      </div>
    </div>
  );
}
