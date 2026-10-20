"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Upload,
  Calendar,
  Clock,
  Award,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Download,
  ExternalLink,
  X,
  Send,
  Star,
  Check,
  GraduationCap,
  RefreshCw,
  Edit3,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { SEMESTER_COURSES, SEMESTER_LABELS } from "@/data/courses";

export default function StudentAssignmentsSection({
  student,
  semester,
}) {
  const [mounted, setMounted] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "submitted" | "graded"
  const [selectedCourse, setSelectedCourse] = useState("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for custom course filter event from sidebar
  useEffect(() => {
    const handleCourseFilter = (e) => {
      if (e.detail?.courseCode) {
        setSelectedCourse(e.detail.courseCode);
      }
    };
    window.addEventListener("dashboard-filter-course", handleCourseFilter);
    return () => window.removeEventListener("dashboard-filter-course", handleCourseFilter);
  }, []);

  // Determine student's enrolled semester strictly from their registration data
  const studentSemester = useMemo(() => {
    const raw = semester ?? student?.semester;
    if (!raw) return "";
    const match = String(raw).match(/(\d+)/);
    return match ? match[1] : String(raw);
  }, [semester, student?.semester]);

  // List of courses belonging specifically to the student's semester
  const semesterCourses = useMemo(() => {
    if (!studentSemester) return [];
    return SEMESTER_COURSES[studentSemester] || [];
  }, [studentSemester]);

  // Submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!studentSemester) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const email = student?.email || "";
      const url = `/backend/api/assignments?semester=${encodeURIComponent(studentSemester)}&studentEmail=${encodeURIComponent(email)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.assignments) {
        setAssignments(data.assignments);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      console.warn("Failed to load student assignments:", err);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [studentSemester, student?.email]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Reset course filter when semester changes
  useEffect(() => {
    setSelectedCourse("all");
  }, [studentSemester]);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    const isUpdating = Boolean(submittingAssignment?.mySubmission);
    const hasExistingFile = Boolean(submittingAssignment?.mySubmission?.filePath);

    if (!submissionFile && !submissionNotes.trim() && !hasExistingFile) {
      return toast.error("Please attach a file or write submission notes.");
    }

    setIsSubmitting(true);
    try {
      const assignmentId = submittingAssignment._id || submittingAssignment.id;
      const form = new FormData();
      form.append("studentEmail", student?.email || "");
      form.append("studentName", student?.name || "Student");
      form.append("studentId", student?.studentId || "");
      form.append("batch", student?.batch || "");
      form.append("semester", studentSemester || "1");
      form.append("notes", submissionNotes.trim());

      if (submissionFile) {
        form.append("file", submissionFile);
      }

      const res = await fetch(`/backend/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit assignment");
      }

      toast.success(data.message || (isUpdating ? "Submission updated successfully!" : "Assignment submitted successfully!"));

      // Immediately reflect updated submission in local state for instant UI update
      if (data.submission) {
        setAssignments((prev) =>
          prev.map((item) => {
            const itemId = item._id || item.id;
            return itemId === assignmentId
              ? { ...item, mySubmission: data.submission }
              : item;
          })
        );
      }

      setSubmittingAssignment(null);
      setSubmissionFile(null);
      setSubmissionNotes("");
      fetchAssignments();
    } catch (err) {
      toast.error(err.message || "Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper formatting
  const formatDeadline = (dateStr) => {
    if (!dateStr) return "No deadline";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return String(dateStr);
    }
  };

  const getDeadlineTimer = (dateStr) => {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr) - new Date();
    if (diffMs <= 0) return { text: "Deadline Passed", isLate: true };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 1) return { text: `Due in ${days} days`, isLate: false };
    if (hours > 0) return { text: `Due in ${hours} hours`, isLate: false };
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return { text: `Due in ${mins} mins!`, isLate: false };
  };

  // Filtered
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const mySub = a.mySubmission;
      if (filterStatus === "pending" && mySub) return false;
      if (filterStatus === "submitted" && (!mySub || mySub.marks !== null)) return false;
      if (filterStatus === "graded" && (!mySub || mySub.marks === null)) return false;

      if (selectedCourse !== "all") {
        const cCode = (a.courseCode || "").toLowerCase().replace(/[\s-]/g, "");
        const sCode = selectedCourse.toLowerCase().replace(/[\s-]/g, "");
        if (cCode !== sCode) return false;
      }

      return true;
    });
  }, [assignments, filterStatus, selectedCourse]);

  const pendingCount = assignments.filter((a) => !a.mySubmission).length;

  return (
    <div
      id="assignments"
      className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Coursework & Assessment Center</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>My Assignments & Homework</span>
            {pendingCount > 0 ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold animate-pulse">
                {pendingCount} Due
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {assignments.length} Total
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Continuous assessments, lab tasks, and problem sets published by instructors for Semester {studentSemester || "your semester"}.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAssignments}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          title="Refresh assignments"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Locked Semester Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Semester {studentSemester || "Enrolled"}</span>
            {SEMESTER_LABELS[studentSemester] && (
              <span className="text-[11px] font-normal text-indigo-600/80 dark:text-indigo-400/80">
                • {SEMESTER_LABELS[studentSemester]}
              </span>
            )}
          </div>

          {/* Course Filter */}
          {semesterCourses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              aria-label="Filter assignments by course"
              className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Semester {studentSemester} Courses</option>
              {semesterCourses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Filter status buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start lg:self-auto">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === "all"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === "pending"
                ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Due ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("graded")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              filterStatus === "graded"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Graded
          </button>
        </div>
      </div>

      {/* Assignments Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
          <CheckCircle className="w-10 h-10 text-emerald-400 dark:text-emerald-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {filterStatus !== "all" || selectedCourse !== "all"
                ? "No assignments match your selected filters"
                : `No assignments published for Semester ${studentSemester || "your semester"} yet`}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              {filterStatus !== "all" || selectedCourse !== "all"
                ? "Try selecting another status tab or course filter above."
                : `When instructors publish problem sets or continuous assessments for Semester ${studentSemester || "your semester"}, they will appear right here.`}
            </p>
          </div>
        </div>
      ) : (
        <div
          data-lenis-prevent
          className="max-h-[620px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssignments.map((a, idx) => {
            const timer = getDeadlineTimer(a.deadline);
            const mySub = a.mySubmission;
            const isGraded = mySub && mySub.marks !== null && mySub.marks !== undefined;
            const aId = a._id || a.id || `asg-${idx}`;

            return (
              <div
                key={aId}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 transition shadow-xs hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top line with Course code and Max Marks */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                      {a.courseCode} • Sem {a.semester}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 px-2.5 py-0.5 rounded-md">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{a.totalMarks} Marks</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                  </div>

                  {/* Problem sheet file link */}
                  {a.filePath && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {a.originalName || "Problem Sheet Attachment"}
                        </span>
                      </div>
                      <a
                        href={a.filePath.startsWith("http") ? a.filePath : `/backend${a.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        download={a.originalName || true}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-indigo-600 hover:bg-indigo-50 transition shrink-0"
                        title="Download problem sheet"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Deadline line */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400">
                      Due: {formatDeadline(a.deadline)}
                    </span>
                    {timer && (
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          timer.isLate
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                        }`}
                      >
                        {timer.text}
                      </span>
                    )}
                  </div>

                  {/* Graded Card Details */}
                  {isGraded && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                      <div className="flex items-center justify-between font-bold text-xs text-emerald-800 dark:text-emerald-200">
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                          <span>Graded Assessment</span>
                        </span>
                        <span className="text-sm font-black">
                          {mySub.marks} / {a.totalMarks}
                        </span>
                      </div>
                      {mySub.feedback && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 italic pt-0.5">
                          &quot;{mySub.feedback}&quot;
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Submission Action Bar */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {mySub ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                            mySub.isLate
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{mySub.isLate ? "Submitted Late" : "Submitted"}</span>
                        </span>

                        {mySub.filePath && (
                          <a
                            href={mySub.filePath.startsWith("http") ? mySub.filePath : `/backend${mySub.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            download={mySub.originalName || true}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800/80 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 transition group shadow-2xs"
                            title="Download your submitted coursework file"
                          >
                            <Paperclip className="w-3 h-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[120px]">{mySub.originalName || "My Solution"}</span>
                            <Download className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                          </a>
                        )}
                      </div>

                      {mySub.submittedAt && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                          {new Date(mySub.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Not Submitted Yet</span>
                    </div>
                  )}

                  {mySub ? (
                    <button
                      type="button"
                      id={`btn-update-sub-${a._id}`}
                      data-action="update-submission"
                      onClick={() => {
                        setSubmittingAssignment(a);
                        setSubmissionNotes(mySub?.notes || "");
                        setSubmissionFile(null);
                      }}
                      className="relative group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer overflow-hidden bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-indigo-500/15 hover:from-indigo-600 hover:via-purple-600 hover:to-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white border border-indigo-200/90 dark:border-indigo-700/70 hover:border-transparent shadow-xs hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-100/90 dark:bg-indigo-900/60 group-hover:bg-white/20 transition-colors">
                        <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-colors" />
                      </div>
                      <span className="tracking-tight">Update Submission</span>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 group-hover:text-amber-200 transition-colors" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      id={`btn-submit-${a._id}`}
                      data-action="submit-coursework"
                      onClick={() => {
                        setSubmittingAssignment(a);
                        setSubmissionNotes("");
                        setSubmissionFile(null);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Submit Coursework</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* ── SUBMIT / UPDATE MODAL (Portaled to document.body) ──────── */}
      {submittingAssignment && mounted && typeof document !== "undefined" && createPortal((() => {
        const isUpdating = Boolean(submittingAssignment.mySubmission);
        const existingSub = submittingAssignment.mySubmission;

        return (
          <div
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overscroll-contain"
          >
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold ${
                    isUpdating
                      ? "bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-sky-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60"
                      : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                  }`}>
                    {isUpdating ? <Edit3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        {isUpdating ? "Update Coursework Submission" : "Submit Assignment Solution"}
                      </h3>
                      {isUpdating && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800">
                          Revision
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {submittingAssignment.courseCode} • {submittingAssignment.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="modal-close-btn"
                  onClick={() => setSubmittingAssignment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Revision Notice Banner when Updating */}
              {isUpdating && existingSub && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-indigo-900 dark:text-indigo-200 font-bold">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Current Active Submission</span>
                    </span>
                    {existingSub.submittedAt && (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {formatDeadline(existingSub.submittedAt)}
                      </span>
                    )}
                  </div>
                  {existingSub.filePath && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        File on file: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{existingSub.originalName || "Uploaded Solution"}</span>
                      </span>
                      <a
                        href={existingSub.filePath.startsWith("http") ? existingSub.filePath : `/backend${existingSub.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        download={existingSub.originalName || true}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </a>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                    💡 Selecting a new file will overwrite your existing submission. Leaving the file field empty retains your current file and updates your notes/links.
                  </p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmitWork} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      {isUpdating ? "Replace Solution File" : "Attach Solution File"}{" "}
                      {!isUpdating && <span className="text-rose-500">*</span>}
                    </span>
                    {isUpdating && (
                      <span className="text-[10px] font-normal text-slate-400">
                        (Leave empty to keep existing file)
                      </span>
                    )}
                  </label>
                  {submissionFile ? (
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                          {submissionFile.name}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          ({(submissionFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubmissionFile(null)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-1.5 p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition group">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600">
                        {isUpdating ? "Click to choose new replacement file" : "Choose your completed coursework file"}
                      </span>
                      <span className="text-[10px] text-slate-400">PDF, ZIP, DOCX, Code files up to 50MB</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Submission Notes or GitHub Link (Optional)
                  </label>
                  <textarea
                    id="submission-notes-input"
                    rows={3}
                    placeholder="Include any remarks, GitHub repo URL, or instructions for the instructor..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSubmittingAssignment(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all duration-200 cursor-pointer shadow-2xs active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="save-update-submission-btn"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 cursor-pointer disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 border border-indigo-400/25"
                  >
                    {isUpdating ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-3.5 h-3.5" />}
                    <span>{isSubmitting ? (isUpdating ? "Updating..." : "Submitting...") : (isUpdating ? "Save & Update Submission" : "Submit Work")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}
