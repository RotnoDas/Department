"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  TrendingUp,
  Brain,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Send,
  Bot,
  User,
  RotateCcw,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

const QUICK_PROMPTS = [
  { label: "🎓 Degree Prediction", query: "What is my predicted final 8-semester CGPA and degree standing?" },
  { label: "📋 Improvement Plan", query: "Give me a personalized plan to improve my CGPA in remaining semesters." },
  { label: "⚠️ Mistakes to Avoid", query: "What critical mistakes should I avoid to safeguard my degree result?" },
  { label: "⭐ Honors & Dean's List", query: "What SGPA do I need in remaining semesters to achieve Honors or Dean's List?" },
];

export default function StudentAIForecastCard({ student, initialResults = [] }) {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // Chatbot State
  const [messages, setMessages] = useState([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const fetchForecast = async (showToast = false) => {
    try {
      setLoading(true);
      setError(null);
      const queryStr = student?.studentId ? `?studentId=${encodeURIComponent(student.studentId)}` : "";
      const res = await apiFetch(`/api/results/student/ai-forecast${queryStr}`);
      if (!res.ok) {
        throw new Error(res.data?.error || "Failed to generate AI forecast.");
      }
      setForecastData(res.data);
      if (showToast) {
        toast.success("Academic Analysis updated!");
      }
    } catch (err) {
      console.error("AI Forecast error:", err);
      setError(err.message || "Failed to generate academic forecast.");
      if (showToast) {
        toast.error("Could not load forecast.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(false);
  }, [student?.studentId]);

  const trajectory = forecastData?.trajectory;
  const ai = forecastData?.aiEvaluation;

  const currentCGPA = trajectory?.currentCGPA ?? 0;
  const projectedCGPA = trajectory?.projectedFinalCGPA ?? 0;
  const maxCGPA = trajectory?.maxAchievableCGPA ?? 0;
  const totalDegreeCredits = trajectory?.totalDegreeCredits ?? 162.25;
  const completedCredits = trajectory?.completedCredits ?? 0;
  const percentCompleted =
    totalDegreeCredits > 0
      ? Math.min(100, Math.round((completedCredits / totalDegreeCredits) * 100))
      : 0;

  // Initialize Welcome Message once data is loaded
  useEffect(() => {
    if (forecastData && messages.length === 0) {
      const studentName = forecastData?.student?.name || student?.name || "Student";
      const standing = ai?.standingCategory || "First Class with Honors";
      const initialGreeting = `Hello **${studentName}**! I am your **Academic AI Advisor**.

Based on your official record of **${completedCredits} completed credits**, sustaining your current academic pace projects a final 8-semester graduation CGPA of **${projectedCGPA.toFixed(2)} / 4.00** (${standing}).

• **Current CGPA:** ${currentCGPA.toFixed(2)} / 4.00
• **Maximum Achievable Ceiling:** ${maxCGPA.toFixed(2)} / 4.00
• **Remaining Credits:** ${trajectory?.remainingCredits || 0} credits across ${trajectory?.remainingSemestersCount || 2} semester(s)

Ask any question below or click a quick suggestion to view your personalized improvement plan and mistakes to avoid.`;

      setMessages([
        {
          id: "welcome-1",
          sender: "ai",
          text: initialGreeting,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  }, [forecastData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Handle sending a chat message
  const handleSendMessage = async (textToSend) => {
    const query = String(textToSend || inputQuestion || "").trim();
    if (!query || isSending) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setIsSending(true);

    try {
      const res = await apiFetch("/api/results/student/ai-coach-chat", {
        method: "POST",
        body: {
          question: query,
          studentId: student?.studentId,
        },
      });

      if (res.ok && res.data?.reply) {
        const botMsg = {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(res.data?.error || "Response failed");
      }
    } catch (err) {
      console.warn("Chat response error:", err);
      const fallbackReply = `Based on your records, your current CGPA is **${currentCGPA.toFixed(2)} / 4.00** and your projected 8-semester graduation CGPA is **${projectedCGPA.toFixed(2)} / 4.00**.

To elevate your score:
1. **Prioritize 3.0-credit theory courses**—they carry twice the weight of practical labs.
2. **Lock in 10/10 attendance marks** by maintaining attendance ≥ 90% in every subject.
3. **Avoid last-minute thesis rushes** in Semesters 7 & 8 (CSE 4100 & 4200 carry 4.5 credits).`;

      const botMsg = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    if (!forecastData) return;
    const studentName = forecastData?.student?.name || student?.name || "Student";
    const standing = ai?.standingCategory || "First Class with Honors";
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: `Conversation refreshed. Hello **${studentName}**! Your projected final graduation CGPA is **${projectedCGPA.toFixed(2)} / 4.00** (${standing}). What would you like to know about your degree roadmap or results?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    toast.success("Chat refreshed.");
  };

  const copyMessage = (id, text) => {
    if (typeof navigator !== "undefined" && navigator.clipboard && text) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // 8-Semester Progression Data for the Trajectory Curve
  const trajectoryChartData = (trajectory?.semesterBreakdown || [])
    .map((sem) => ({
      semester: `Sem ${sem.semester}`,
      semNum: sem.semester,
      type: "actual",
      sgpa: sem.sgpa,
    }))
    .concat(
      (trajectory?.remainingSemesters || []).map((sem) => ({
        semester: `Sem ${sem.semester}`,
        semNum: sem.semester,
        type: "projected",
        sgpa: trajectory.projectedFutureSgpa || 3.75,
      }))
    );

  if (error && !forecastData) return null;

  return (
    <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-2xl overflow-hidden transition-all duration-300 relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Banner Header ────────────────────────────────────────────── */}
      <div className="p-6 sm:p-7 border-b border-white/10 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Academic Advisor</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>PUST Credit Model</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Brain className="w-6 h-6 text-indigo-400" />
            <span>8-Semester Degree Forecast & AI Advisor</span>
          </h3>
          <p className="text-xs text-slate-300">
            Real-time degree projection and simple interactive counseling for your academic roadmap.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => fetchForecast(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-all border border-white/10 active:scale-95"
            title="Refresh academic analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-300 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="p-6 sm:p-7 space-y-6 relative z-10 animate-in fade-in duration-200">
          {loading && !forecastData ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Evaluating degree credits and trajectory...
              </p>
            </div>
          ) : forecastData ? (
            <>
              {/* ── 4 COMPACT ESSENTIAL METRIC CHIPS ─────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Current CGPA */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Current Standing</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {currentCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-indigo-300 font-semibold truncate">
                    {trajectory?.completedSemestersCount} Semesters Published
                  </div>
                </div>

                {/* 2. Projected Final CGPA */}
                <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 backdrop-blur-md">
                  <div className="text-[11px] font-semibold text-indigo-200 mb-1">Predicted Final CGPA</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                      {projectedCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-300 font-semibold truncate">
                    {ai?.standingCategory || "Honors Trajectory"}
                  </div>
                </div>

                {/* 3. Maximum Possible Ceiling */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Max Reachable Ceiling</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-sky-300 tracking-tight">
                      {maxCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-sky-200 truncate">
                    With 4.00 in remaining credits
                  </div>
                </div>

                {/* 4. Degree Completion Progress */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">Degree Completion</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-300 tracking-tight">
                      {percentCompleted}%
                    </span>
                    <span className="text-xs text-slate-400 font-bold">done</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300 truncate">
                    {completedCredits} of {totalDegreeCredits} Credits
                  </div>
                </div>
              </div>

              {/* ── 8-SEMESTER TRAJECTORY CURVE (THE GRAPH) ──────────── */}
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-sky-400" />
                      <span>8-Semester Degree Progression & Projection Curve</span>
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Solid line: Completed official semesters • Dashed line: Projected future terms.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-indigo-500 rounded" /> SGPA
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> 3.80 Dean's List
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400" /> 3.75 Honors
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryChartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.1} />
                      <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[2.5, 4.0]} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="p-3 rounded-xl bg-slate-900 border border-white/20 text-xs shadow-xl space-y-1">
                              <div className="font-bold text-white">
                                {d.semester} ({d.type === "actual" ? "Official" : "Projected"})
                              </div>
                              <div className="text-amber-300 font-mono font-bold">
                                SGPA: {Number(d.sgpa).toFixed(2)}
                              </div>
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine
                        y={3.8}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        label={{
                          value: "Dean's List (3.80)",
                          fill: "#f59e0b",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                      <ReferenceLine
                        y={3.75}
                        stroke="#c084fc"
                        strokeDasharray="3 3"
                        label={{
                          value: "Honors Line (3.75)",
                          fill: "#c084fc",
                          fontSize: 10,
                          position: "insideTopLeft",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sgpa"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#818cf8", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── SIMPLE & FUNCTIONAL AI CHATBOT ───────────────────── */}
              <div className="rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-white">
                          Academic AI Assistant
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Active</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Ask about your degree prediction, improvement plan, or ordinance rules
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleResetChat}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95"
                    title="Clear and reset chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>

                {/* Suggestions */}
                <div className="px-4 py-2.5 bg-slate-950/40 border-b border-white/5 overflow-x-auto flex items-center gap-2 scrollbar-none">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Suggestions:</span>
                  </span>
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p.query)}
                      disabled={isSending}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-indigo-600/30 text-slate-200 hover:text-indigo-200 border border-white/10 hover:border-indigo-400/40 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Messages Feed */}
                <div
                  ref={chatContainerRef}
                  className="p-4 sm:p-5 space-y-3.5 max-h-[380px] min-h-[220px] overflow-y-auto scroll-smooth text-xs sm:text-sm"
                >
                  {messages.map((m) => {
                    const isBot = m.sender === "ai";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 items-end ${isBot ? "justify-start" : "justify-end"}`}
                      >
                        {isBot && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 mb-1 shadow-md">
                            <Bot className="w-4 h-4 text-indigo-300" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[76%] px-4 py-3 transition-all relative group ${
                            isBot
                              ? "bg-slate-900/90 border border-indigo-500/25 text-slate-200 rounded-[22px] rounded-bl-[5px] shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                              : "bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 text-white font-medium rounded-[22px] rounded-br-[5px] shadow-[0_2px_10px_rgba(79,70,229,0.3)]"
                          }`}
                        >
                          <div className="leading-relaxed whitespace-pre-wrap text-[13px] sm:text-[13.5px]">
                            {m.text}
                          </div>

                          <div
                            className={`mt-1.5 flex items-center justify-between gap-3 text-[10px] ${
                              isBot ? "text-slate-400" : "text-indigo-200"
                            }`}
                          >
                            <span>{m.timestamp}</span>
                            {isBot && (
                              <button
                                onClick={() => copyMessage(m.id, m.text)}
                                className="opacity-70 group-hover:opacity-100 hover:text-white transition-opacity p-0.5 rounded hover:bg-white/10"
                                title="Copy advice"
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {!isBot && (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 mb-1 shadow-md">
                            <User className="w-4 h-4 text-indigo-200" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Thinking Indicator */}
                  {isSending && (
                    <div className="flex gap-2.5 items-start justify-start animate-in fade-in duration-150">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                      </div>
                      <div className="rounded-2xl px-3.5 py-2.5 bg-slate-950/70 border border-white/10 text-slate-400 flex items-center gap-2">
                        <span className="text-xs text-slate-300">Thinking</span>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputQuestion);
                  }}
                  className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Ask a question about your degree result or plan..."
                    disabled={isSending}
                    className="flex-1 bg-white/5 border border-white/10 focus:border-indigo-400 focus:bg-white/10 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-all disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isSending}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                    title="Send message"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
