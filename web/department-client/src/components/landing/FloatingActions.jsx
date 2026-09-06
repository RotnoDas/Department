"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, MessageSquareText } from "lucide-react";
import { Button } from "@heroui/react";

export function FloatingActions() {
  const [isScrollVisible, setIsScrollVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsScrollVisible(true);
      } else {
        setIsScrollVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <div className="fixed bottom-8 right-6 md:right-10 z-[100] flex flex-col gap-5 items-end pointer-events-none">
      
      {/* Scroll to Top Button */}
      <AnimatePresence>
        {isScrollVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto relative group"
          >
            {/* Soft background glow */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-indigo-500 to-transparent opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500"></div>

            <button
              onClick={scrollToTop}
              className="relative flex items-center justify-center h-12 w-12 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-indigo-100 dark:border-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_40px_rgba(99,102,241,0.4)] hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1.5 overflow-hidden z-10"
            >
              {/* Vibrant Hover Background */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Smoothly Floating Arrow */}
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <ArrowUp className="h-5 w-5 text-slate-600 dark:text-slate-300 group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
              </motion.div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Chat Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        className="group pointer-events-auto relative"
      >
        {/* Hover Tooltip */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 opacity-0 translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-400 whitespace-nowrap">
          Need Help? Chat with us!
          <div className="absolute right-[-5.5px] top-1/2 -translate-y-1/2 w-3 h-3 bg-white dark:bg-slate-800 border-r border-t border-slate-100 dark:border-slate-700 rotate-45"></div>
        </div>

        {/* Outer Pulsating Ring */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        
        <button
          onClick={() => console.log("Chat button clicked! Functionality to be added later.")}
          className="relative flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_10px_40px_rgba(99,102,241,0.5)] hover:shadow-[0_15px_50px_rgba(99,102,241,0.7)] transition-all duration-300 hover:scale-110"
        >
          {/* Inner Glow */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/20 to-transparent"></div>
          
          <MessageSquareText className="relative z-10 h-7 w-7 text-white group-hover:scale-110 transition-transform duration-300" />
          
          {/* Online Indicator Dot */}
          <span className="absolute top-1 right-1 flex h-3.5 w-3.5 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-slate-900 shadow-sm"></span>
          </span>
        </button>
      </motion.div>

    </div>
  );
}
