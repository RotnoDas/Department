"use client";

import { Bell, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";

const LATEST_NOTICES = [
  { id: 1, text: "Course registration for Fall 2026 is now open. Deadline: Sept 30.", badge: "New" },
  { id: 2, text: "Seminar on 'AI in Healthcare' scheduled for this Friday at 3:00 PM in Room 402." },
  { id: 3, text: "Final year project proposals must be submitted to supervisors by next week.", badge: "Urgent" },
  { id: 4, text: "Campus recruitment drive by Tech Giants starting from October 15th." },
  { id: 5, text: "Department picnic registration closes tomorrow. Contact CR for details." }
];

export function NoticeMarquee() {
  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 overflow-hidden bg-white/80 backdrop-blur-3xl border-y border-indigo-100 shadow-[0_4px_20px_rgb(79,70,229,0.05)] mb-20 z-10">
      <div className="flex items-center">
        
        {/* Sticky Label on the left */}
        <div className="relative z-10 flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 pl-8 pr-6 py-4 text-white font-bold text-[13px] tracking-widest shadow-[10px_0_20px_rgba(255,255,255,0.8)] shrink-0 uppercase">
          <Bell className="h-4 w-4 animate-bounce text-yellow-300" />
          <span>Latest Notices</span>
          <div className="absolute top-0 -right-16 bottom-0 w-16 bg-gradient-to-r from-white to-transparent"></div>
        </div>

        {/* Marquee Content Wrapper */}
        <div className="flex-1 overflow-hidden group">
          <div className="flex w-fit animate-marquee hover:[animation-play-state:paused] whitespace-nowrap py-4">
            
            {/* We render the list twice to create the infinite looping effect */}
            {[...LATEST_NOTICES, ...LATEST_NOTICES].map((notice, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 px-10 border-l-2 border-slate-200/60 first:border-0"
              >
                {notice.badge && (
                  <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full ${notice.badge === 'Urgent' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'}`}>
                    {notice.badge}
                  </span>
                )}
                <span className="text-[15px] font-medium text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer tracking-wide">
                  {notice.text}
                </span>
                <Sparkles className="h-4 w-4 text-indigo-300 ml-2" />
              </div>
            ))}
            
          </div>
        </div>

      </div>
    </div>
  );
}
