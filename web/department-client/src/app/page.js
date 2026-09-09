"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Import Modular Components
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { NoticeMarquee } from "@/components/landing/NoticeMarquee";
import { KeyStatistics } from "@/components/landing/KeyStatistics";
import { CoreFeatures } from "@/components/landing/CoreFeatures";

import { AiIntelligence } from "@/components/landing/AiIntelligence";
import { EventsNotices } from "@/components/landing/EventsNotices";
import { HelpSupport } from "@/components/landing/HelpSupport";
import { FloatingActions } from "@/components/landing/FloatingActions";

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Initial Load Animations (Hero)
      const tl = gsap.timeline();
      
      tl.fromTo(
        ".gsap-nav",
        { y: -40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "expo.out" }
      )
      .fromTo(
        ".gsap-hero-item",
        { y: 60, opacity: 0, rotateX: -15 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.15, ease: "power4.out", transformPerspective: 1000 },
        "-=0.6"
      );

      // 2. Premium Parallax Backgrounds (Scrubbed)
      gsap.to(".bg-orb-1", {
        yPercent: 50,
        xPercent: -20,
        rotation: 45,
        ease: "none",
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom top", scrub: 1.5 }
      });
      gsap.to(".bg-orb-2", {
        yPercent: -40,
        xPercent: 30,
        rotation: -45,
        ease: "none",
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom top", scrub: 2 }
      });

      // 3. Staggered Fade-Up with scale for all sections
      const sections = [".gsap-stat-card", ".gsap-feature-card"];
      sections.forEach(selector => {
        gsap.fromTo(
          selector,
          { y: 80, opacity: 0, scale: 0.9 },
          {
            y: 0, opacity: 1, scale: 1, duration: 1, stagger: 0.15, ease: "back.out(1.5)",
            scrollTrigger: { trigger: selector, start: "top 85%", toggleActions: "play none none reverse" }
          }
        );
      });


      
      // 5. Global smooth scrub for specific elements (if any component uses .gsap-scrub)
      gsap.utils.toArray('.gsap-scrub').forEach(el => {
        gsap.to(el, {
          y: -80,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 }
        });
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={containerRef} className="min-h-screen bg-[#F8FAFC] overflow-x-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      {/* Background Dynamic Blur Gradients (Glassmorphism effect) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 backdrop-blur-[2px]">
        <div className="bg-orb-1 absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-40">
          <div className="w-full h-full rounded-full bg-indigo-200 blur-[150px] animate-blob"></div>
        </div>
        <div className="bg-orb-2 absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-40">
          <div className="w-full h-full rounded-full bg-sky-200 blur-[150px] animate-blob animation-delay-2000"></div>
        </div>
        <div className="absolute -bottom-[20%] left-[10%] h-[70%] w-[70%] opacity-30">
          <div className="w-full h-full rounded-full bg-purple-200 blur-[150px] animate-blob animation-delay-4000"></div>
        </div>
        <div className="absolute top-[40%] left-[40%] h-[50%] w-[50%] opacity-30">
          <div className="w-full h-full rounded-full bg-pink-200 blur-[150px] animate-blob animation-delay-6000"></div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <section className="mx-auto max-w-[1400px] px-6 pt-8 pb-20 lg:px-10 flex-1 w-full flex flex-col gap-12">
          
          <Navbar />
          <HeroSection />
          
          <div className="px-6 lg:px-0">
            <NoticeMarquee />
          </div>

          <KeyStatistics />
          <CoreFeatures />

          <AiIntelligence />
          <EventsNotices />
          <HelpSupport />
          
        </section>

        <Footer />
        <FloatingActions />
      </div>
    </main>
  );
}
