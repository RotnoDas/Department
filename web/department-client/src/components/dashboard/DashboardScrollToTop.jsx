"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";

export function DashboardScrollToTop() {
  const [isScrollVisible, setIsScrollVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (typeof window !== "undefined") {
        if (window.scrollY > 300) {
          setIsScrollVisible(true);
        } else {
          setIsScrollVisible(false);
        }
      }
    };

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      document.documentElement.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="fixed bottom-8 right-6 md:right-10 z-[100] flex flex-col gap-5 items-end pointer-events-none">
      <AnimatePresence>
        {isScrollVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.35, type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto relative group"
          >
            {/* Soft background glow */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-600 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-500"></div>

            <button
              type="button"
              onClick={scrollToTop}
              className="relative flex items-center justify-center h-12 w-12 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-indigo-100 dark:border-slate-700/80 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.45)] hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden z-10 cursor-pointer"
              title="Move to top"
              aria-label="Scroll to top of dashboard"
            >
              {/* Hover Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Floating Arrow */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <ArrowUp
                  className="h-5 w-5 text-slate-700 dark:text-slate-200 group-hover:text-white transition-colors duration-300"
                  strokeWidth={2.5}
                />
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
