"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ChevronsDown, ChevronsUp } from "lucide-react";

/**
 * SectionCollapseToggle
 * Renders an accessible, stylish button to collapse or expand an individual dashboard section.
 */
export function SectionCollapseToggle({
  isCollapsed,
  onToggle,
  label = "",
  size = "md",
  className = "",
}) {
  const isSmall = size === "sm";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition-all border border-slate-200/70 dark:border-slate-700/70 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98] ${
        isSmall ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${className}`}
      title={isCollapsed ? `Expand ${label || "section"}` : `Collapse ${label || "section"}`}
      aria-expanded={!isCollapsed}
    >
      <span className="font-semibold text-slate-600 dark:text-slate-300">
        {isCollapsed ? "Expand" : "Collapse"}
      </span>
      {isCollapsed ? (
        <ChevronDown className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
      ) : (
        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
      )}
    </button>
  );
}

/**
 * CollapsibleBody
 * Animates section content open/closed with Framer Motion.
 * Displays a clean placeholder prompt when collapsed.
 */
export function CollapsibleBody({
  isCollapsed,
  children,
  onExpand,
  sectionName = "Section",
  className = "space-y-6 pt-1",
}) {
  return (
    <AnimatePresence initial={false}>
      {!isCollapsed ? (
        <motion.div
          key="expanded-content"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      ) : (
        <motion.div
          key="collapsed-banner"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          onClick={onExpand}
          className="py-3 px-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all group"
        >
          <span className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:bg-indigo-500 transition-colors"></span>
            <span>{sectionName} content is collapsed</span>
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline inline-flex items-center gap-1">
            <span>Click to Expand</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * DashboardCollapseControls
 * Renders top-level quick controls to collapse or expand all dashboard sections at once.
 */
export function DashboardCollapseControls({
  onCollapseAll,
  onExpandAll,
  allCollapsed = false,
  className = "",
}) {
  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 ${className}`}>
      <button
        type="button"
        onClick={onExpandAll}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          !allCollapsed
            ? "bg-white/20 text-white shadow-xs"
            : "text-slate-200 hover:text-white hover:bg-white/10"
        }`}
        title="Expand all sections on this dashboard"
      >
        <ChevronsDown className="w-3.5 h-3.5" />
        <span>Expand All</span>
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          allCollapsed
            ? "bg-white/20 text-white shadow-xs"
            : "text-slate-200 hover:text-white hover:bg-white/10"
        }`}
        title="Collapse all sections on this dashboard"
      >
        <ChevronsUp className="w-3.5 h-3.5" />
        <span>Collapse All</span>
      </button>
    </div>
  );
}

/**
 * CollapsibleCard
 * Standalone container that combines header, title, badge, actions, toggle, and animated body.
 */
export function CollapsibleCard({
  id,
  title,
  subtitle,
  badge,
  icon: Icon,
  headerActions,
  isCollapsed,
  onToggle,
  children,
  className = "p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6",
}) {
  return (
    <div id={id} className={className}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
        <div>
          {badge && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              {Icon && <Icon className="w-3.5 h-3.5 text-indigo-500" />}
              <span>{badge}</span>
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {!badge && Icon && <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            <span>{title}</span>
          </h2>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {headerActions}
          <SectionCollapseToggle
            isCollapsed={isCollapsed}
            onToggle={onToggle}
            label={typeof title === "string" ? title : "Section"}
          />
        </div>
      </div>

      <CollapsibleBody
        isCollapsed={isCollapsed}
        onExpand={onToggle}
        sectionName={typeof title === "string" ? title : "Section"}
      >
        {children}
      </CollapsibleBody>
    </div>
  );
}
