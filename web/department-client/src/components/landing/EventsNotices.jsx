"use client";

import { Calendar } from "lucide-react";
import { Button } from "@heroui/react";

export function EventsNotices() {
  return (
    <div className="py-24 relative z-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="text-xs font-bold tracking-[0.3em] text-indigo-600 uppercase mb-3">
            Stay Updated
          </h2>
          <p className="text-4xl font-extrabold tracking-tight text-slate-900">
            Latest Notices & Events
          </p>
        </div>
        <Button variant="flat" color="primary" className="font-bold">
          View All Notices
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="flex gap-6 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center justify-center shrink-0 w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600">
              <span className="text-2xl font-black leading-none">12</span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1">Oct</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                Urgent
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Midterm Examination Schedule Published</h3>
              <p className="text-sm text-slate-500 line-clamp-2">The schedule for the upcoming Fall 2026 semester midterm examinations has been published. Please check your student portal.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
