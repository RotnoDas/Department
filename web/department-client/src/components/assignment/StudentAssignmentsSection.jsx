"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Upload,
  Calendar,
  Clock,
  Award,
  CheckCircle,
  AlertCircle,
  Paperclip,
  Download,
  ExternalLink,
  X,
  Send,
  Star,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

export default function StudentAssignmentsSection({
  student,
  semester,
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "submitted" | "graded"

  // Submission modal state
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const sem = semester || student?.semester || "7";
      const email = student?.email || "";
      const url = `/backend/api/assignments?semester=${encodeURIComponent(sem)}&studentEmail=${encodeURIComponent(email)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.warn("Failed to load student assignments:", err);
    } finally {
      setLoading(false);
    }
  }, [semester, student?.semester, student?.email]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionFile && !submissionNotes.trim()) {
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
      form.append("semester", semester || student?.semester || "1");
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

      toast.success(data.message || "Assignment submitted successfully!");
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
      if (filterStatus === "pending") return !mySub;
      if (filterStatus === "submitted") return Boolean(mySub && mySub.marks === null);
      if (filterStatus === "graded") return Boolean(mySub && mySub.marks !== null);
      return true;
    });
  }, [assignments, filterStatus]);

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
            Review coursework assigned by faculty, upload your problem solutions before deadlines, and check teacher feedback.
          </p>
        </div>

        {/* Filter status buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start sm:self-auto">
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
              No assignments in this category
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              You are all caught up! When faculty publish new assignments for your semester, they will appear right here.
            </p>
          </div>
        </div>
      ) : (
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
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between flex-wrap gap-2">
                  {mySub ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                          mySub.isLate
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{mySub.isLate ? "Submitted Late" : "Submitted"}</span>
                      </span>

                      {mySub.filePath && (
                        <a
                          href={mySub.filePath.startsWith("http") ? mySub.filePath : `/backend${mySub.filePath}`}
                          target="_blank"
                          rel="noreferrer"
                          download={mySub.originalName || true}
                          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 underline flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>My File</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-rose-500 dark:text-rose-400">
                      Not Submitted Yet
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSubmittingAssignment(a);
                      setSubmissionNotes(mySub?.notes || "");
                      setSubmissionFile(null);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      mySub
                        ? "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{mySub ? "Update Submission" : "Submit Coursework"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUBMIT MODAL ─────────────────────────────────────── */}
      {submittingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Submit Assignment Solution
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {submittingAssignment.courseCode} • {submittingAssignment.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittingAssignment(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Attach Solution File <span className="text-rose-500">*</span>
                </label>
                {submissionFile ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {submissionFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSubmissionFile(null)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition">
                    <Upload className="w-6 h-6 text-indigo-500" />
                    <span className="text-xs font-bold">Choose your completed coursework file</span>
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Submitting..." : "Submit Work"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
