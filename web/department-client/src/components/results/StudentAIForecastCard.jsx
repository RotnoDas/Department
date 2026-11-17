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
  { label: "📊 Semester 6 Result", query: "Tell me about my Semester 6 result with multivisional analysis." },
  { label: "📈 All Semester Results", query: "Show me a complete multivisional breakdown of all my semester results." },
  { label: "🎓 Degree Prediction", query: "What is my predicted final 8-semester CGPA and degree standing?" },
  { label: "🔍 Weak & Retake Courses", query: "Which courses are my weakest or failed, and how do I recover my CGPA?" },
  { label: "📋 Improvement Plan", query: "Give me a personalized multivisional plan to improve my CGPA in remaining semesters." },
  { label: "📅 Live Routine & Attendance", query: "Show my live class routine and attendance status on the website." },
  { label: "📝 Assignments & Notices", query: "What are my active assignments and latest notices on the website?" },
  { label: "🏆 Batch Rank & Standing", query: "What is my semester rank and batch cohort comparison?" },
];

// Clean inline markdown formatter for **bold** and `code`
function formatInlineMarkdown(text) {
  if (!text) return "";
  const parts = [];
  let remaining = String(text);
  let keyIdx = 0;
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/;

  while (remaining) {
    const match = remaining.match(regex);
    if (!match) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }
    const full = match[0];
    if (full.startsWith("**")) {
      parts.push(
        <strong key={keyIdx++} className="font-bold text-slate-900 dark:text-white">
          {match[2]}
        </strong>
      );
    } else if (full.startsWith("`")) {
      parts.push(
        <code
          key={keyIdx++}
          className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] border border-indigo-200/60 dark:border-indigo-800/50"
        >
          {match[3]}
        </code>
      );
    }
    remaining = remaining.slice(match.index + full.length);
  }
  return parts;
}

