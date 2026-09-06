"use client";

import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto w-full border-t border-slate-200/60 bg-white/50 backdrop-blur-lg py-8 relative z-50">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm font-medium text-slate-500">
          &copy; {new Date().getFullYear()} CSE Department. All rights reserved.
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
          Built with <Heart className="h-4 w-4 text-rose-500 fill-rose-500 animate-pulse" /> by students
        </div>
      </div>
    </footer>
  );
}
