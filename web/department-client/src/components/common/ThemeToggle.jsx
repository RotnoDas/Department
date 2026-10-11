"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme, mounted } = useTheme();

  // If not mounted yet, render placeholder to avoid SSR mismatch
  if (!mounted) {
    return (
      <div className={`w-11 h-11 rounded-2xl bg-white/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 ${className}`} />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`
        relative flex h-11 w-11 items-center justify-center rounded-2xl
        transition-all duration-300 cursor-pointer group
        bg-white/70 dark:bg-slate-800/80
        border border-slate-200/80 dark:border-slate-700/80
        shadow-sm hover:shadow-md dark:shadow-none
        hover:scale-105 active:scale-95
        ${className}
      `}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, scale: 0, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        exit={{ rotate: 90, scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center justify-center"
      >
        {isDark ? (
          <Moon className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
        ) : (
          <Sun className="w-5 h-5 text-amber-500 group-hover:text-amber-600 transition-colors drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
        )}
      </motion.div>
    </button>
  );
}
