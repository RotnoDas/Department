"use client";

import React from "react";
import { Sparkles } from "lucide-react";

/**
 * Reusable Loading Fallback Component
 * Features glowing aura, triple counter-rotating rings, center pulse icon,
 * gradient animated text, and staggered bouncing indicators.
 *
 * @param {string} text - Primary loading headline (defaults to "Loading...")
 * @param {string} subtext - Optional secondary explanatory subtitle
 * @param {boolean} fullScreen - Centers within full viewport/container height
 * @param {"sm" | "md" | "lg"} size - Visual size scaling
 */
export default function Loading({ 
  text = "Loading...", 
  subtext = "", 
  fullScreen = false,
  size = "md" 
}) {
  const sizeConfig = {
    sm: {
      ringBox: "h-20 w-20",
      ring1: "border-t-[3px] border-r-[3px]",
      ring2: "inset-2 border-b-[3px] border-l-[3px]",
      ring3: "inset-4 border-t-[2.5px]",
      icon: "h-5 w-5",
      textClass: "text-sm",
      dot: "w-2 h-2",
      mt: "mt-6",
    },
    md: {
      ringBox: "h-32 w-32",
      ring1: "border-t-[5px] border-r-[5px]",
      ring2: "inset-3 border-b-[5px] border-l-[5px]",
      ring3: "inset-6 border-t-[4px]",
      icon: "h-8 w-8",
      textClass: "text-lg md:text-xl",
      dot: "w-2.5 h-2.5",
      mt: "mt-8",
    },
    lg: {
      ringBox: "h-44 w-44",
      ring1: "border-t-[6px] border-r-[6px]",
      ring2: "inset-4 border-b-[6px] border-l-[6px]",
      ring3: "inset-8 border-t-[5px]",
      icon: "h-11 w-11",
      textClass: "text-2xl md:text-3xl",
      dot: "w-3 h-3",
      mt: "mt-10",
    },
  }[size] || sizeConfig.md;

  const content = (
    <div className="flex flex-col items-center justify-center py-10 w-full animate-in fade-in duration-300 select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing pulsing aura */}
        <div className="absolute inset-0 rounded-full blur-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-sky-400 opacity-30 dark:opacity-40 animate-pulse scale-150 pointer-events-none"></div>

        {/* Concentric Spinning Rings */}
        <div className={`relative flex ${sizeConfig.ringBox} items-center justify-center`}>
          {/* Ring 1 - Primary Indigo (clockwise 3s) */}
          <div 
            className={`absolute inset-0 rounded-full ${sizeConfig.ring1} border-indigo-600 dark:border-indigo-400 border-opacity-70 animate-[spin_3s_linear_infinite]`}
          ></div>

          {/* Ring 2 - Secondary Purple (counter-clockwise 2s) */}
          <div 
            className={`absolute ${sizeConfig.ring2} rounded-full border-purple-600 dark:border-purple-400 border-opacity-80 animate-[spin_2s_linear_infinite_reverse]`}
          ></div>

          {/* Ring 3 - Sky Accent (clockwise 1.5s) */}
          <div 
            className={`absolute ${sizeConfig.ring3} rounded-full border-sky-500 dark:border-sky-400 animate-[spin_1.5s_linear_infinite]`}
          ></div>

          {/* Center glowing badge with icon */}
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-full p-2.5 shadow-lg border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
            <Sparkles className={`${sizeConfig.icon} text-indigo-600 dark:text-indigo-400 animate-pulse`} />
          </div>
        </div>
      </div>

      {/* Loading Headline & Bouncing Dots */}
      <div className={`${sizeConfig.mt} flex flex-col items-center z-10 relative text-center px-4`}>
        <h3 className={`${sizeConfig.textClass} font-black tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-500 dark:from-indigo-400 dark:via-purple-400 dark:to-sky-400 drop-shadow-sm`}>
          {text}
        </h3>

        {subtext && (
          <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm">
            {subtext}
          </p>
        )}

        {/* Three staggered bouncing dots */}
        <div className="flex gap-2 mt-3.5">
          <div 
            className={`${sizeConfig.dot} rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce shadow-md`}
            style={{ animationDelay: "0ms" }}
          ></div>
          <div 
            className={`${sizeConfig.dot} rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce shadow-md`}
            style={{ animationDelay: "150ms" }}
          ></div>
          <div 
            className={`${sizeConfig.dot} rounded-full bg-sky-500 dark:bg-sky-400 animate-bounce shadow-md`}
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center w-full">
        {content}
      </div>
    );
  }

  return content;
}
