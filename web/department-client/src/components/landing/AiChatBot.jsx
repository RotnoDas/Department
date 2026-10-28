"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  User, 
  ExternalLink,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight,
  Compass,
  BookOpen,
  Calendar,
  Shield,
  HelpCircle,
  MessageSquare,
  GraduationCap,
  Lock,
  Mic,
  Square
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

// Checks whether a route requires an authorized login
function isProtectedLink(url) {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.startsWith("/dashboard") ||
    clean.startsWith("/routine") ||
    clean.startsWith("/attendance") ||
    clean.startsWith("/teacher") ||
    clean.startsWith("/admin") ||
    clean.startsWith("/student") ||
    clean.startsWith("/employee")
  );
}

// Safely sanitize and whitelist URLs to prevent broken 404 links
function sanitizeLink(url) {
  if (!url) return "/";
  const clean = url.trim();
  if (clean.startsWith("/routine") || clean === "/schedule") return "/dashboard/student";
  if (clean.startsWith("/#curriculum") || clean.startsWith("/curriculum") || clean === "/courses") return "/#features";
  if (clean.startsWith("/attendance") || clean === "/liveness") return "/dashboard/student";
  if (clean.startsWith("/complaint") || clean.startsWith("/grievance")) return "/#support";
  if (clean.startsWith("/notice")) return "/notices";
  return clean;
}

// Interactive categorized quick questions
const CATEGORIES = [
  { id: "all", label: "🎯 All", icon: Compass },
  { id: "attendance", label: "📍 Attendance", icon: Shield },
  { id: "routine", label: "📅 Routine", icon: Calendar },
  { id: "courses", label: "📚 Courses", icon: BookOpen },
  { id: "support", label: "🛡️ Support", icon: HelpCircle },
  { id: "bengali", label: "🇧🇩 বাংলা", icon: MessageSquare }
];

const CATEGORIZED_QUESTIONS = {
  all: [
    "How does Face Attendance & Geofencing work?",
    "What is the weekly Class Routine schedule?",
    "How do I submit an anonymous grievance?",
    "What courses are taught in Semester 6?",
    "How do new student accounts get approved?",
    "What are the office hours & hotline contact?"
  ],
  attendance: [
    "How does Face Attendance & Geofencing work?",
    "What if I am outside the 10-meter geofence?",
    "How does active liveness detect photo spoofing?",
    "What is Eye Aspect Ratio (EAR) blink detection?"
  ],
  routine: [
    "What is the weekly Class Routine schedule?",
    "Where are Software Lab 1 and AI Lab located?",
    "What are the Friday and Thursday weekend policies?",
    "How are teacher lecture conflicts resolved?"
  ],
  courses: [
    "What courses are taught in Semester 6?",
    "What are the core subjects in Semester 7 & 8?",
    "How many total credits are required for B.Sc.?",
    "What programming languages are taught in 1st year?"
  ],
  support: [
    "How do I submit an anonymous grievance?",
    "How do I track my ticket reference code?",
    "Can administrators submit complaints on the homepage?",
    "Who reviews and resolves lodged issues?"
  ],
  bengali: [
    "স্মার্ট ফেস হাজিরা কিভাবে কাজ করে?",
    "ক্লাস রুটিন ও ল্যাব সময়সূচি কোথায় পাবো?",
    "গোপন অভিযোগ কিভাবে জমা দিবো?",
    "নতুন একাউন্ট কিভাবে এডমিন ভেরিফাই করবে?"
  ]
};

