"use client";

import React, { useEffect } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Bridge component that keeps GSAP ScrollTrigger timelines and
 * parallax animations in lockstep with Lenis smooth scrolling.
 */
function LenisScrollTriggerBridge() {
  useLenis(() => {
    ScrollTrigger.update();
  });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Refresh ScrollTrigger calculations after Lenis initializes
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

/**
 * SmoothScrollProvider integrates the modern Lenis smooth scrolling engine.
 * Normalizes scroll physics across browsers, eliminates choppiness,
 * and maintains full keyboard, accessibility, and touch support.
 */
export default function SmoothScrollProvider({ children }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.1,             // Inertial easing (0.1 is smooth, natural & responsive)
        duration: 1.2,         // Scrolling transition duration
        smoothWheel: true,     // Smooth mouse wheel scrolling
        wheelMultiplier: 1.0,  // Natural scroll speed factor
        touchMultiplier: 1.5,  // Natural mobile & trackpad response
        infinite: false,
      }}
    >
      <LenisScrollTriggerBridge />
      {children}
    </ReactLenis>
  );
}
