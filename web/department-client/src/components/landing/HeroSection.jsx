"use client";

import Link from "next/link";
import { ArrowRight, Terminal, Bell, Code2, Database } from "lucide-react";
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
      <div className="space-y-10 relative">
        <h1 className="gsap-hero-item text-6xl leading-[1.08] font-extrabold tracking-tight text-slate-900 sm:text-7xl xl:text-[5.5rem] relative z-10">
          Computer Science <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">& Engineering</span>
        </h1>

        <p className="gsap-hero-item max-w-xl text-[1.1rem] leading-relaxed font-medium text-slate-500">
          A unified, AI-powered ecosystem for students, faculty, and administrators. 
          Experience seamless role-based access control and predictive insights tailored for CSE.
        </p>

        <div className="gsap-hero-item flex flex-wrap gap-5 pt-4">
          <Link 
            href="/register" 
            className="inline-flex items-center justify-center font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white transition-colors"
          >
            Get Started <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
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
      
      {/* Relevant CSE Dashboard Mockup Composition */}
      <div className="relative hidden lg:flex justify-center items-center h-[600px] gsap-hero-item gsap-scrub perspective-1000">
        
        {/* Main Dashboard Window */}
        <div className="relative z-20 w-[500px] h-[340px] rounded-[2rem] bg-white/70 backdrop-blur-3xl border border-white/80 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden transform -rotate-y-12 rotate-x-6 hover:rotate-0 transition-transform duration-700">
          
          {/* Window Header */}
          <div className="h-12 bg-white/50 border-b border-white/50 flex items-center px-5 gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            </div>
            <div className="mx-auto bg-white/80 px-4 py-1.5 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-sm">
              portal.cse.edu
            </div>
            <div className="w-12"></div> {/* Spacer for centering */}
          </div>

          {/* Dashboard Body */}
          <div className="flex flex-1 p-5 gap-5">
             {/* Sidebar */}
             <div className="w-1/3 flex flex-col gap-3">
               <div className="w-full h-28 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center p-3 shadow-inner">
                 <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-3 flex items-center justify-center text-white text-sm font-black shadow-md">JD</div>
                 <div className="w-16 h-2 bg-indigo-500/30 rounded-full"></div>
                 <div className="w-10 h-2 bg-indigo-500/20 rounded-full mt-1.5"></div>
               </div>
               <div className="w-full h-8 rounded-xl bg-slate-200/50 mt-2"></div>
               <div className="w-full h-8 rounded-xl bg-slate-200/50"></div>
               <div className="w-full h-8 rounded-xl bg-slate-200/50"></div>
             </div>

             {/* Main Content */}
             <div className="flex-1 flex flex-col gap-4">
               <div className="flex gap-3">
                 <div className="flex-1 h-24 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider mb-1">Current CGPA</span>
                    <span className="text-3xl font-black text-emerald-900">3.92</span>
                 </div>
                 <div className="flex-1 h-24 rounded-2xl bg-purple-500/10 border border-purple-500/20 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider mb-1">Credits</span>
                    <span className="text-3xl font-black text-purple-900">112</span>
                 </div>
               </div>
               
               <div className="flex-1 rounded-2xl bg-white/60 border border-white shadow-sm p-4 flex flex-col gap-3">
                 <div className="w-24 h-3 bg-slate-300 rounded-full mb-1"></div>
                 <div className="w-full h-8 rounded-lg bg-slate-200/60"></div>
                 <div className="w-full h-8 rounded-lg bg-slate-200/60"></div>
               </div>
             </div>
          </div>
        </div>

        {/* Floating Attendance Chart */}
        <div className="absolute z-30 -right-6 bottom-16 w-56 rounded-2xl bg-white/95 backdrop-blur-xl p-4 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] border border-white animate-float" style={{ animationDelay: '1s' }}>
           <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2">
               <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                 <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
               </div>
               <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">Attendance</span>
             </div>
             <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">92%</span>
           </div>
           
           <div className="flex items-end justify-between gap-1.5 h-12 mt-2">
             {[60, 80, 100, 45, 90, 75, 100].map((h, i) => (
               <div key={i} className="w-full h-full bg-slate-100 rounded-sm relative group overflow-hidden">
                 <div className={`absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-1000 ${h < 50 ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ height: `${h}%` }}></div>
               </div>
             ))}
           </div>
           <div className="flex justify-between mt-1.5 px-1 text-[9px] font-black text-slate-400">
             <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
           </div>
        </div>

        {/* Floating Notification */}
        <div className="absolute z-30 -left-12 top-28 w-56 rounded-2xl bg-white/90 backdrop-blur-xl p-4 shadow-2xl border border-white animate-float">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-rose-500 animate-bounce" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-wide">Class Rescheduled</p>
              <p className="text-[10px] font-medium text-slate-500 mt-0.5">Data Structures at 2 PM</p>
            </div>
          </div>
        </div>
        
        {/* Floating Database Icon */}
        <div className="absolute z-30 right-10 top-16 w-14 h-14 rounded-2xl bg-sky-500/10 backdrop-blur-md border border-sky-500/30 flex items-center justify-center shadow-lg animate-float" style={{ animationDelay: '2s' }}>
          <Database className="h-6 w-6 text-sky-500" />
        </div>

        {/* Ambient Backlight */}
        <div className="absolute top-1/2 left-1/2 w-full h-full -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-indigo-400/30 via-purple-400/20 to-transparent rounded-full blur-[100px] -z-10"></div>
      </div>
    </div>
  );
}
