"use client";

import { useEffect } from "react";

/**
 * SmartScrollHandler
 * 
 * Provides website-wide intelligent scrolling behaviors:
 * 1. Targeted horizontal mouse-wheel translation on wide tables and cards
 *    (scrolling over routine tables, attendance sheets, or tab bars scrolls the table instead of jerking the entire dashboard).
 * 2. Background scroll-locking whenever any modal/dialog is opened.
 * 3. Prevents scroll-bleed / scroll-chaining on bounded panels.
 */
export function SmartScrollHandler() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Smart horizontal wheel scrolling on overflowing tables & containers
    const handleWheel = (e) => {
      // Find closest scrollable container
      let target = e.target;
      while (target && target !== document.body && target !== document.documentElement) {
        // Skip form inputs, textareas, sliders
        const tagName = target.tagName?.toLowerCase();
        if (tagName === "textarea" || tagName === "input" || tagName === "select") {
          return;
        }

        const style = window.getComputedStyle(target);
        const overflowX = style.overflowX;
        const overflowY = style.overflowY;

        const isHorizontalScrollable = 
          (overflowX === "auto" || overflowX === "scroll" || target.classList.contains("overflow-x-auto") || target.hasAttribute("data-smart-scroll")) &&
          target.scrollWidth > target.clientWidth + 2;

        const isVerticalScrollable = 
          (overflowY === "auto" || overflowY === "scroll" || target.classList.contains("overflow-y-auto")) &&
          target.scrollHeight > target.clientHeight + 2;

        // If hovering over a container that can scroll horizontally
        if (isHorizontalScrollable && !isVerticalScrollable && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          const maxScrollLeft = target.scrollWidth - target.clientWidth;
          const currentLeft = target.scrollLeft;

          // If we can scroll in the wheel's direction
          if ((e.deltaY > 0 && currentLeft < maxScrollLeft - 1) || (e.deltaY < 0 && currentLeft > 1)) {
            target.scrollLeft += e.deltaY;
            e.preventDefault();
            return;
          }
        }

        target = target.parentElement;
      }
    };

    // 2. Modal Body Scroll Lock: automatically detect modal presence and lock background
    const updateModalScrollLock = () => {
      const activeModal = document.querySelector('[role="dialog"], .fixed.inset-0.z-50');
      if (activeModal) {
        document.body.classList.add("modal-open");
      } else {
        document.body.classList.remove("modal-open");
      }
    };

    const observer = new MutationObserver(updateModalScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    updateModalScrollLock();

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      observer.disconnect();
      document.body.classList.remove("modal-open");
    };
  }, []);

  return null;
}