// Strips markdown symbols for audio text-to-speech
function stripMarkdownForAudio(text) {
  if (!text) return "";
  return text
    .replace(/###+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[-*•]\s+/g, "")
    .replace(/\d+\.\s+/g, "")
    .replace(/[👉📍📅🛡️🔐📚📢🎓💡🎯✨🇧🇩]/gu, "")
    .replace(/http[s]?:\/\/\S+/g, "")
    .trim();
}

// Compact, clean markdown-to-JSX renderer with thin layout and auth-aware routing
function RenderMarkdown({ text, isLoggedIn }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-100">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        // Heading 3: ### Title
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={idx} className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mt-1 mb-0.5">
              {formatInline(trimmed.replace(/^###\s+/, ""), isLoggedIn)}
            </h4>
          );
        }

        // Heading 4: #### Title
        if (trimmed.startsWith("#### ")) {
          return (
            <h5 key={idx} className="font-semibold text-xs sm:text-[13px] text-slate-900 dark:text-white mt-1 mb-0.5">
              {formatInline(trimmed.replace(/^####\s+/, ""), isLoggedIn)}
            </h5>
          );
        }

        // Bullet point: - item or * item
        if (/^[-*]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[-*]\s+/, "");
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              <span>{formatInline(itemText, isLoggedIn)}</span>
            </div>
          );
        }

        // Numbered list: 1. item
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)$/);
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-0.5 py-0.5">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px] shrink-0 mt-0.5">
                {match[1]}.
              </span>
              <span>{formatInline(match[2], isLoggedIn)}</span>
            </div>
          );
        }

        // Regular paragraph
        return <p key={idx} className="my-0.5">{formatInline(trimmed, isLoggedIn)}</p>;
      })}
    </div>
  );
}

// Inline formatting: **bold**, [link](url), `code` with login-aware redirection
function formatInline(str, isLoggedIn) {
  if (!str) return "";

  const parts = [];
  let remaining = str;
  let keyIndex = 0;

  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match) {
      parts.push(remaining);
      break;
    }

    const matchIndex = match.index;
    if (matchIndex > 0) {
      parts.push(remaining.substring(0, matchIndex));
    }

    const fullMatch = match[0];

    // [label](url)
    if (fullMatch.startsWith("[")) {
      const label = match[2];
      const rawUrl = match[3];
      const safeUrl = sanitizeLink(rawUrl);
      const isInternal = safeUrl.startsWith("/") || safeUrl.startsWith("#");
      const isProtected = isProtectedLink(safeUrl);

      // If user is not logged in and link is protected, redirect to login-required page
      const targetHref = (!isLoggedIn && isProtected)
        ? `/login-required?target=${encodeURIComponent(safeUrl)}&portal=${encodeURIComponent(label)}`
        : safeUrl;

      if (isInternal) {
        parts.push(
          <Link
            key={keyIndex++}
            href={targetHref}
            className={`font-bold underline hover:opacity-80 inline-flex items-center gap-0.5 ${
              isProtected && !isLoggedIn 
                ? "text-amber-600 dark:text-amber-400 hover:text-amber-700" 
                : "text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
            }`}
          >
            <span>{label}</span>
            {isProtected && !isLoggedIn ? (
              <Lock className="w-2.5 h-2.5 inline text-amber-500 ml-0.5" />
            ) : (
              <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
            )}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={keyIndex++}
            href={targetHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-700 dark:hover:text-indigo-300 inline-flex items-center gap-0.5"
          >
            {label}
            <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
          </a>
        );
      }
    }
    // **bold**
    else if (fullMatch.startsWith("**")) {
      const boldText = match[4];
      parts.push(
        <strong key={keyIndex++} className="font-bold text-slate-900 dark:text-white">
          {boldText}
        </strong>
      );
    }
    // `code`
    else if (fullMatch.startsWith("`")) {
      const codeText = match[5];
      parts.push(
        <code
          key={keyIndex++}
          className="px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]"
        >
          {codeText}
        </code>
      );
    }

    remaining = remaining.substring(matchIndex + fullMatch.length);
  }

  return parts;
}

