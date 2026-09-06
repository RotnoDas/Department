"use client";

import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@heroui/react";

export function Navbar() {
  return (
    <header className="gsap-nav flex items-center justify-between py-4 relative z-50">
      <div className="flex items-center gap-4">
        {/* Logo Icon */}
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-200/50">
          <GraduationCap className="h-7 w-7 text-white" />
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
        </div>
        {/* Logo Text */}
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">CSE</span>
            <div className="h-2.5 w-2.5 rounded-full bg-indigo-500"></div>
          </div>
          <span className="text-[10px] font-bold tracking-[0.08em] text-slate-600 uppercase leading-tight mt-0.5">
            Computer Science & Engineering
          </span>
          <span className="text-[8.5px] font-semibold tracking-[0.1em] text-slate-400 uppercase leading-tight mt-0.5">
            Pabna University of Science & Technology
          </span>
        </div>
      </div>

      {/* Nav Links & CTA */}
      <div className="hidden md:flex items-center gap-10">
        <a href="#features" className="text-sm font-semibold tracking-wide text-slate-500 hover:text-indigo-600 transition-colors">
          Features
        </a>
        <a href="#portals" className="text-sm font-semibold tracking-wide text-slate-500 hover:text-indigo-600 transition-colors">
          Portals
        </a>
        <Button 
          as={Link} 
          href="/student/login" 
          color="primary" 
          className="font-bold text-sm tracking-wide bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 px-7 h-11 rounded-xl"
        >
          Sign In
        </Button>
      </div>
    </header>
  );
}
