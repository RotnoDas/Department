"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  Printer, 
  Calendar, 
  Hash, 
  Layers, 
  ShieldCheck, 
  RefreshCw, 
  Sparkles,
  TrendingUp,
  Clock,
  Info,
  ChevronRight,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { SEMESTER_LABELS } from "@/data/courses";
import StudentAIForecastCard from "./StudentAIForecastCard";

// Official PUST grading scale for legend
const GRADING_SCALE_INFO = [
  { range: "80% and above", grade: "A+", gp: "4.00", remark: "Outstanding", color: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" },
  { range: "75% to <80%",  grade: "A",  gp: "3.75", remark: "Excellent",   color: "bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800" },
  { range: "70% to <75%",  grade: "A-", gp: "3.50", remark: "Very Good",   color: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800" },
  { range: "65% to <70%",  grade: "B+", gp: "3.25", remark: "Good",        color: "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800" },
  { range: "60% to <65%",  grade: "B",  gp: "3.00", remark: "Satisfactory",color: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" },
  { range: "55% to <60%",  grade: "B-", gp: "2.75", remark: "Below Satisfactory", color: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800" },
  { range: "50% to <55%",  grade: "C+", gp: "2.50", remark: "Average",     color: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800" },
  { range: "45% to <50%",  grade: "C",  gp: "2.25", remark: "Pass",        color: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700" },
  { range: "40% to <45%",  grade: "D",  gp: "2.00", remark: "Poor",        color: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800" },
  { range: "<40%",         grade: "F",  gp: "0.00", remark: "Fail",        color: "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800" },
];

function getGradeBadgeClass(grade) {
  const g = String(grade || "").toUpperCase();
  if (g === "A+") return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700";
  if (g === "A")  return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700";
  if (g === "A-") return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700";
  if (g === "B+" || g === "B") return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700";
  if (g === "B-" || g === "C+" || g === "C") return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700";
  if (g === "D")  return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-700";
  return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700";
}

export default function StudentResultsSection({ student }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [scaleModalTab, setScaleModalTab] = useState("scale"); // "scale" | "formulas" | "evaluation"

  const fetchResults = async (showToast = false) => {
    try {
      setLoading(true);
      const queryStr = student?.studentId ? `?studentId=${encodeURIComponent(student.studentId)}` : "";
      const res = await apiFetch(`/api/results/student/my-results${queryStr}`);
      if (!res.ok) {
        throw new Error(res.data?.error || "Failed to load results");
      }
      const resData = res.data;
      setData(resData);
      
      // Default selected semester to the latest published semester
      if (resData.results && resData.results.length > 0) {
        const sorted = [...resData.results].sort((a, b) => b.semester - a.semester);
        setSelectedSemester((prev) => prev !== null ? prev : sorted[0].semester);
      }
      if (showToast) {
        toast.success("Academic records updated successfully!");
      }
    } catch (err) {
      console.error("Error loading student results:", err);
      if (showToast) {
        toast.error(err.message || "Could not load semester results.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(false);
  }, [student?.studentId]);

  const activeResult = useMemo(() => {
    if (!data?.results || !selectedSemester) return null;
    return data.results.find((r) => r.semester === selectedSemester) || null;
  }, [data, selectedSemester]);

  const printTranscript = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Section Header ────────────────────────────────────────── */}
      <div className="p-7 sm:p-8 rounded-[2.5rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm text-slate-900 dark:text-white transition-colors relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/[0.05] dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-sky-500/[0.04] dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Official Academic Records</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <Award className="w-8 h-8 text-amber-500 dark:text-amber-300" />
              <span>Semester Results & Academic Transcripts</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              Official semester grade reports published by the Controller of Examinations.
              {data?.currentSemester && (
                <span className="block mt-1 text-xs text-indigo-600 dark:text-sky-300 font-medium">
                  Enrolled in <strong>Semester {data.currentSemester}</strong>. Showing all verified completed prior semesters (Semesters 1 to {Math.max(1, data.currentSemester - 1)}).
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
            <button
              onClick={() => setShowScaleModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-all border border-slate-200/90 dark:border-white/10 shadow-xs"
              title="View PUST 4.00 Grading Scale"
            >
              <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-sky-300" />
              <span>Grading Scale</span>
            </button>
            <button
              onClick={printTranscript}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/25 hover:scale-[1.02] active:scale-95"
              title="Print official transcript"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Transcript</span>
            </button>
            <button
              onClick={() => fetchResults(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white transition-all border border-slate-200/90 dark:border-white/10 shadow-xs"
              title="Refresh results"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Executive Performance Stats Cards ─────────────────────── */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {/* Cumulative CGPA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-slate-900 dark:text-white">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              <span>Overall CGPA</span>
              <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-300 tracking-tight">
                {data ? Number(data.overallCGPA || 0).toFixed(2) : "—"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">/ 4.00</span>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 line-clamp-1">
              {data?.academicStanding || "Good Standing"}
            </div>
          </div>

          {/* Credits Completed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-slate-900 dark:text-white">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              <span>Credits Earned</span>
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-sky-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-sky-300 tracking-tight">
                {data ? data.totalCreditsCompleted : "—"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Credits</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-300">
              Attempted: <span className="font-bold text-slate-800 dark:text-white">{data?.totalCreditsAttempted || 0}</span> credits
            </div>
          </div>

          {/* Courses Passed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-slate-900 dark:text-white">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              <span>Courses Passed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-300 tracking-tight">
                {data ? data.totalCoursesPassed : "—"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Passed</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
              100% Pass Rate Across Semesters
            </div>
          </div>

          {/* Completed Semesters Count */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-xs text-slate-900 dark:text-white">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1 font-semibold">
              <span>Published Semesters</span>
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-300" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {data?.resultsCount ?? "—"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                of {data?.currentSemester ? data.currentSemester - 1 : 0} completed
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-indigo-300">
              Current: <strong className="text-slate-800 dark:text-white">Semester {data?.currentSemester || 7}</strong>
            </div>
          </div>
        </div>
      </div>


      {/* ── AI 8-Semester Graduation Forecast & Academic Performance Coach ── */}
      {data?.results && data.results.length > 0 && (
        <StudentAIForecastCard student={student || data?.student} initialResults={data.results} />
      )}

      {/* ── Content Section ────────────────────────────────────────── */}
      {loading && !data ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
          <RefreshCw className="w-8 h-8 mx-auto text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Retrieving official academic results...
          </p>
        </div>
      ) : !data?.results || data.results.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            No Published Semester Results Found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Your results for prior semesters have not been uploaded by the department administration yet.
            Please check back after official publication.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Semester Navigation Pills ──────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-sm">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 px-2 flex items-center justify-between">
              <span>Select Semester Result</span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold normal-case">
                Showing Semesters 1 to {data.currentSemester - 1}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {data.results.map((semResult) => {
                const isSelected = selectedSemester === semResult.semester;
                return (
                  <button
                    key={semResult.semester}
                    onClick={() => setSelectedSemester(semResult.semester)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02]"
                        : "bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-300 border-slate-200/90 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
                    }`}
                  >
                    <Award className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-slate-500 dark:text-slate-400"}`} />
                    <div className="text-left">
                      <div className="leading-tight font-extrabold">
                        Semester {semResult.semester}
                      </div>
                      <div className={`text-[10px] font-semibold leading-none mt-0.5 ${isSelected ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>
                        SGPA: {Number(semResult.sgpa || 0).toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* In-Progress Current Semester Indicator */}
              {data.currentSemester && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold shrink-0 border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 shadow-sm">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                  <div className="text-left">
                    <div className="leading-tight font-bold">
                      Semester {data.currentSemester} (Current)
                    </div>
                    <div className="text-[10px] text-amber-800/80 dark:text-amber-400 font-medium">
                      Classes In Progress • Results Pending
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Active Semester Grade Sheet Detail ─────────────────── */}
          {activeResult && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-6 sm:p-7 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
                      Semester {activeResult.semester}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Academic Session: <strong className="text-slate-800 dark:text-slate-300">{activeResult.session}</strong>
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Exam Year: <strong className="text-slate-800 dark:text-slate-300">{activeResult.examYear}</strong>
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    {activeResult.semesterLabel || SEMESTER_LABELS[activeResult.semester] || `Semester ${activeResult.semester}`} Grade Sheet
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-right shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Term GPA (I)</div>
                    <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                      {Number(activeResult.sgpa || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-right shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Yearly YGPA (II)
                    </div>
                    <div className="text-lg font-black text-sky-700 dark:text-sky-400">
                      {activeResult.ygpa !== undefined && activeResult.ygpa !== null ? Number(activeResult.ygpa).toFixed(2) : "—"}
                    </div>
                  </div>
                  <div className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-right shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cumulative CGPA (III)</div>
                    <div className="text-lg font-black text-amber-700 dark:text-amber-400">
                      {Number(activeResult.cgpa || 0).toFixed(2)}
                    </div>
                  </div>
                  {(activeResult.isDeansList || Number(activeResult.cgpa || 0) >= 3.80) && (
                    <div className="px-3 py-2 rounded-2xl bg-amber-50 border border-amber-300 dark:bg-amber-500/10 dark:border-amber-400/40 text-amber-800 dark:text-amber-300 flex items-center gap-1.5 font-bold text-xs shadow-sm">
                      <Sparkles className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>★ Dean's List</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Courses Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/60 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <th className="py-3.5 px-6">Course Code</th>
                      <th className="py-3.5 px-6">Course Title</th>
                      <th className="py-3.5 px-4 text-center">Credit (Ci)</th>
                      <th className="py-3.5 px-4 text-center">Marks (100)</th>
                      <th className="py-3.5 px-4 text-center">Letter Grade (LG)</th>
                      <th className="py-3.5 px-4 text-center">Grade Point (Gi)</th>
                      <th className="py-3.5 px-4 text-center font-mono">Points (Ci * Gi)</th>
                      <th className="py-3.5 px-6 text-center">Academic Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                    {(activeResult.courses || []).map((course, idx) => {
                      const badgeClass = getGradeBadgeClass(course.grade);
                      const cr = Number(course.credits || 0);
                      const gp = Number(course.gradePoint || 0);
                      const earnedPoints = (cr * gp).toFixed(2);
                      return (
                        <tr 
                          key={course.courseCode || idx}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-6">
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                              {course.courseCode}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-slate-100">
                            {course.courseTitle}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                            {cr.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="font-black text-slate-900 dark:text-slate-100">
                              {course.marks !== null && course.marks !== undefined ? course.marks : "—"}
                            </div>
                            {(course.attendanceMarks !== null && course.attendanceMarks !== undefined || course.caMarks !== null && course.caMarks !== undefined) && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5" title="Attendance (10) + CA (20/30) + Final Exam (70/60)">
                                {course.attendanceMarks !== null && course.attendanceMarks !== undefined && (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold" title={`Class Attendance: ${course.attendancePercentage ?? 100}%`}>
                                    Att: {course.attendanceMarks}
                                  </span>
                                )}
                                {course.caMarks !== null && course.caMarks !== undefined && (
                                  <span className="text-indigo-700 dark:text-indigo-400 font-bold"> + CA: {course.caMarks}</span>
                                )}
                                {course.finalMarks !== null && course.finalMarks !== undefined && (
                                  <span className="text-slate-600 dark:text-slate-400 font-semibold"> + Final: {course.finalMarks}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-black border ${badgeClass}`}>
                              {course.grade}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-slate-900 dark:text-slate-100">
                            {gp.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-black text-indigo-700 dark:text-indigo-400">
                            {earnedPoints}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {course.status === "passed" || course.grade !== "F" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Passed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                <span>Fail</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/90 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-white/10 text-xs sm:text-sm">
                      <td colSpan={2} className="py-4 px-6 text-right uppercase tracking-wider font-extrabold text-slate-700 dark:text-slate-300">
                        Total Σ (Ordinance Sec 20.8.1.1):
                      </td>
                      <td className="py-4 px-4 text-center text-purple-700 dark:text-purple-300 font-extrabold">
                        {Number(activeResult.totalCredits || 0).toFixed(2)} Credits
                      </td>
                      <td className="py-4 px-4 text-center text-slate-400">—</td>
                      <td className="py-4 px-4 text-center text-slate-400">—</td>
                      <td className="py-4 px-4 text-center text-slate-400">—</td>
                      <td className="py-4 px-4 text-center font-mono font-black text-indigo-700 dark:text-indigo-400">
                        {Number(activeResult.totalGradePoints || (activeResult.courses || []).reduce((s, c) => s + ((c.credits || 0) * (c.gradePoint || 0)), 0)).toFixed(2)} Points
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                          GPA = {Number(activeResult.sgpa || 0).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Live Formula Callout */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2 font-mono text-slate-800 dark:text-slate-200">
                  <span className="font-extrabold text-purple-700 dark:text-purple-400">Formula (I) GPA:</span>
                  <span className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                    (Σ Ci * Gi) / (Σ Ci) = {Number(activeResult.totalGradePoints || (activeResult.courses || []).reduce((s, c) => s + ((c.credits || 0) * (c.gradePoint || 0)), 0)).toFixed(2)} / {Number(activeResult.totalCredits || 0).toFixed(2)} = <strong className="text-indigo-700 dark:text-indigo-400">{Number(activeResult.sgpa || 0).toFixed(2)}</strong> {activeResult.sgpaExact ? `(${Number(activeResult.sgpaExact).toFixed(3)})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  <span>Yearly YGPA: <strong className="text-sky-700 dark:text-sky-400">{activeResult.ygpa !== undefined && activeResult.ygpa !== null ? Number(activeResult.ygpa).toFixed(2) : "—"}</strong></span>
                  <span>•</span>
                  <span>Cumulative CGPA: <strong className="text-amber-700 dark:text-amber-400">{Number(activeResult.cgpa || 0).toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Note / Disclaimer */}
              <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-900 border-t border-slate-200/70 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Verified departmental result record. Controller of Examinations, Pabna University of Science and Technology.
                  </span>
                </div>
                {activeResult.remarks && (
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Remarks: {activeResult.remarks}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Cumulative Semester Summary Matrix ─────────────────── */}
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/90 dark:border-white/10 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Academic Trajectory & Multi-Semester Standing</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chronological progression of your SGPA and running cumulative CGPA across all completed semesters.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/50 uppercase tracking-wider text-[10px] font-extrabold text-slate-700 dark:text-slate-400">
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Exam Year</th>
                    <th className="py-3 px-4 text-center">Credits (Σ Ci)</th>
                    <th className="py-3 px-4 text-center font-mono">Points (Σ Ci*Gi)</th>
                    <th className="py-3 px-4 text-center">Term GPA (I)</th>
                    <th className="py-3 px-4 text-center">Yearly YGPA (II)</th>
                    <th className="py-3 px-4 text-center">Running CGPA (III)</th>
                    <th className="py-3 px-4 text-center">Honors / Standing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {data.results.map((r) => {
                    const isDeans = r.isDeansList || Number(r.cgpa || 0) >= 3.80;
                    return (
                      <tr 
                        key={r.semester}
                        onClick={() => setSelectedSemester(r.semester)}
                        className={`cursor-pointer transition-colors ${
                          selectedSemester === r.semester ? "bg-indigo-50/80 dark:bg-indigo-950/30 font-bold" : "hover:bg-slate-50 dark:hover:bg-indigo-950/20"
                        }`}
                      >
                        <td className="py-3 px-4 flex items-center gap-2 font-bold text-slate-900 dark:text-slate-200">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          <span>Semester {r.semester}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.session}</td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.examYear}</td>
                        <td className="py-3 px-4 text-center text-slate-800 dark:text-slate-200 font-bold">{Number(r.totalCredits || 0).toFixed(2)}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                          {r.totalGradePoints !== undefined && r.totalGradePoints !== null
                            ? Number(r.totalGradePoints).toFixed(2)
                            : (r.courses || []).reduce((s, c) => s + ((c.credits || 0) * (c.gradePoint || 0)), 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-indigo-700 dark:text-indigo-400 text-sm">
                          {Number(r.sgpa || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-sky-700 dark:text-sky-400">
                          {r.ygpa !== undefined && r.ygpa !== null ? Number(r.ygpa).toFixed(2) : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-amber-700 dark:text-amber-400 text-sm">
                          {Number(r.cgpa || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isDeans ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 shadow-sm">
                              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-600" />
                              <span>Dean's List</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              Good Standing
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Grading Scale & Ordinance Regulations Modal ─────────────── */}
      {showScaleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    PUST Academic Ordinance & Grading Regulations
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dept. of Computer Science & Engineering • Official Ordinance Session 2021-2022
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowScaleModal(false)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 text-xs font-bold">
              <button
                onClick={() => setScaleModalTab("scale")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scaleModalTab === "scale"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                1. Grading Scale (Sec 20.8 f)
              </button>
              <button
                onClick={() => setScaleModalTab("formulas")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scaleModalTab === "formulas"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                2. GPA & CGPA Formulas (I, II, III)
              </button>
              <button
                onClick={() => setScaleModalTab("evaluation")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  scaleModalTab === "evaluation"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                3. Mark Distribution (30/70 & 40/60)
              </button>
            </div>

            {/* Tab 1: 10-tier Grading Scale */}
            {scaleModalTab === "scale" && (
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {GRADING_SCALE_INFO.map((item) => (
                  <div 
                    key={item.grade}
                    className={`flex items-center justify-between p-3 rounded-xl border ${item.color} text-xs font-semibold shadow-sm`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 font-black text-base">{item.grade}</span>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">{item.range}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm">{item.gp}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{item.remark}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Ordinance Formulas */}
            {scaleModalTab === "formulas" && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 text-xs">
                {/* Formula I */}
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider text-[11px]">
                      Formula (I) — Semester Grade Point Average (GPA)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                      Section 20.8 (a)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 font-mono text-center font-bold text-sm text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 shadow-sm">
                    GPA = ( Σ [i=1 to n] Ci * Gi ) / ( Σ [i=1 to n] Ci )
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Where <em>n</em> is number of courses offered during the semester, <em>Ci</em> is credits allotted to course <em>i</em>, and <em>Gi</em> is the grade point earned. Courses receiving grade 'F' (0.00) count in total credits.
                  </p>
                </div>

                {/* Formula II */}
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sky-950 dark:text-sky-200 uppercase tracking-wider text-[11px]">
                      Formula (II) — Yearly Grade Point Average (YGPA)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-200 font-mono font-bold text-[10px] border border-sky-200 dark:border-sky-800">
                      Section 20.8 (b)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 font-mono text-center font-bold text-sm text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900 shadow-sm">
                    YGPA = ( Σ [j=1 to 2] Cj * Gj ) / ( Σ [j=1 to 2] Cj )
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Calculated for each academic year across its 2 semesters (Year 1: Sem 1 & 2; Year 2: Sem 3 & 4; Year 3: Sem 5 & 6; Year 4: Sem 7 & 8).
                  </p>
                </div>

                {/* Formula III */}
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-950 dark:text-amber-200 uppercase tracking-wider text-[11px]">
                      Formula (III) — Cumulative Grade Point Average (CGPA)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-mono font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                      Section 20.8 (c)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 font-mono text-center font-bold text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shadow-sm">
                    CGPA = ( Σ [k=1 to m] Ck * Gk ) / ( Σ [k=1 to m] Ck )
                  </div>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    Weighted cumulative performance from the first year up to the end of the term being evaluated.
                  </p>
                </div>

                {/* Section 20.9 Dean's List */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-700/60 flex items-start gap-3 shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-amber-950 dark:text-amber-200">
                      Section 20.9 — Dean's List Honor Distinction
                    </h5>
                    <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                      "As a recognition of excellent academic performance, the name(s) of student(s) obtaining an average CGPA of <strong>3.80 or above</strong> (without any improvement) shall be published on the Dean's List."
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Mark Distribution */}
            {scaleModalTab === "evaluation" && (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 text-xs">
                {/* Theory */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-200">
                    <span>Theoretical Course Marks (100 Marks Total)</span>
                    <span className="text-indigo-700 dark:text-indigo-400 font-mono font-bold">30% Continuous + 70% Final</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-semibold">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Class Attendance</div>
                      <div className="text-base font-black text-indigo-700 dark:text-indigo-400">10%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Tests & Quizzes</div>
                      <div className="text-base font-black text-indigo-700 dark:text-indigo-400">20%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Final Exam (3h)</div>
                      <div className="text-base font-black text-purple-700 dark:text-purple-400">70%</div>
                    </div>
                  </div>
                </div>

                {/* Sessional */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-200">
                    <span>Sessional / Laboratory Marks (100 Marks Total)</span>
                    <span className="text-sky-700 dark:text-sky-400 font-mono font-bold">40% Continuous + 60% Final</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1 font-semibold">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Lab Attendance</div>
                      <div className="text-base font-black text-sky-700 dark:text-sky-400">10%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Tests & Reports</div>
                      <div className="text-base font-black text-sky-700 dark:text-sky-400">30%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Semester Final Exam</div>
                      <div className="text-base font-black text-blue-700 dark:text-blue-400">60%</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <button
                onClick={() => setShowScaleModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
