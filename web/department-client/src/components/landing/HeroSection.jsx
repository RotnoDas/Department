"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@heroui/react";

export function HeroSection() {
  return (
    <div className="mb-32 grid grid-cols-1 items-center gap-16 lg:grid-cols-2 relative z-10 pt-16">
      <div className="space-y-8">
        <h1 className="gsap-hero-item text-6xl leading-[1.08] font-extrabold tracking-tight text-slate-900 sm:text-7xl xl:text-[5.5rem]">
          Next-Gen <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">Academic Hub</span>
        </h1>

        <p className="gsap-hero-item max-w-xl text-[1.1rem] leading-relaxed font-medium text-slate-500">
          A unified, AI-powered ecosystem for students, faculty, and administrators. 
          Experience seamless role-based access control and predictive insights tailored for CSE.
        </p>

        <div className="gsap-hero-item flex flex-wrap gap-5 pt-6">
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
            variant="bordered" 
            size="lg" 
            className="font-bold text-sm tracking-wide h-14 px-8 bg-white/60 backdrop-blur-md border-slate-200 text-slate-700 hover:bg-white rounded-2xl"
          >
            Explore Portals
          </Button>
        </div>
      </div>
      
      {/* Visual illustration or abstract representation can go here on the right */}
      <div className="relative hidden lg:block gsap-hero-item gsap-scrub">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
        <img 
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop" 
            alt="Students collaborating" 
            className="relative z-10 rounded-[2.5rem] shadow-2xl shadow-indigo-500/20 object-cover h-[550px] w-full border border-white/50"
        />
      </div>
    </div>
  );
}
