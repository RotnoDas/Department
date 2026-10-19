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
        lerp: 0.1,
        duration: 1.0,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
        infinite: false,
        prevent: (node) => {
          if (!node || typeof node.closest !== "function") return false;
          // When cursor is over any scrollable element, table, modal, checklist, or sidebar,
          // let that element scroll natively instead of scrolling the whole root dashboard!
          return Boolean(
            node.hasAttribute?.("data-lenis-prevent") ||
            node.closest(
              [
                "[data-lenis-prevent]",
                "[data-scroll-container]",
                ".smart-scroll-container",
                "aside",
                "nav",
                "table",
                ".overflow-y-auto",
                ".overflow-x-auto",
                ".overflow-auto",
                '[role="dialog"]',
                ".fixed.inset-0",
                "select",
                "textarea",
                "pre"
              ].join(",")
            )
          );
        },
      }}
    >
      <LenisScrollTriggerBridge />
      {children}
    </ReactLenis>
  );
}