export function AiChatBot({ 
  isOpen, 
  onClose, 
  isLeft: propIsLeft, 
  isTop: propIsTop, 
  corner = "bottom-right" 
}) {
  const isLeft = propIsLeft !== undefined ? propIsLeft : corner.includes("left");
  const isTop = propIsTop !== undefined ? propIsTop : corner.includes("top");
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isLoggedIn = Boolean(user?.email);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: `Hello! I am the **PUST CSE Academic Portal Assistant**. 🎓
      
I provide verified department assistance via **text and voice**:
- **Smart Attendance:** Active face liveness and classroom 10m geofencing.
- **Weekly Schedule:** Lecture slots, lab allocations, and timetable.
- **Academic Courses:** Curriculum syllabus from Semester 1 to 8.
- **Support & Complaints:** 24/7 confidential grievances and IT tickets.
- **Voice Support:** Tap the 🎙️ **Microphone** to speak in English or বাংলা!

Ask a question or tap a suggestion below to get started!`,
      followUps: [
        "How does Face Attendance work?",
        "What is the weekly Class Schedule?",
        "How do I submit an anonymous grievance?",
        "কিভাবে একাউন্ট রেজিস্ট্রেশন করবো?"
      ],
      actionLinks: [
        { label: "Student Portal", url: "/dashboard/student" },
        { label: "Support Desk", url: "/#support" }
      ],
      model: "PUST CSE Verified Desk"
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [reactions, setReactions] = useState({});

  // Voice Interaction States
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState("bn"); // "bn" or "en"
  const [autoVoiceReply, setAutoVoiceReply] = useState(false); // Whether AI reads out response automatically

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [messages, isOpen, loading]);

  // Clean up speech synthesis & recognition on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setSpeakingIdx(null);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
    }
  }, [isOpen]);

  // Voice Recognition Controls (Speech-to-Text)
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.", { icon: "🎙️" });
      return;
    }

    // Stop ongoing speech playback
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = voiceLang === "bn" ? "bn-BD" : "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.success(voiceLang === "bn" ? "মাইক্রোফোন চালু হয়েছে, বাংলায় বলুন..." : "Listening... Speak in English", { id: "voice-active", icon: "🎙️" });
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (final || interim).trim();
        if (text) {
          setInput(text);
        }
      };

      recognition.onerror = (event) => {
        console.warn("[SpeechRecognition] error:", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone permission denied. Allow mic access in browser.", { id: "voice-err" });
        } else if (event.error !== "no-speech") {
          toast.error(`Mic error: ${event.error}`, { id: "voice-err" });
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("SpeechRecognition start error:", err);
      setIsListening(false);
      toast.error("Could not start microphone.");
    }
  };

  const stopListening = (autoSend = false) => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (autoSend && input.trim()) {
      handleSend(input.trim(), true);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Text-to-Speech Output Handler
  const handleToggleSpeak = (text, idx) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported on this browser.");
      return;
    }

    if (speakingIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = stripMarkdownForAudio(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const isBangla = /[\u0980-\u09FF]/.test(cleanText);
    utterance.lang = isBangla ? "bn-BD" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Localized natural voice selection
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (isBangla) {
        const bnVoice = voices.find((v) => v.lang.includes("bn") || v.name.toLowerCase().includes("bangla") || v.name.toLowerCase().includes("bengali"));
        if (bnVoice) utterance.voice = bnVoice;
      } else {
        const enVoice = voices.find((v) => (v.lang.startsWith("en-US") || v.lang.startsWith("en-GB")) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha")));
        if (enVoice) utterance.voice = enVoice;
      }
    }

    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    setSpeakingIdx(idx);
    window.speechSynthesis.speak(utterance);
  };

  // Handle Send with Voice Awareness
  const handleSend = async (messageText = null, isVoice = false) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    if (isListening) {
      stopListening(false);
    }

    // Stop ongoing audio speech
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }

    const userMessage = { role: "user", text: textToSend, isVoice };
    setMessages((prev) => [...prev, userMessage]);
    if (!messageText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-6).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            text: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const newAssistantIdx = messages.length + 1;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply,
            model: "PUST CSE Verified Desk",
            followUps: data.followUps || [],
            actionLinks: data.actionLinks || [],
          },
        ]);

        // Automatically read aloud if Voice Mode is active OR question was asked via voice
        if (autoVoiceReply || isVoice) {
          setTimeout(() => {
            handleToggleSpeak(data.reply, newAssistantIdx);
          }, 350);
        }
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error("[AiChatBot] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I apologize, but I encountered a temporary connection delay. Please feel free to ask again, or contact the Department Office at **+880 1712-345678**.",
          followUps: ["Tell me the department office hours", "Where is PUST CSE located?"],
          actionLinks: [{ label: "Support Desk", url: "/#support" }],
          model: "PUST CSE Verified Desk"
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyMessage = (text, idx) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success("Response copied to clipboard!");
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const handleReaction = (idx, type) => {
    setReactions((prev) => ({
      ...prev,
      [idx]: prev[idx] === type ? null : type,
    }));
    toast.success(type === "like" ? "Thanks for your feedback! 👍" : "Feedback noted! 👎", {
      icon: type === "like" ? "👍" : "✍️",
    });
  };

  const handleResetChat = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }
    setMessages([
      {
        role: "assistant",
        text: `Chat reset! I am ready for your questions about PUST CSE courses, timetable, attendance, or department services via text or voice. How can I assist?`,
        followUps: [
          "How does Face Attendance work?",
          "What is the weekly Class Schedule?",
          "How do I submit an anonymous grievance?",
          "সিএসই কোর্স সিলেবাস"
        ],
        actionLinks: [
          { label: "Student Portal", url: "/dashboard/student" },
          { label: "Notice Board", url: "/notices" }
        ],
        model: "PUST CSE Verified Desk"
      },
    ]);
    toast.success("Chat history cleared.");
  };

  // Questions for active category
  const currentCategoryQuestions = useMemo(() => {
    return CATEGORIZED_QUESTIONS[activeCategory] || CATEGORIZED_QUESTIONS.all;
  }, [activeCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`fixed z-[110] w-[94vw] sm:w-[460px] h-[640px] max-h-[85vh] rounded-[2rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden ${
            isTop ? "top-20" : "bottom-24"
          } ${
            isLeft ? "left-4 sm:left-8" : "right-4 sm:right-8"
          }`}
        >
          {/* Header - Premium Academic Slate & Indigo Gradient matching website navbar */}
          <div className="relative px-4 sm:px-5 py-3.5 border-b border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-lg select-none">
            
            {/* Left Portal Branding */}
            <div className="flex items-center gap-2.5 min-w-0 pr-1">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-900/40 border border-white/20">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-slate-900" />
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-extrabold text-xs sm:text-sm tracking-tight text-white leading-tight truncate">
                    PUST CSE AI Assistant
                  </h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 shrink-0">
                    Voice & Text
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium leading-none flex items-center gap-1 mt-0.5 truncate">
                  <span>Helpdesk & Voice Guidance</span>
                  <span className="inline-block w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-emerald-400 font-semibold text-[9.5px]">Live</span>
                </p>
              </div>
            </div>

            {/* Right Action Tools: Auto-Voice Mode, Restart, Close */}
            <div className="flex items-center gap-1 shrink-0">
              
              {/* Auto Voice Response Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !autoVoiceReply;
                  setAutoVoiceReply(next);
                  toast.success(next ? "Voice Mode: AI will speak replies" : "Voice Mode: Text replies only", { icon: next ? "🔊" : "🔇" });
                  if (!next && typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    setSpeakingIdx(null);
                  }
                }}
                className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
                  autoVoiceReply 
                    ? "bg-indigo-600 text-white shadow-xs font-bold" 
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                title={autoVoiceReply ? "Voice Mode: Active (click to mute auto-speak)" : "Voice Mode: Inactive (click to enable spoken responses)"}
              >
                {autoVoiceReply ? <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline text-[10px] uppercase font-bold">{autoVoiceReply ? "Voice On" : "Voice"}</span>
              </button>

              {/* Restart Chat */}
              <button
                type="button"
                onClick={handleResetChat}
                title="Restart conversation"
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                title="Close chat"
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3.5 py-1.5 border-b border-slate-200/60 dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                  }`}
                >
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isSpeaking = speakingIdx === idx;
              const reaction = reactions[idx];

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                      isUser
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-slate-700 shadow-xs"
                    }`}
                  >
                    {isUser ? <User className="w-3 h-3" /> : <GraduationCap className="w-3.5 h-3.5" />}
                  </div>

                  {/* Sleek Chat Bubble */}
                  <div
                    className={`relative group rounded-2xl text-xs sm:text-[13px] shadow-2xs leading-relaxed ${
                      isUser
                        ? "max-w-[78%] bg-indigo-600 text-white rounded-tr-xs px-3.5 py-2 leading-snug"
                        : "max-w-[84%] bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-white/10 rounded-tl-xs px-3.5 py-2.5 sm:px-4 sm:py-2.5"
                    }`}
                  >
                    {isUser ? (
                      <div className="flex flex-col">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.isVoice && (
                          <span className="text-[9px] text-indigo-200 flex items-center gap-1 mt-1 opacity-80">
                            <Mic className="w-2.5 h-2.5" /> Voice query
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <RenderMarkdown text={msg.text} isLoggedIn={isLoggedIn} />

                        {/* Interactive Direct Navigation Action Links */}
                        {msg.actionLinks && msg.actionLinks.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap gap-1.5">
                            {msg.actionLinks.map((action, aIdx) => {
                              const safeUrl = sanitizeLink(action.url);
                              const isProtected = isProtectedLink(safeUrl);
                              const targetHref = (!isLoggedIn && isProtected)
                                ? `/login-required?target=${encodeURIComponent(safeUrl)}&portal=${encodeURIComponent(action.label)}`
                                : safeUrl;

                              return (
                                <Link
                                  key={aIdx}
                                  href={targetHref}
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg transition inline-flex items-center gap-1 shadow-xs cursor-pointer ${
                                    isProtected && !isLoggedIn
                                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                                  }`}
                                >
                                  <span>{action.label}</span>
                                  {isProtected && !isLoggedIn ? (
                                    <Lock className="w-2.5 h-2.5 text-amber-200" />
                                  ) : (
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}

                        {/* Interactive Dynamic Follow-Up Prompts */}
                        {msg.followUps && msg.followUps.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/10">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                              <Sparkles className="w-2.5 h-2.5" /> Suggested Next:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {msg.followUps.map((promptText, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => handleSend(promptText)}
                                  className="text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-600 px-2 py-0.5 rounded-lg transition flex items-center gap-1 cursor-pointer"
                                >
                                  <span>{promptText}</span>
                                  <ArrowUpRight className="w-2.5 h-2.5 opacity-60 shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bottom Utility Bar: Clean branding, TTS voice, Copy, Feedback */}
                        <div className="mt-2.5 pt-1.5 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                            PUST CSE Official Portal
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Text to Speech button */}
                            <button
                              type="button"
                              onClick={() => handleToggleSpeak(msg.text, idx)}
                              className={`p-1 rounded-md transition cursor-pointer ${
                                isSpeaking 
                                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold" 
                                  : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              }`}
                              title={isSpeaking ? "Stop voice playback" : "Listen aloud in voice"}
                            >
                              {isSpeaking ? <VolumeX className="w-3 h-3 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                            </button>

                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.text, idx)}
                              className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                              title="Copy message"
                            >
                              {copiedIdx === idx ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>

                            {/* Thumbs Up Reaction */}
                            <button
                              type="button"
                              onClick={() => handleReaction(idx, "like")}
                              className={`p-1 rounded-md transition cursor-pointer ${
                                reaction === "like"
                                  ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50"
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                              title="Helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>

                            {/* Thumbs Down Reaction */}
                            <button
                              type="button"
                              onClick={() => handleReaction(idx, "dislike")}
                              className={`p-1 rounded-md transition cursor-pointer ${
                                reaction === "dislike"
                                  ? "text-rose-500 bg-rose-50 dark:bg-rose-950/50"
                                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                              title="Not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div className="px-3 py-2 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-800/90 border border-slate-200/70 dark:border-white/10 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-[11px] text-slate-400 ml-1 font-medium">Analyzing voice query & formulating verified reply...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Category Suggestions Carousel */}
          {!loading && !isListening && (
            <div className="px-3.5 py-1.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Topic Prompts</span>
                </span>
                <span className="text-[10px] text-indigo-500 lowercase font-medium">click to ask</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {currentCategoryQuestions.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-xl whitespace-nowrap transition cursor-pointer shrink-0 shadow-2xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Voice Recording Audio Wave Banner (Active when listening) */}
          {isListening && (
            <div className="px-3 py-2 bg-gradient-to-r from-rose-500/10 via-indigo-500/10 to-rose-500/10 border-t border-rose-300 dark:border-rose-900/50 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                </span>
                <span className="font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                  {voiceLang === "bn" ? "শুনছি... আপনার প্রশ্ন বাংলায় বলুন" : "Listening... Speak your question in English"}
                </span>
              </div>

              {/* Dynamic Sound Wave Simulation */}
              <div className="flex items-center gap-0.5 h-4">
                <span className="w-0.5 h-2 bg-rose-500 rounded-full animate-[pulse_0.4s_ease-in-out_infinite]" />
                <span className="w-0.5 h-3.5 bg-indigo-500 rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="w-0.5 h-4 bg-rose-500 rounded-full animate-[pulse_0.3s_ease-in-out_infinite]" />
                <span className="w-0.5 h-2.5 bg-purple-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" />
                <span className="w-0.5 h-4 bg-rose-500 rounded-full animate-[pulse_0.7s_ease-in-out_infinite]" />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => stopListening(true)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-xs transition cursor-pointer"
                >
                  Send Voice
                </button>
                <button
                  type="button"
                  onClick={() => stopListening(false)}
                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[10px] transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Footer Input Area with Microphone & Language Toggles */}
          <div className="p-2.5 sm:p-3 border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5 sm:gap-2"
            >
              {/* Voice Language Toggle (Bangla / English) */}
              <button
                type="button"
                onClick={() => {
                  const next = voiceLang === "bn" ? "en" : "bn";
                  setVoiceLang(next);
                  toast.success(next === "bn" ? "ভয়েস ভাষা: বাংলা (bn-BD)" : "Voice Language: English (en-US)", { icon: "🌐" });
                }}
                className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
                title={`Click to switch voice language (Current: ${voiceLang === "bn" ? "বাংলা" : "English"})`}
              >
                {voiceLang === "bn" ? "🇧🇩 বাং" : "🇬🇧 EN"}
              </button>

              {/* Text Input Area */}
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isListening 
                      ? "Listening to your voice..." 
                      : voiceLang === "bn"
                        ? "প্রশ্ন লিখুন বা মাইকে বলুন..."
                        : "Ask or tap mic to speak in English/বাংলা..."
                  }
                  disabled={loading}
                  className="w-full px-3 py-2 text-xs sm:text-[13px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 resize-none max-h-20 leading-relaxed"
                />
              </div>

              {/* Voice Microphone Input Button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/40 ring-2 ring-rose-400"
                    : "bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700"
                }`}
                title={isListening ? "Stop listening" : "Speak your question using microphone"}
              >
                {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <span>Enter to send • 🎙️ Speak in {voiceLang === "bn" ? "বাংলা" : "English"}</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-2.5 h-2.5" />
                PUST CSE Official Portal
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