// Structured Markdown Renderer for Multivisional AI Advisor replies
function RenderAdvisorMarkdown({ text, isBot }) {
  if (!text) return null;
  if (!isBot) {
    return <div className="leading-relaxed whitespace-pre-wrap text-[13px] sm:text-[13.5px]">{text}</div>;
  }

  const lines = String(text).split("\n");
  return (
    <div className="space-y-1.5 text-[12.5px] sm:text-[13.5px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed === "---") {
          return <hr key={idx} className="my-2 border-slate-200 dark:border-white/10" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="font-black text-sm sm:text-base text-indigo-700 dark:text-indigo-300 pt-1 pb-0.5 border-b border-indigo-100 dark:border-indigo-500/20"
            >
              {formatInlineMarkdown(trimmed.replace(/^###\s+/, ""))}
            </h3>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h4
              key={idx}
              className="font-extrabold text-xs sm:text-[13px] text-slate-900 dark:text-indigo-200 pt-2 pb-0.5 flex items-center gap-1.5"
            >
              {formatInlineMarkdown(trimmed.replace(/^####\s+/, ""))}
            </h4>
          );
        }

        if (/^[-*•]\s+/.test(trimmed)) {
          const content = trimmed.replace(/^[-*•]\s+/, "");
          const isSubBullet = line.startsWith("  ");
          return (
            <div key={idx} className={`flex items-start gap-2 ${isSubBullet ? "pl-4" : "pl-0.5"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-2 shrink-0" />
              <div className="flex-1">{formatInlineMarkdown(content)}</div>
            </div>
          );
        }

        if (/^\d+\.\s+/.test(trimmed)) {
          const m = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (m) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-0.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs shrink-0 mt-0.5">
                  {m[1]}.
                </span>
                <div className="flex-1">{formatInlineMarkdown(m[2])}</div>
              </div>
            );
          }
        }

        return <p key={idx}>{formatInlineMarkdown(trimmed)}</p>;
      })}
    </div>
  );
}

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
      const standing = trajectory?.projectedStanding || ai?.standingCategory || "Academic Standing";
      const semSummary = (trajectory?.semesterBreakdown || [])
        .map((s) => `Sem ${s.semester}: **${Number(s.sgpa).toFixed(2)}**`)
        .join(" • ");

      const initialGreeting = `### 👋 Hello **${studentName}**! I am your **Multivisional Academic AI Advisor**.

I have learned your complete academic transcript across **${trajectory?.completedSemestersCount || 0} published semesters** (**${completedCredits} credits**) as well as live website data (class routine, biometric attendance, assignments, teachers, and notices).

- **Current CGPA:** **${currentCGPA.toFixed(2)} / 4.00** (${trajectory?.currentStanding || standing})
- **Semester SGPA Progression:** ${semSummary || "N/A"}
- **Projected 8-Semester CGPA:** **${projectedCGPA.toFixed(2)} / 4.00** (Max Ceiling: **${maxCGPA.toFixed(2)}**)
- **Theory vs. Lab Split:** Theory GPA **${(trajectory?.theoryGpa || 0).toFixed(2)}** vs. Sessional Lab GPA **${(trajectory?.sessionalGpa || 0).toFixed(2)}**

Ask me about **any specific semester** (e.g., *"Tell me about Semester 6 result"*), any course code, or your live routine, attendance, and assignments!`;

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

  // Local client-side fallback that also inspects forecastData.trajectory.semesterBreakdown directly if network fails
  const buildLocalSmartFallback = (queryText) => {
    const q = String(queryText || "").toLowerCase();
    const semMatch = q.match(/\b(?:semester|sem|term)\s*([1-8])\b|\b([1-8])(?:st|nd|rd|th)\s*(?:semester|sem|term)\b/i);
    if (semMatch && trajectory?.semesterBreakdown) {
      const semNum = Number(semMatch[1] || semMatch[2]);
      const semObj = trajectory.semesterBreakdown.find((s) => Number(s.semester) === semNum);
      if (semObj) {
        const courseList = (semObj.courses || [])
          .map(
            (c) =>
              `- **${c.courseCode} — ${c.courseTitle}** (${c.credits} Cr): **${c.marks ?? "N/A"}/100** [Att: ${c.attendanceMarks ?? "N/A"}/10, CA: ${c.caMarks ?? "N/A"}, Final: ${c.finalMarks ?? "N/A"}] → Grade **${c.grade}** (**${Number(c.gradePoint).toFixed(2)} GP**)`
          )
          .join("\n");
        return `### 🎓 Semester ${semNum} (${semObj.label}) — Multivisional Result Analysis\n\n- **Semester ${semNum} SGPA:** **${Number(semObj.sgpa).toFixed(2)} / 4.00**\n- **Cumulative CGPA (Up to Sem ${semNum}):** **${Number(semObj.cgpa || currentCGPA).toFixed(2)} / 4.00**\n- **Earned Credits:** **${semObj.earnedCredits ?? semObj.credits} / ${semObj.credits} Credits**\n- **Theory GPA:** **${Number(semObj.theoryGpa || 0).toFixed(2)}** | **Lab GPA:** **${Number(semObj.sessionalGpa || 0).toFixed(2)}**\n\n#### 📚 Course-by-Course Breakdown\n${courseList}`;
      }
    }

    return `Based on your official records, your current CGPA is **${currentCGPA.toFixed(2)} / 4.00** across **${completedCredits} completed credits**, and your projected 8-semester graduation CGPA is **${projectedCGPA.toFixed(2)} / 4.00** (Max Ceiling: **${maxCGPA.toFixed(2)}**).`;
  };

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

    const recentHistory = messages.slice(-6).map((m) => ({
      role: m.sender === "ai" ? "model" : "user",
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setIsSending(true);

    try {
      const res = await apiFetch("/api/results/student/ai-coach-chat", {
        method: "POST",
        body: {
          question: query,
          studentId: student?.studentId,
          history: recentHistory,
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
      const fallbackReply = buildLocalSmartFallback(query);

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
    const standing = trajectory?.projectedStanding || ai?.standingCategory || "Academic Standing";
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: "ai",
        text: `### 🔄 Conversation Refreshed\nHello **${studentName}**! Your current CGPA is **${currentCGPA.toFixed(2)} / 4.00** and your projected 8-semester graduation CGPA is **${projectedCGPA.toFixed(2)} / 4.00** (${standing}).\n\nAsk me about **any semester result (Semester 1–8)**, specific courses, or your live routine, attendance, assignments, teachers, and notices!`,
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
      sgpa: Number(sem.sgpa) || 0,
      cgpa: Number(sem.cgpa) || 0,
      credits: sem.credits,
    }))
    .concat(
      (trajectory?.remainingSemesters || []).map((sem) => ({
        semester: `Sem ${sem.semester}`,
        semNum: sem.semester,
        type: "projected",
        sgpa: Number(trajectory?.projectedFutureSgpa || currentCGPA || 3.0),
        cgpa: Number(projectedCGPA || currentCGPA || 3.0),
        credits: sem.credits,
      }))
    );

  const allSgpaValues = trajectoryChartData.map((d) => d.sgpa).filter((v) => v > 0);
  const minChartSgpa = allSgpaValues.length > 0 ? Math.min(...allSgpaValues) : 2.0;
  const yAxisMin = Math.max(0, Math.min(2.0, Math.floor((minChartSgpa - 0.25) * 2) / 2));

  if (error && !forecastData) return null;

  return (
    <div className="rounded-[2.5rem] bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200/90 dark:border-indigo-500/30 shadow-xl dark:shadow-2xl overflow-hidden transition-all duration-300 relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/[0.04] dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-sky-500/[0.04] dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ── Banner Header ────────────────────────────────────────────── */}
      <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-white/10 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-400/30 backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
              <span>Multivisional AI Academic Advisor</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              <ShieldCheck className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              <span>Live Website Data Connected</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>8-Semester Degree Forecast & Multivisional AI Advisor</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-300">
            Deep multi-dimensional semester result analysis, counterfactual simulations, and live website data intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => fetchForecast(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-semibold dark:text-white transition-all border border-slate-200 dark:border-white/10 active:scale-95 shadow-sm cursor-pointer"
            title="Refresh academic analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-sky-300 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-all border border-slate-200 dark:border-white/10 shadow-sm cursor-pointer"
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
              <RefreshCw className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Evaluating degree credits, semester transcripts, and live website data...
              </p>
            </div>
          ) : forecastData ? (
            <>
              {/* ── 4 COMPACT ESSENTIAL METRIC CHIPS ─────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Current CGPA */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Current Standing</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {currentCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-indigo-600 dark:text-indigo-300 font-semibold truncate">
                    {trajectory?.completedSemestersCount} Semesters Published
                  </div>
                </div>

                {/* 2. Projected Final CGPA */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-indigo-500/15 border border-amber-200/80 dark:border-indigo-400/30 backdrop-blur-md shadow-sm">
                  <div className="text-[11px] font-semibold text-amber-800 dark:text-indigo-200 mb-1">Predicted Final CGPA</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-300 tracking-tight">
                      {projectedCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-amber-700/60 dark:text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                    {trajectory?.projectedStanding || ai?.standingCategory || "Projected Standing"}
                  </div>
                </div>

                {/* 3. Maximum Possible Ceiling */}
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-white/5 border border-sky-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
                  <div className="text-[11px] font-semibold text-sky-800 dark:text-slate-400 mb-1">Max Reachable Ceiling</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-300 tracking-tight">
                      {maxCGPA.toFixed(2)}
                    </span>
                    <span className="text-xs text-sky-700/60 dark:text-slate-400 font-bold">/ 4.00</span>
                  </div>
                  <div className="mt-1 text-[11px] text-sky-700 dark:text-sky-200 truncate">
                    With 4.00 in remaining credits
                  </div>
                </div>

                {/* 4. Degree Completion Progress */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-white/5 border border-emerald-200/80 dark:border-white/10 backdrop-blur-md shadow-sm">
                  <div className="text-[11px] font-semibold text-emerald-800 dark:text-slate-400 mb-1">Degree Completion</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-300 tracking-tight">
                      {percentCompleted}%
                    </span>
                    <span className="text-xs text-emerald-700/60 dark:text-slate-400 font-bold">done</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {completedCredits} of {totalDegreeCredits} Credits
                  </div>
                </div>
              </div>

              {/* ── 8-SEMESTER TRAJECTORY CURVE (THE GRAPH) ──────────── */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-sky-400" />
                      <span>8-Semester Degree Progression & Projection Curve</span>
                    </span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Completed official semesters & projected future terms across the 8-semester curriculum.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-indigo-500 rounded" /> SGPA
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400" /> 3.80 Dean&apos;s List
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400" /> 3.00 First Class
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryChartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.25} />
                      <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[yAxisMin, 4.0]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/20 text-xs shadow-xl space-y-1">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {d.semester} ({d.type === "actual" ? "Official Published" : "Projected"})
                              </div>
                              <div className="text-indigo-600 dark:text-amber-300 font-mono font-bold">
                                SGPA: {Number(d.sgpa).toFixed(2)} / 4.00
                              </div>
                              {d.cgpa ? (
                                <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                  Running CGPA: {Number(d.cgpa).toFixed(2)}
                                </div>
                              ) : null}
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
                          fill: "#d97706",
                          fontSize: 10,
                          position: "insideTopRight",
                        }}
                      />
                      <ReferenceLine
                        y={3.0}
                        stroke="#a855f7"
                        strokeDasharray="3 3"
                        label={{
                          value: "First Class (3.00)",
                          fill: "#9333ea",
                          fontSize: 10,
                          position: "insideTopLeft",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sgpa"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#6366f1", stroke: "#ffffff", strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ── MULTIVISIONAL AI ACADEMIC CHATBOT ────────────────── */}
              <div className="rounded-3xl bg-slate-50/70 dark:bg-slate-900/90 border border-slate-200/90 dark:border-indigo-500/30 shadow-lg dark:shadow-xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          Academic AI Assistant
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Multivisional Engine</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Ask about any semester result (Sem 1–8), course grades, batch rank, routine, attendance, or assignments
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleResetChat}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white transition-all border border-slate-200 dark:border-white/10 active:scale-95 shadow-sm cursor-pointer"
                    title="Clear and reset chat"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>

                {/* Suggestions */}
                <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5 overflow-x-auto flex items-center gap-2 scrollbar-none">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                    <span>Quick Ask:</span>
                  </span>
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p.query)}
                      disabled={isSending}
                      className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200/90 hover:border-indigo-300 dark:bg-white/5 dark:hover:bg-indigo-600/30 dark:text-slate-200 dark:hover:text-indigo-200 dark:border-white/10 dark:hover:border-indigo-400/40 shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Messages Feed */}
                <div
                  ref={chatContainerRef}
                  className="p-4 sm:p-5 space-y-3.5 max-h-[460px] min-h-[240px] overflow-y-auto scroll-smooth text-xs sm:text-sm bg-slate-50/40 dark:bg-transparent"
                >
                  {messages.map((m) => {
                    const isBot = m.sender === "ai";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 items-end ${isBot ? "justify-start" : "justify-end"}`}
                      >
                        {isBot && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/40 flex items-center justify-center shrink-0 mb-1 shadow-sm">
                            <Bot className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
                          </div>
                        )}

                        <div
                          className={`max-w-[92%] sm:max-w-[82%] px-4 py-3.5 transition-all relative group ${
                            isBot
                              ? "bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-indigo-500/25 text-slate-800 dark:text-slate-200 rounded-[22px] rounded-bl-[5px] shadow-sm dark:shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                              : "bg-indigo-600 text-white font-medium rounded-[22px] rounded-br-[5px] shadow-md shadow-indigo-600/20"
                          }`}
                        >
                          <RenderAdvisorMarkdown text={m.text} isBot={isBot} />

                          <div
                            className={`mt-2 flex items-center justify-between gap-3 text-[10px] ${
                              isBot ? "text-slate-400 dark:text-slate-400" : "text-indigo-200"
                            }`}
                          >
                            <span>{m.timestamp}</span>
                            {isBot && (
                              <button
                                onClick={() => copyMessage(m.id, m.text)}
                                className="opacity-70 group-hover:opacity-100 hover:text-slate-900 dark:hover:text-white transition-opacity p-0.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                                title="Copy advice"
                              >
                                {copiedId === m.id ? (
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {!isBot && (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center shrink-0 mb-1 shadow-sm">
                            <User className="w-4 h-4 text-indigo-700 dark:text-indigo-200" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Thinking Indicator */}
                  {isSending && (
                    <div className="flex gap-2.5 items-start justify-start animate-in fade-in duration-150">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-400/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-amber-300 animate-spin" />
                      </div>
                      <div className="rounded-2xl px-3.5 py-2.5 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Analyzing transcript & website data</span>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce" />
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
                  className="p-3 bg-white dark:bg-slate-950/80 border-t border-slate-200 dark:border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuestion}
                    onChange={(e) => setInputQuestion(e.target.value)}
                    placeholder="Ask about Semester 6 result, any course, batch rank, routine, attendance, or assignments..."
                    disabled={isSending}
                    className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:bg-white dark:focus:bg-white/10 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!inputQuestion.trim() || isSending}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0 shadow-sm shadow-indigo-600/20 cursor-pointer"
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
