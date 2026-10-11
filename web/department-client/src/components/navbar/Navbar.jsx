"use client";

import Link from "next/link";
import { GraduationCap, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@heroui/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";

// Register GSAP Plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin);
}

export function Navbar() {
  const { data: session } = authClient.useSession();
  const { scrollYProgress } = useScroll();
  // useSpring creates that "liquid" and perfectly smooth interpolated feel
  const smoothProgress = useSpring(scrollYProgress, { 
    stiffness: 80, 
    damping: 20, 
    restDelta: 0.001 
  });
  
  const width = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const handleScroll = (e, targetId) => {
    e.preventDefault();
    gsap.to(window, {
      duration: 0.6,
      scrollTo: { y: `#${targetId}`, offsetY: 50 },
      ease: "power2.inOut"
    });
  };

  return (
    <>
      {/* Top Edge Screen Liquid Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-slate-900/5 dark:bg-white/5 backdrop-blur-sm">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          style={{ width }}
        >
        </motion.div>
      </div>

      <header className="gsap-nav fixed top-6 left-4 right-4 md:left-8 md:right-8 lg:left-12 lg:right-12 max-w-[1500px] mx-auto z-50 flex items-center justify-between px-6 sm:px-8 py-3.5 sm:py-4 rounded-[2.5rem] bg-white/75 dark:bg-slate-900/80 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_10px_40px_rgb(0,0,0,0.06),0_4px_15px_rgb(79,70,229,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-colors duration-300">
      <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
        {/* Logo Icon */}
        <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/40 transition-transform group-hover:scale-105">
          <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
        </div>
        {/* Logo Text */}
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">CSE</span>
            <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-indigo-500"></div>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.08em] text-slate-600 dark:text-slate-300 uppercase leading-tight mt-0.5">
            Computer Science & Engineering
          </span>
          <span className="text-[8px] sm:text-[8.5px] font-semibold tracking-[0.1em] text-slate-400 dark:text-slate-400 uppercase leading-tight mt-0.5">
            Pabna University of Science & Technology
          </span>
        </div>
      </Link>

      {/* Nav Links & CTA */}
      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden md:flex items-center gap-7 mr-2">
          <a href="#features" onClick={(e) => handleScroll(e, 'features')} className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            Features
          </a>
          <a href="#portals" onClick={(e) => handleScroll(e, 'portals')} className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            Portals
          </a>
          <a href="#notices" onClick={(e) => handleScroll(e, 'notices')} className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            Notices
          </a>
          <a href="#support" onClick={(e) => handleScroll(e, 'support')} className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer">
            Support
          </a>
        </div>
        
        {/* Dark / Light Mode Toggle Button */}
        <ThemeToggle />

        <Link
          href="/login"
          className="inline-flex items-center justify-center font-bold text-xs sm:text-sm tracking-wide text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 px-5 sm:px-7 h-10 sm:h-11 rounded-xl transition-all hover:scale-105"
        >
          Sign In
        </Link>
      </div>
    </header>
    </>
  );
}
