"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  FileText,
  Upload,
  Brain,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Download,
  Copy,
  Check,
  Zap,
  BookOpen,
  Layers,
  Award,
  ChevronRight,
  Clock,
  Trash2,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet,
  FileCode,
  File,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, getAuthToken } from "@/lib/api";

const DIFFICULTY_CONFIG = {
  Easy: {
    label: "Easy",
    desc: "Foundational definitions & fundamental syntax",
    color: "emerald",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  Medium: {
    label: "Medium",
    desc: "Algorithmic mechanics & core applied logic",
    color: "amber",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  Hard: {
    label: "Hard",
    desc: "Deep reasoning, edge-cases & exam traps",
    color: "rose",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
};

export default function StudentCourseAIStudy({
  courseCode,
  student,
  user,
  courseMaterials = [],
}) {
  const [inputMode, setInputMode] = useState("upload"); // "upload" | "paste" | "materials"
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawText, setRawText] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);

  // Result state
  const [studyData, setStudyData] = useState(null);
  const [activeView, setActiveView] = useState("notes"); // "notes" | "audio" | "quiz"
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Interactive Quiz state
  const [userAnswers, setUserAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [copiedNotes, setCopiedNotes] = useState(false);

  const fileInputRef = useRef(null);
  const utteranceRef = useRef(null);

  const studentEmail = (user?.email || student?.email || "").toLowerCase().trim();
  const studentName = student?.name || user?.name || "Student";

  // 1. Fetch past study sessions for this course
  const fetchHistory = useCallback(async () => {
    if (!courseCode || !studentEmail) return;
    try {
      setIsLoadingHistory(true);
      const res = await apiFetch(
        `/api/ai-study/history?courseCode=${encodeURIComponent(
          courseCode
        )}&studentEmail=${encodeURIComponent(studentEmail)}`
      );
      if (res.ok && res.data?.history) {
        setHistory(res.data.history);
        // Default to latest if not set
        if (!studyData && res.data.history.length > 0) {
          setStudyData(res.data.history[0]);
        }
      }
    } catch (err) {
      console.warn("Failed to load study history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [courseCode, studentEmail, studyData]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 2. Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("File is too large (maximum size is 20MB).");
        return;
      }
      setSelectedFile(file);
    }
  };

  // 3. Generate Notes & Quiz
  const handleGenerate = async () => {
    if (!courseCode) {
      toast.error("Course code is missing.");
      return;
    }

    if (inputMode === "upload" && !selectedFile) {
      toast.error("Please upload a PDF, Word (DOCX), or Text document.");
      return;
    }

    if (inputMode === "paste" && (!rawText || rawText.trim().length < 35)) {
      toast.error("Please paste at least 35 characters of study text.");
      return;
    }

    setIsProcessing(true);
    // Stop any ongoing speech
    stopSpeech();

    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append("courseCode", courseCode);
      formData.append("studentEmail", studentEmail);
      formData.append("studentName", studentName);
      formData.append("difficulty", difficulty);
      formData.append("numQuestions", String(numQuestions));

      if (inputMode === "upload" && selectedFile) {
        formData.append("file", selectedFile);
      } else if (inputMode === "paste") {
        formData.append("rawText", rawText);
      }

      const res = await fetch("/backend/api/ai-study/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.data) {
        throw new Error(json.error || "Failed to process document.");
      }

      setStudyData(json.data);
      setHistory((prev) => [json.data, ...prev]);
      setActiveView("notes");
      // Reset quiz state
      setUserAnswers({});
      setQuizSubmitted(false);
      setQuizScore(0);
      toast.success("Study notes and quiz generated successfully! ✨");
    } catch (err) {
      console.error("AI Study generation error:", err);
      toast.error(err.message || "Failed to generate study notes.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Delete saved history item
  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/ai-study/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item._id !== id));
        if (studyData?._id === id) {
          setStudyData(null);
        }
        toast.success("Study record removed.");
      }
    } catch {
      toast.error("Could not delete record.");
    }
  };

  // 5. Speech Synthesis (Audio Narration)
  const getCleanSpeechText = (data) => {
    if (!data) return "";
    const parts = [];
    if (data.topic) parts.push(`Topic: ${data.topic}.`);
    if (data.summary) parts.push(`Summary: ${data.summary}`);
    if (Array.isArray(data.keyTakeaways) && data.keyTakeaways.length > 0) {
      parts.push(`Key Takeaways: ${data.keyTakeaways.join(". ")}.`);
    }
    if (data.notesMarkdown) {
      const cleanMd = data.notesMarkdown
        .replace(/#{1,6}\s+/g, "")
        .replace(/\*\*/g, "")
        .replace(/`/g, "")
        .replace(/- /g, "")
        .slice(0, 4000);
      parts.push(cleanMd);
    }
    return parts.join("\n\n");
  };

  const startSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Audio narration is not supported in this browser.");
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = getCleanSpeechText(studyData);
    if (!textToRead) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const pauseSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const changeSpeed = (rate) => {
    setSpeechRate(rate);
    if (isSpeaking) {
      stopSpeech();
      setTimeout(startSpeech, 100);
    }
  };

  // 6. Interactive Quiz logic
  const handleSelectAnswer = (qIndex, optIndex) => {
    if (quizSubmitted) return;
    setUserAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }));
  };

  const handleSubmitQuiz = () => {
    if (!studyData?.quiz?.questions?.length) return;
    const questions = studyData.quiz.questions;
    let score = 0;

    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });

    setQuizScore(score);
    setQuizSubmitted(true);
    toast.success(`Quiz Completed! You scored ${score} of ${questions.length}!`);
  };

  const handleRetakeQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizScore(0);
  };

  // 7. Copy notes to clipboard
  const handleCopyNotes = () => {
    if (!studyData?.notesMarkdown) return;
    navigator.clipboard.writeText(
      `# ${studyData.topic}\n\n${studyData.summary}\n\n${studyData.notesMarkdown}`
    );
    setCopiedNotes(true);
    toast.success("Study notes copied to clipboard!");
    setTimeout(() => setCopiedNotes(false), 2000);
  };

  // 8. Download notes as .md
  const handleDownloadNotes = () => {
    if (!studyData) return;
    const content = `# ${studyData.topic}\n\n> ${studyData.summary}\n\n${studyData.notesMarkdown}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${courseCode}_${studyData.topic.replace(/\s+/g, "_")}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Banner Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 border border-slate-200/90 dark:border-white/10 shadow-sm text-slate-900 dark:text-white transition-colors">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/[0.05] dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-sky-500/[0.04] dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-500/30 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-300" />
              <span>AI Study Companion • {courseCode}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              AI Note Summary, Audio & Quiz Generator
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Upload lecture slides, course PDFs, book chapters, or assignment notes to instantly generate structured study guides, listen via audio transcription, and test your mastery with interactive quizzes.
            </p>
          </div>

          {/* Quick Stats or Active Item */}
          {history.length > 0 && (
            <div className="px-4 py-3 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex items-center gap-3 shrink-0 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200/60 dark:border-transparent">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-white">{history.length} Saved Guide{history.length > 1 ? "s" : ""}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Available offline in workspace</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Input & Generation Box ── */}
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-lg p-5 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-500" />
              <span>Provide Study Material</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select an uploaded document, choose from course materials, or paste text
            </p>
          </div>

          {/* Input Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setInputMode("upload")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                inputMode === "upload"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => setInputMode("paste")}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                inputMode === "paste"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Paste Notes
            </button>
            {courseMaterials.length > 0 && (
              <button
                onClick={() => setInputMode("materials")}
                className={`px-3.5 py-1.5 rounded-xl transition-all ${
                  inputMode === "materials"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Course Materials ({courseMaterials.length})
              </button>
            )}
          </div>
        </div>

        {/* ── Mode 1: File Upload (PDF, DOCX, TXT) ── */}
        {inputMode === "upload" && (
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt,.md"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/50 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-950/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">
                    Click to select study document or drag & drop here
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports <span className="font-semibold text-indigo-400">PDF (.pdf)</span>, <span className="font-semibold text-indigo-400">Word (.docx)</span>, and <span className="font-semibold text-indigo-400">Text (.txt, .md)</span> up to 20MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for AI Processing
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Mode 2: Paste Raw Text / Notes ── */}
        {inputMode === "paste" && (
          <div className="space-y-2">
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your lecture notes, algorithm descriptions, book excerpts, or code explanations here..."
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 focus:border-indigo-500 focus:outline-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-all font-sans"
            />
            <div className="flex justify-between text-[11px] text-slate-400 px-1">
              <span>Minimum 35 characters</span>
              <span>{rawText.length} characters</span>
            </div>
          </div>
        )}

        {/* ── Mode 3: Pick from Teacher's Course Materials ── */}
        {inputMode === "materials" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select one of the official course slides or reading materials uploaded by your instructor:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {courseMaterials.map((mat) => (
                <button
                  key={mat._id || mat.id}
                  onClick={() => {
                    // Fetch the file as blob and set as selectedFile
                    toast.loading("Loading material document...", { id: "mat-load" });
                    fetch(mat.fileUrl)
                      .then((r) => r.blob())
                      .then((blob) => {
                        const file = new File([blob], mat.title + ".pdf", { type: "application/pdf" });
                        setSelectedFile(file);
                        setInputMode("upload");
                        toast.success(`Selected: ${mat.title}`, { id: "mat-load" });
                      })
                      .catch(() => {
                        toast.error("Could not fetch remote material file.", { id: "mat-load" });
                      });
                  }}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 text-left transition-all flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {mat.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {mat.topic || "Course Reference"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Settings Row: Difficulty & Question Count ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/10">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Quiz Difficulty Level:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition-all text-center ${
                    difficulty === key
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-400/40"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              Quiz Question Count:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumQuestions(num)}
                  className={`p-2.5 rounded-2xl text-xs font-bold border transition-all text-center ${
                    numQuestions === num
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-indigo-400/40"
                  }`}
                >
                  {num} Questions
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Action Button ── */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Document & Generating Notes...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate Notes & Quiz Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Results Container (when active study data exists) ── */}
      {studyData && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Result Header & View Nav Bar */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  {studyData.difficulty} Level
                </span>
                {studyData.sourceFilename && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    Source: {studyData.sourceFilename}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {studyData.topic}
              </h3>
            </div>

            {/* Navigation Tabs (Notes | Audio Narration | Quiz) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold shrink-0 self-stretch sm:self-auto justify-center">
              <button
                onClick={() => setActiveView("notes")}
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  activeView === "notes"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Study Notes</span>
              </button>

              <button
                onClick={() => setActiveView("audio")}
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all ${
                  activeView === "audio"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio Narration</span>
              </button>

              <button
                onClick={() => setActiveView("quiz")}
                className={`px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all relative ${
                  activeView === "quiz"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Interactive Quiz</span>
                {quizSubmitted && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              VIEW 1: STRUCTURED STUDY NOTES
              ════════════════════════════════════════════════════════════════ */}
          {activeView === "notes" && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg p-5 sm:p-8 space-y-6">
              {/* Executive Summary Card */}
              {studyData.summary && (
                <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-500/20 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Executive Summary</span>
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {studyData.summary}
                  </p>
                </div>
              )}

              {/* Key Takeaways Chips */}
              {Array.isArray(studyData.keyTakeaways) && studyData.keyTakeaways.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Core Key Takeaways:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {studyData.keyTakeaways.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Formatted Notes Markdown Content */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>Detailed Lecture & Concept Notes</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyNotes}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Copy notes"
                    >
                      {copiedNotes ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadNotes}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      title="Download Markdown"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export .md</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/80 dark:border-white/5 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap select-text">
                  {studyData.notesMarkdown}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 2: AUDIO NARRATION & TEXT-TO-SPEECH (TTS)
              ════════════════════════════════════════════════════════════════ */}
          {activeView === "audio" && (
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white dark:from-slate-950 dark:via-[#0b141a] dark:to-slate-950 border border-emerald-200/80 dark:border-white/10 shadow-xl p-6 sm:p-8 space-y-6 text-center flex flex-col items-center transition-colors">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1 shadow-sm">
                <Volume2 className="w-8 h-8" />
              </div>

              <div className="max-w-md space-y-1">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Audio Transcription Player</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Listen to the AI-generated summary and core lecture takeaways on the go.
                </p>
              </div>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-sm py-2">
                {[30, 60, 90, 45, 75, 100, 50, 85, 40, 70, 95, 60, 80, 35, 65, 90, 45, 75, 55, 80].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${isSpeaking ? h : 20}%` }}
                    className={`w-1.5 rounded-full transition-all duration-300 ${
                      isSpeaking ? "bg-emerald-600 dark:bg-emerald-400 animate-pulse" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={stopSpeech}
                  disabled={!isSpeaking && !isPaused}
                  className="p-3 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-700 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white transition-all disabled:opacity-40 shadow-sm"
                  title="Stop playback"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={isSpeaking ? pauseSpeech : startSpeech}
                  className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 shadow-lg shadow-emerald-600/30 dark:shadow-emerald-500/30 flex items-center justify-center transition-all active:scale-95 cursor-pointer font-bold"
                  title={isSpeaking ? "Pause narration" : "Play narration"}
                >
                  {isSpeaking ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  )}
                </button>

                {/* Speed Toggle Chips */}
                <div className="flex items-center gap-1 bg-white dark:bg-white/5 rounded-2xl p-1 border border-slate-200 dark:border-white/10 shadow-sm">
                  {[1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changeSpeed(rate)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all ${
                        speechRate === rate
                          ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[11px]">
                {isSpeaking ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                    ● Playing audio narration at {speechRate}x speed...
                  </span>
                ) : isPaused ? (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Paused. Click play to resume.</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">Click Play to begin reading the summary out loud.</span>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 3: INTERACTIVE MULTIPLE-CHOICE QUIZ
              ════════════════════════════════════════════════════════════════ */}
          {activeView === "quiz" && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-lg p-5 sm:p-8 space-y-6">
              {/* Quiz Header & Score Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {studyData.quiz?.quizTitle || `${courseCode} Interactive Quiz`}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                      {studyData.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Test your understanding with these {studyData.quiz?.questions?.length || 5} conceptual questions.
                  </p>
                </div>

                {quizSubmitted && (
                  <div className="px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2 shadow-sm">
                    <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                        Score: {quizScore} / {studyData.quiz?.questions?.length}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                        ({Math.round((quizScore / (studyData.quiz?.questions?.length || 1)) * 100)}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {studyData.quiz?.questions?.map((q, qIdx) => {
                  const selectedOpt = userAnswers[qIdx];
                  const hasAnswered = selectedOpt !== undefined;
                  const isCorrect = selectedOpt === q.correctIndex;

                  return (
                    <div
                      key={q.id || qIdx}
                      className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-4"
                    >
                      {/* Question Prompt */}
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200/60 dark:border-transparent">
                          {qIdx + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                            {q.question}
                          </p>
                        </div>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-9">
                        {q.options?.map((opt, optIdx) => {
                          const optionLetter = String.fromCharCode(65 + optIdx);
                          const isOptionSelected = selectedOpt === optIdx;
                          const isOptionCorrect = q.correctIndex === optIdx;

                          let optionStyle =
                            "bg-white dark:bg-slate-900/90 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400/50 shadow-sm";

                          if (quizSubmitted) {
                            if (isOptionCorrect) {
                              optionStyle =
                                "bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30";
                            } else if (isOptionSelected && !isCorrect) {
                              optionStyle =
                                "bg-rose-50 dark:bg-rose-500/15 border-rose-400 dark:border-rose-500/50 text-rose-700 dark:text-rose-400 line-through";
                            }
                          } else if (isOptionSelected) {
                            optionStyle =
                              "bg-indigo-600 text-white border-indigo-600 shadow-md font-bold";
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectAnswer(qIdx, optIdx)}
                              disabled={quizSubmitted}
                              className={`p-3 rounded-2xl border text-left text-xs transition-all flex items-start gap-2.5 ${optionStyle} ${
                                !quizSubmitted ? "cursor-pointer active:scale-[0.98]" : "cursor-default"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                  isOptionSelected && !quizSubmitted
                                    ? "bg-white text-indigo-600"
                                    : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {optionLetter}
                              </span>
                              <span className="leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Feedback Box (After Submission) */}
                      {quizSubmitted && q.explanation && (
                        <div
                          className={`mt-3 p-3.5 rounded-xl border text-xs leading-relaxed ml-9 ${
                            isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-300"
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5 mb-1">
                            {isCorrect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Correct Answer!</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>
                                  Correct Option: {String.fromCharCode(65 + q.correctIndex)} (
                                  {q.options[q.correctIndex]})
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-[11px] opacity-90">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Submit / Retake Action Button */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {Object.keys(userAnswers).length} of {studyData.quiz?.questions?.length} answered
                </span>

                <div className="flex items-center gap-2">
                  {quizSubmitted ? (
                    <button
                      type="button"
                      onClick={handleRetakeQuiz}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake Quiz</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(userAnswers).length === 0}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit Answers & View Score</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Saved History Drawer (Past Note & Quiz Packs) ── */}
      {history.length > 0 && (
        <div className="rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Past Study Guides for {courseCode} ({history.length})</span>
            </h4>
            <span className="text-[10px] text-slate-400">Click to revisit</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map((item) => {
              const isSelected = studyData?._id === item._id;
              const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "";

              return (
                <div
                  key={item._id}
                  onClick={() => {
                    setStudyData(item);
                    setUserAnswers({});
                    setQuizSubmitted(false);
                    setQuizScore(0);
                    setActiveView("notes");
                  }}
                  className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex flex-col justify-between gap-3 group relative ${
                    isSelected
                      ? "bg-indigo-600/15 border-indigo-500 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/5 hover:border-indigo-400/30"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-transparent">
                        {item.difficulty || "Study"}
                      </span>
                      <button
                        onClick={(e) => handleDeleteHistory(item._id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-1"
                        title="Delete record"
                      >
                        <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-400" />
                      </button>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.topic}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.summary || "Summary notes & quiz available"}
                    </p>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5">
                    <span>{dateStr}</span>
                    <span className="text-indigo-400 font-semibold group-hover:underline">
                      Load Guide →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
