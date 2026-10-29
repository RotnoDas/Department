"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, X, Bot, Sparkles, Move } from "lucide-react";
import { AiChatBot } from "@/components/landing/AiChatBot";

export function FloatingActions() {
  const [isScrollVisible, setIsScrollVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatCorner, setChatCorner] = useState("bottom-right");
  const [windowSize, setWindowSize] = useState({ width: 1280, height: 800 });

  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });

  // Measure screen size safely on client mount & resize for drag boundary constraints
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      handleResize();

      const savedCorner = localStorage.getItem("dept_chatbot_corner");
      if (savedCorner && ["bottom-right", "bottom-left", "top-right", "top-left"].includes(savedCorner)) {
        setChatCorner(savedCorner);
      }

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Scroll to Top visibility tracker
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

  // Drag handlers with movement threshold to prevent accidental clicks
  const handleDragStart = (event, info) => {
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: info.point.x, y: info.point.y };
  };

  const handleDrag = (event, info) => {
    const dx = info.point.x - dragStartPosRef.current.x;
    const dy = info.point.y - dragStartPosRef.current.y;
    if (Math.hypot(dx, dy) > 8) {
      isDraggingRef.current = true;
    }
  };

  const handleDragEnd = (event, info) => {
    const dx = info.point.x - dragStartPosRef.current.x;
    const dy = info.point.y - dragStartPosRef.current.y;
    const moved = Math.hypot(dx, dy);

    if (moved > 8) {
      isDraggingRef.current = true;
      // Retain dragging flag briefly so the click event following pointer-up is ignored
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 150);

      // Detect dropped quadrant / corner of the screen
      if (typeof window !== "undefined") {
        const screenW = window.innerWidth;
        const screenH = window.innerHeight;
        const isLeftSide = info.point.x < screenW / 2;
        const isTopSide = info.point.y < screenH / 2;

        let newCorner = "bottom-right";
        if (isLeftSide && isTopSide) newCorner = "top-left";
        else if (isLeftSide && !isTopSide) newCorner = "bottom-left";
        else if (!isLeftSide && isTopSide) newCorner = "top-right";
        else newCorner = "bottom-right";

        setChatCorner(newCorner);
        try {
          localStorage.setItem("dept_chatbot_corner", newCorner);
        } catch (_) {}
      }
    } else {
      isDraggingRef.current = false;
    }
  };

  const handleCircleClick = () => {
    if (isDraggingRef.current) return;
    setIsChatOpen((prev) => !prev);
  };

  const isLeft = chatCorner.includes("left");
  const isTop = chatCorner.includes("top");

  // Drag boundaries within viewport
  const dragConstraints = {
    left: -(Math.max(windowSize.width - 96, 300)),
    right: 0,
    top: -(Math.max(windowSize.height - 110, 400)),
    bottom: 0,
  };

  return (
    <>
      {/* 
        AI Chat Assistant Window (Fixed in chosen corner, NOT draggable, clean & stable)
      */}
      <AiChatBot 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)}
        isLeft={isLeft}
        isTop={isTop}
        corner={chatCorner}
      />

      {/* 
        Independent Scroll to Top Button (Stays at bottom-right, independent from dragged chat bubble)
      */}
      <AnimatePresence>
        {isScrollVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-28 right-6 md:right-8 z-[90] pointer-events-auto"
          >
            <button
              onClick={scrollToTop}
              title="Scroll to top"
              className="relative flex items-center justify-center h-11 w-11 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-2xl border border-indigo-100 dark:border-slate-700 shadow-[0_8px_25px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_35px_rgba(99,102,241,0.35)] hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-600 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <ArrowUp className="relative z-10 h-5 w-5 text-slate-600 dark:text-slate-300 group-hover:text-white transition-colors duration-300" strokeWidth={2.5} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        Floating Draggable Chat Circle (Draggable across the screen when closed, fixed when open)
      */}
      <motion.div
        drag={!isChatOpen}
        dragMomentum={false}
        dragElastic={0.08}
        dragConstraints={dragConstraints}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.12, cursor: "grabbing" }}
        className="fixed bottom-8 right-6 md:right-8 z-[100] touch-none select-none pointer-events-auto group"
      >
        {/* Floating Hover Tooltip (shown only when chat is closed and not dragging) */}
        {!isChatOpen && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              isLeft ? "left-full ml-3" : "right-full mr-3"
            } px-3 py-1.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-xs font-medium shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap flex items-center gap-1.5 z-50`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>CSE AI Assistant</span>
          </div>
        )}

        {/* Outer Pulsating Halo when idle & closed */}
        {!isChatOpen && (
          <div className="absolute inset-0 rounded-full bg-indigo-500/35 animate-[ping_3.2s_cubic-bezier(0,0,0.2,1)_infinite] pointer-events-none" />
        )}

        {/* 
          Inner Floating Animated Circle:
          Gentle floating/bobbing when closed so it feels weightless and floating.
        */}
        <motion.div
          animate={isChatOpen ? { y: 0 } : { y: [0, -6, 0] }}
          transition={
            isChatOpen
              ? { duration: 0.2 }
              : { repeat: Infinity, duration: 3, ease: "easeInOut" }
          }
        >
          <button
            onClick={handleCircleClick}
            aria-label={isChatOpen ? "Close AI chat assistant" : "Open AI chat assistant (Draggable)"}
            className={`relative flex items-center justify-center h-16 w-16 rounded-full transition-all duration-300 ${
              isChatOpen
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl cursor-pointer hover:scale-105"
                : "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-[0_12px_35px_rgba(99,102,241,0.5)] hover:shadow-[0_18px_50px_rgba(99,102,241,0.7)] text-white cursor-grab active:cursor-grabbing hover:scale-105"
            }`}
          >
            {/* Inner Sheen Glow when closed */}
            {!isChatOpen && (
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/25 to-transparent pointer-events-none" />
            )}

            <AnimatePresence mode="wait">
              {isChatOpen ? (
                <motion.div
                  key="close-icon"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-7 w-7" />
                </motion.div>
              ) : (
                <motion.div
                  key="chat-icon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Bot className="h-7 w-7" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Online Live Status Pulse */}
            {!isChatOpen && (
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5 z-20 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm" />
              </span>
            )}
          </button>
        </motion.div>
      </motion.div>
    </>
  );
}
