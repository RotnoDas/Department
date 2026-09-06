"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, Sparkles, Activity } from "lucide-react";
import { Button } from "@heroui/react";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin);
}

export function HeroSection() {
  const handleScroll = (e, targetId) => {
    e.preventDefault();
    gsap.to(window, {
      duration: 0.6,
      scrollTo: { y: `#${targetId}`, offsetY: 50 },
      ease: "power2.inOut"
    });
  };

  return (
    <div className="mb-32 grid grid-cols-1 items-center gap-16 lg:grid-cols-2 relative z-10 pt-44">
      <div className="space-y-10">
        <h1 className="gsap-hero-item text-6xl leading-[1.08] font-extrabold tracking-tight text-slate-900 sm:text-7xl xl:text-[5.5rem]">
          Computer Science <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">& Engineering</span>
        </h1>

        <p className="gsap-hero-item max-w-xl text-[1.1rem] leading-relaxed font-medium text-slate-500">
          A unified, AI-powered ecosystem for students, faculty, and administrators. 
          Experience seamless role-based access control and predictive insights tailored for CSE.
        </p>

        <div className="gsap-hero-item flex flex-wrap gap-5 pt-4">
          <Button 
            as={Link} 
            href="/student/signup" 
            color="primary" 
            size="lg" 
            className="font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 rounded-2xl"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            Join as Student
          </Button>
          <Button 
            as="a" 
            href="#portals" 
            onClick={(e) => handleScroll(e, 'portals')}
            variant="bordered" 
            size="lg" 
            className="font-bold text-sm tracking-wide h-14 px-8 bg-white/60 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-white rounded-2xl cursor-pointer"
          >
            Explore Portals
          </Button>
        </div>

        <div className="gsap-hero-item inline-flex items-center gap-5 pt-4 mt-2 rounded-full bg-white/40 backdrop-blur-md p-2 pr-6 shadow-sm ring-1 ring-slate-200/50">
          <div className="flex -space-x-3">
            <img src="https://i.pravatar.cc/100?img=47" alt="Student" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
            <img src="https://i.pravatar.cc/100?img=32" alt="Student" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
            <img src="https://i.pravatar.cc/100?img=12" alt="Student" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-sm" />
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-indigo-50 text-[10px] font-black text-indigo-600 shadow-sm">
              850+
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1 text-yellow-400 mb-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              ))}
            </div>
            <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">
              Loved by CSE Students
            </p>
          </div>
        </div>
      </div>
      
      {/* Unique Animated Glassmorphic Composition */}
      <div className="relative hidden lg:flex justify-center items-center h-[600px] gsap-hero-item gsap-scrub perspective-1000">
        
        {/* Main Floating Glass Panel */}
        <div className="relative z-20 w-[400px] h-[480px] rounded-[3rem] bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.2)] p-8 flex flex-col justify-between transform -rotate-y-12 rotate-x-6 hover:rotate-0 transition-transform duration-700">
          
          <div className="flex justify-between items-start">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <BrainCircuit className="h-7 w-7 text-indigo-600 animate-pulse" />
            </div>
            <div className="px-4 py-1.5 rounded-full bg-white/60 text-[10px] font-black tracking-widest text-indigo-600 uppercase shadow-sm">
              Live AI Sync
            </div>
          </div>

          <div className="space-y-4">
            <div className="h-2.5 w-1/3 rounded-full bg-slate-200/50"></div>
            <div className="h-2.5 w-3/4 rounded-full bg-slate-200/50"></div>
            <div className="h-2.5 w-1/2 rounded-full bg-slate-200/50"></div>
          </div>
          
          {/* Central Glowing Orb inside the glass */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-400 blur-2xl opacity-60 mix-blend-multiply animate-spin-slow"></div>
          
          <div className="relative z-10 w-full h-32 rounded-2xl bg-white/50 border border-white/50 flex items-end p-4 gap-2">
            {[40, 70, 45, 90, 65].map((height, i) => (
              <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-sm relative group">
                 <div className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-t-md transition-all duration-1000" style={{ height: `${height}%` }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Overlapping Elements */}
        <div className="absolute z-30 -right-4 top-20 w-48 rounded-2xl bg-white/70 backdrop-blur-xl p-4 shadow-2xl border border-white/80 animate-float">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accuracy</p>
              <p className="text-lg font-black text-slate-800">99.8%</p>
            </div>
          </div>
        </div>

        <div className="absolute z-30 -left-12 bottom-32 w-56 rounded-2xl bg-slate-900/80 backdrop-blur-xl p-4 shadow-2xl border border-slate-700 animate-float" style={{ animationDelay: '1.5s' }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-sky-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-sky-300 uppercase tracking-widest">System Status</p>
              <p className="text-sm font-black text-white">Optimal Load</p>
            </div>
          </div>
        </div>

        {/* Ambient Backlight */}
        <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-indigo-300/30 via-purple-300/20 to-transparent rounded-full blur-[100px] -z-10"></div>
      </div>
    </div>
  );
}
