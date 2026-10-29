"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  ExternalLink,
  Volume2,
  VolumeX,
  Lock,
  Mic,
  Square,
  Bot
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

// Safely sanitize and whitelist URLs to prevent broken links
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
    .replace(/[👉📍📅🛡️🔐📚📢🎓💡🎯✨🇧🇩👋]/gu, "")
    .replace(/http[s]?:\/\/\S+/g, "")
    .trim();
}

// Clean quick starter prompts for simple one-tap asking
const QUICK_PROMPTS = [
  "Smart Face Attendance",
  "Weekly Class Routine",
  "CSE Course Syllabus",
  "স্মার্ট হাজিরা কিভাবে কাজ করে?"
];

// Clean compact markdown-to-JSX renderer with login-aware link gates
function RenderMarkdown({ text, isLoggedIn }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-xs sm:text-[13px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-0.5" />;

        // Heading 3 or 4: ### Title
        if (trimmed.startsWith("### ") || trimmed.startsWith("#### ")) {
          const title = trimmed.replace(/^###+\s+/, "");
          return (
            <h4 key={idx} className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 mt-1 mb-0.5">
              {formatInline(title, isLoggedIn)}
            </h4>
          );
        }

        // Bullet point: - item or * item
        if (/^[-*•]\s+/.test(trimmed)) {
          const itemText = trimmed.replace(/^[-*•]\s+/, "");
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

// Inline formatting: **bold**, [link](url), `code`
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
                ? "text-amber-600 dark:text-amber-400" 
                : "text-indigo-600 dark:text-indigo-400"
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
            className="font-bold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80 inline-flex items-center gap-0.5"
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
          className="px-1 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]"
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
      text: `Hello! I am the **PUST CSE AI Assistant**. 👋

I can help you with:
- **Smart Face Attendance:** 10m classroom geofence & live face verification.
- **Class Schedules:** Weekly lectures, timetable & lab allocations.
- **Academic Courses:** Department curriculum from 1st to 8th semester.
- **Grievance Desk:** Anonymous complaint tracking with PIN.

Feel free to ask in **English** or **বাংলা**, or tap the 🎙️ **Microphone** to speak!`,
      actionLinks: [
        { label: "Student Portal", url: "/dashboard/student" },
        { label: "Notice Board", url: "/notices" }
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [speakingIdx, setSpeakingIdx] = useState(null);

  // Voice Interaction States
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState("bn"); // "bn" or "en"
  const [autoVoiceReply, setAutoVoiceReply] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
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
      toast.error("Speech recognition is not supported in this browser.", { icon: "🎙️" });
      return;
    }

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
        toast.success(voiceLang === "bn" ? "মাইক্রোফোন চালু, বাংলায় বলুন..." : "Listening... Speak in English", { id: "voice-active", duration: 1500 });
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
        setIsListening(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone permission denied.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
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
      toast.error("Speech synthesis not supported.");
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

  // Handle Send
  const handleSend = async (messageText = null, isVoice = false) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    if (isListening) {
      stopListening(false);
    }

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
            actionLinks: data.actionLinks || [],
          },
        ]);

        if (autoVoiceReply && typeof window !== "undefined" && window.speechSynthesis) {
          setTimeout(() => handleToggleSpeak(data.reply, newAssistantIdx), 150);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply || "I am currently unable to fetch a response. Please try again or visit our Support page.",
            actionLinks: [{ label: "Support Desk", url: "/#support" }],
          },
        ]);
      }
    } catch (err) {
      console.error("[AiChatBot] Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I encountered a connection issue. Please feel free to ask again.",
          actionLinks: [{ label: "Support Desk", url: "/#support" }],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMessage = (text, idx) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  };

  const handleResetChat = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }
    setMessages([
      {
        role: "assistant",
        text: `Chat reset! How can I assist you with PUST CSE courses, attendance, or routine today?`,
        actionLinks: [
          { label: "Student Portal", url: "/dashboard/student" },
          { label: "Notice Board", url: "/notices" }
        ],
      },
    ]);
    toast.success("Chat cleared.");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 15, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`fixed z-[110] w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh] rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden ${
            isTop ? "top-20" : "bottom-24"
          } ${
            isLeft ? "left-4 sm:left-8" : "right-4 sm:right-8"
          }`}
        >
          {/* Simple Clean Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  CSE Assistant
                </h3>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Audio Mute/Voice Toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = !autoVoiceReply;
                  setAutoVoiceReply(next);
                  toast.success(next ? "Voice replies enabled" : "Voice replies muted", { icon: next ? "🔊" : "🔇", duration: 1500 });
                  if (!next && typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                    setSpeakingIdx(null);
                  }
                }}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  autoVoiceReply
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                title={autoVoiceReply ? "Voice mode enabled (click to mute)" : "Click to enable auto-voice replies"}
              >
                {autoVoiceReply ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Reset Conversation */}
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              const isSpeaking = speakingIdx === idx;

              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`relative rounded-2xl text-xs sm:text-[13px] leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-xs px-3.5 py-2.5 max-w-[82%] shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-xs px-3.5 py-2.5 max-w-[88%] border border-slate-200/50 dark:border-white/5"
                    }`}
                  >
                    {isUser ? (
                      <div className="flex flex-col">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.isVoice && (
                          <span className="text-[9px] text-indigo-200 flex items-center gap-1 mt-1 opacity-80">
                            <Mic className="w-2.5 h-2.5" /> Voice
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        <RenderMarkdown text={msg.text} isLoggedIn={isLoggedIn} />

                        {/* Action Links if available */}
                        {msg.actionLinks && msg.actionLinks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-white/5 flex flex-wrap gap-1.5">
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
                                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg transition inline-flex items-center gap-1 ${
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

                        {/* Subtle Assistant Utilities: Copy & Listen */}
                        <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                          <button
                            type="button"
                            onClick={() => handleToggleSpeak(msg.text, idx)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title={isSpeaking ? "Stop voice" : "Listen in voice"}
                          >
                            {isSpeaking ? <VolumeX className="w-3 h-3 text-indigo-600 animate-pulse" /> : <Volume2 className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.text, idx)}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                            title="Copy reply"
                          >
                            {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl rounded-tl-xs bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 w-fit text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[11px] ml-1">Thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Clean Quick Suggestion Chips (Shown on start) */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((promptText, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(promptText)}
                  className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 px-2.5 py-1 rounded-xl transition cursor-pointer shadow-2xs"
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {/* Listening Pill when Mic is Active */}
          {isListening && (
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                <span>{voiceLang === "bn" ? "শুনছি... বাংলায় বলুন" : "Listening... Speak now"}</span>
              </div>
              <button
                type="button"
                onClick={() => stopListening(true)}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
              >
                Send Voice
              </button>
            </div>
          )}

          {/* Simple Clean Input Bar */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-2 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all"
            >
              {/* Language Switch */}
              <button
                type="button"
                onClick={() => {
                  const next = voiceLang === "bn" ? "en" : "bn";
                  setVoiceLang(next);
                  toast.success(next === "bn" ? "ভয়েস ভাষা: বাংলা" : "Voice Language: English", { duration: 1500 });
                }}
                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                title={`Click to switch language (Current: ${voiceLang === "bn" ? "বাংলা" : "English"})`}
              >
                {voiceLang === "bn" ? "বাং" : "EN"}
              </button>

              {/* Text Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Ask CSE AI..."}
                disabled={loading}
                className="flex-1 bg-transparent text-xs sm:text-[13px] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none px-1"
              />

              {/* Mic Button */}
              <button
                type="button"
                onClick={toggleListening}
                disabled={loading}
                className={`p-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                  isListening
                    ? "bg-rose-500 text-white animate-pulse"
                    : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title={isListening ? "Stop listening" : "Voice query"}
              >
                {isListening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition cursor-pointer shrink-0"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
