"use client";

import { useEffect, useRef } from "react";
import { GraduationCap, Sparkles, MapPin, Phone, Mail, Globe, MessageCircle, Share2, Video, Heart } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

export function Footer() {
  const containerRef = useRef(null);
  const leftBeam = useRef(null);
  const rightBeam = useRef(null);
  const centerPulse = useRef(null);
  const sweeper = useRef(null);

  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

      // Initial states
      gsap.set(leftBeam.current, { scaleX: 0, opacity: 1, xPercent: 0 });
      gsap.set(rightBeam.current, { scaleX: 0, opacity: 1, xPercent: 0 });
      gsap.set(centerPulse.current, { scale: 0, opacity: 0 });
      gsap.set(sweeper.current, { x: "-50vw", opacity: 0 });

      tl.to(centerPulse.current, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" })
        .to(centerPulse.current, { scale: 0.6, duration: 0.2 })
        .to([leftBeam.current, rightBeam.current], {
          scaleX: 1,
          duration: 1.2,
          ease: "expo.out"
        }, "-=0.2")
        .to(leftBeam.current, { xPercent: -100, opacity: 0, duration: 0.8, ease: "power2.in" }, "+=0.3")
        .to(rightBeam.current, { xPercent: 100, opacity: 0, duration: 0.8, ease: "power2.in" }, "<")
        .to(centerPulse.current, { scale: 0, opacity: 0, duration: 0.5 }, "<")
        .to(sweeper.current, { opacity: 1, duration: 0.3 })
        .to(sweeper.current, {
          x: "100vw",
          duration: 2.5,
          ease: "power1.inOut"
        }, "<")
        .to(sweeper.current, { opacity: 0, duration: 0.5 }, "-=0.5");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={containerRef} className="relative w-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl pt-24 pb-10 overflow-hidden mt-20 transition-colors duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
      
      {/* GSAP Animated Premium Divider Container */}
      <div className="absolute top-0 left-0 w-full h-[4px] overflow-hidden pointer-events-none z-20">
        {/* Base ultra-thin line */}
        <div className="absolute top-[1px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent opacity-50"></div>
        
        {/* Sweeper (large soft light sweeping across) */}
        <div ref={sweeper} className="absolute top-0 h-[3px] w-[50vw] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent blur-[3px]"></div>
          <div className="absolute h-[2px] w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,1)]"></div>
          <div className="absolute h-[3px] w-16 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,1)]"></div>
        </div>

        {/* Left Expanding Beam */}
        <div ref={leftBeam} className="absolute top-[1px] right-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8)] origin-right"></div>
        
        {/* Right Expanding Beam */}
        <div ref={rightBeam} className="absolute top-[1px] left-1/2 w-1/2 h-[2px] bg-gradient-to-l from-transparent via-indigo-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8)] origin-left"></div>

        {/* Center Impact Pulse */}
        <div ref={centerPulse} className="absolute top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[4px] w-24 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,1),0_0_30px_rgba(34,211,238,0.8)] blur-[0.5px]"></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* Brand & About (Col span 4) */}
          <div className="lg:col-span-4 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_10px_30px_rgba(99,102,241,0.3)]">
                <GraduationCap className="h-7 w-7 text-white" />
                <Sparkles className="absolute -top-1.5 -right-1.5 h-4 w-4 text-yellow-300 drop-shadow-md" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">CSE<span className="text-indigo-600">.</span></span>
                <span className="text-[9px] font-black tracking-[0.15em] text-indigo-600/80 dark:text-indigo-400 uppercase mt-1.5">Dept. of Computer Science</span>
              </div>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-8 max-w-sm font-medium">
              Pabna University of Science and Technology. Empowering the next generation of engineers and technologists through innovation and research.
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {[
                { icon: Globe, href: "#" },
                { icon: MessageCircle, href: "#" },
                { icon: Share2, href: "#" },
                { icon: Video, href: "#" },
              ].map((Social, idx) => (
                <Link key={idx} href={Social.href} className="flex items-center justify-center h-11 w-11 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-white dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 hover:border-indigo-600 dark:hover:border-indigo-500 shadow-[0_4px_15px_rgba(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_10px_25px_rgba(79,70,229,0.3)] hover:-translate-y-1 transition-all duration-300">
                  <Social.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links (Col span 2) */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-slate-900 dark:text-white font-extrabold tracking-[0.1em] uppercase text-xs mb-6">Quick Links</h4>
            <ul className="flex flex-col gap-4">
              {['About Us', 'Academic Programs', 'Faculty Members', 'Research Hub', 'Campus Life'].map((link, idx) => (
                <li key={idx}>
                  <Link href="#" className="text-slate-600 dark:text-slate-400 text-sm font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 transition-colors group-hover:scale-150"></span>
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals (Col span 2) */}
          <div className="lg:col-span-2">
            <h4 className="text-slate-900 dark:text-white font-extrabold tracking-[0.1em] uppercase text-xs mb-6">Portals</h4>
            <ul className="flex flex-col gap-4">
              {['Student Login', 'Faculty Portal', 'Alumni Network', 'Admin Dashboard', 'IT Helpdesk'].map((link, idx) => (
                <li key={idx}>
                  <Link href="#" className="text-slate-600 dark:text-slate-400 text-sm font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2.5 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400 transition-colors group-hover:scale-150"></span>
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info (Col span 3) */}
          <div className="lg:col-span-3">
            <h4 className="text-slate-900 dark:text-white font-extrabold tracking-[0.1em] uppercase text-xs mb-6">Contact Us</h4>
            <ul className="flex flex-col gap-5">
              <li className="flex items-start gap-4 text-slate-700 dark:text-slate-300 font-bold text-sm">
                <div className="p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 shrink-0 mt-0.5">
                  <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="leading-relaxed">Dept. of CSE, Academic Building 1<br/>PUST, Pabna-6600</span>
              </li>
              <li className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-bold text-sm">
                <div className="p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 shrink-0">
                  <Phone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span>+880 1234 567890</span>
              </li>
              <li className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-bold text-sm">
                <div className="p-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 shrink-0">
                  <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span>contact@cse.pust.ac.bd</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-300/50 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xs font-black tracking-wide text-slate-500 dark:text-slate-500 uppercase">
            &copy; {new Date().getFullYear()} CSE Department. All rights reserved.
          </div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm dark:shadow-none px-5 py-2.5 rounded-full border border-white dark:border-slate-800">
            Built with <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse drop-shadow-sm" /> by <span className="text-indigo-600 dark:text-indigo-400 font-black tracking-wide">CSE Batch &#39;22</span>
          </div>

          <div className="flex items-center gap-5 text-xs font-black tracking-wide uppercase text-slate-500 dark:text-slate-500">
            <Link href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Privacy</Link>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <Link href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Terms</Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
