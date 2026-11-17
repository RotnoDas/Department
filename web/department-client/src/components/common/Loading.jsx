"use client";

import React from "react";
import { GraduationCap } from "lucide-react";

/**
 * Formal, Academic Loading Fallback Component
 * Simple, elegant spinner with university graduation emblem, clean typography,
 * and a refined indeterminate progress line. Designed for formal academic portals.
 *
 * @param {string} text - Primary loading headline (defaults to "Loading...")
 * @param {string} subtext - Optional secondary explanatory subtitle
 * @param {boolean} fullScreen - Centers within full viewport/container height
 * @param {"sm" | "md" | "lg"} size - Visual size scaling (default: "md")
 */
export default function Loading({ 
  text = "Loading...", 
  subtext = "", 
  fullScreen = false,
  size = "md" 
}) {
  const sizeConfig = {
    sm: {
      outerBox: "h-11 w-11",
      icon: "h-4 w-4",
      innerBadge: "p-2",
      textClass: "text-xs font-semibold",
      subtextClass: "text-[11px]",
      barTrack: "w-28 h-0.5 mt-2.5",
      spacing: "mt-3",
    },
    md: {
      outerBox: "h-16 w-16",
      icon: "h-6 w-6",
      innerBadge: "p-3",
      textClass: "text-sm sm:text-base font-semibold",
      subtextClass: "text-xs",
      barTrack: "w-36 sm:w-44 h-1 mt-3",
      spacing: "mt-4",
    },
    lg: {
      outerBox: "h-20 w-20",
      icon: "h-8 w-8",
      innerBadge: "p-4",
      textClass: "text-base sm:text-lg font-semibold",
      subtextClass: "text-xs sm:text-sm",
      barTrack: "w-48 sm:w-56 h-1 mt-4",
      spacing: "mt-5",
    },
  }[size] || {
    outerBox: "h-16 w-16",
    icon: "h-6 w-6",
    innerBadge: "p-3",
    textClass: "text-sm sm:text-base font-semibold",
    subtextClass: "text-xs",
    barTrack: "w-36 sm:w-44 h-1 mt-3",
    spacing: "mt-4",
  };

  const content = (
    <div className="flex flex-col items-center justify-center py-8 px-4 w-full select-none animate-in fade-in duration-300">
      {/* Formal Dual-Track Academic Spinner */}
      <div className="relative flex items-center justify-center">
        {/* Soft, dignified institutional glow (pure subtle indigo tone, no multi-color aura) */}
        <div className="absolute inset-0 rounded-full bg-indigo-500/10 dark:bg-indigo-400/10 blur-xl scale-125 pointer-events-none" />

        {/* Circular Spinner System */}
        <div className={`relative flex ${sizeConfig.outerBox} items-center justify-center`}>
          {/* Subtle static circular track */}
          <div className="absolute inset-0 rounded-full border-2 border-slate-200/90 dark:border-slate-800" />

          {/* Active precision spinning arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-600 dark:border-t-indigo-400 border-r-indigo-600/40 dark:border-r-indigo-400/40 animate-spin" />

          {/* Center Academic Emblem Badge */}
          <div className={`relative bg-white dark:bg-slate-900 rounded-full ${sizeConfig.innerBadge} shadow-xs border border-slate-200/90 dark:border-slate-800 flex items-center justify-center`}>
            <GraduationCap className={`${sizeConfig.icon} text-indigo-600 dark:text-indigo-400 transition-colors animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Formal Headline & Subtitle */}
      <div className={`${sizeConfig.spacing} flex flex-col items-center text-center max-w-sm`}>
        <h3 className={`${sizeConfig.textClass} text-slate-800 dark:text-slate-100 tracking-tight`}>
          {text}
        </h3>

        {subtext && (
          <p className={`${sizeConfig.subtextClass} text-slate-500 dark:text-slate-400 mt-1 leading-relaxed`}>
            {subtext}
          </p>
        )}

        {/* Refined Indeterminate Progress Line */}
        <div className={`${sizeConfig.barTrack} bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative`}>
          <div className="animate-formal-progress absolute inset-y-0 rounded-full bg-indigo-600 dark:bg-indigo-400" />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center w-full">
        {content}
      </div>
    );
  }

  return content;
}
