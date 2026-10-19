"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  Award,
  Users,
  Download,
  CheckCircle,
  ExternalLink,
  Trash2,
  X,
  Search,
  AlertCircle,
  Paperclip,
  Check,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

export default function TeacherAssignmentsSection({
  teacher,
  courses = [],
}) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Grading states (key: submissionId -> { marks, feedback, saving })
  const [gradingState, setGradingState] = useState({});

  // Create form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseCode: "",
    semester: "7",
    deadline: "",
    totalMarks: "20",
  });
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const email = teacher?.email || "";
      const url = email
        ? `/backend/api/assignments?teacherEmail=${encodeURIComponent(email)}`
        : "/backend/api/assignments";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (err) {
      console.warn("Failed to load assignments:", err);
    } finally {
      setLoading(false);
    }
  }, [teacher?.email]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.courseCode || !formData.deadline) {
      return toast.error("Please fill in title, course code, and deadline.");
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", formData.title.trim());
      form.append("description", formData.description.trim());
      form.append("courseCode", formData.courseCode.trim());
      form.append("semester", formData.semester);
      form.append("deadline", formData.deadline);
      form.append("totalMarks", formData.totalMarks);
      form.append("teacherName", teacher?.name || "Faculty Member");
      form.append("teacherEmail", teacher?.email || "");
      form.append("teacherId", teacher?.teacherId || "");

      if (attachedFile) {
        form.append("file", attachedFile);
      }

      const res = await fetch("/backend/api/assignments", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create assignment");
      }

      toast.success("Assignment created and published to students!");
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        courseCode: "",
        semester: "7",
        deadline: "",
        totalMarks: "20",
      });
      setAttachedFile(null);
      fetchAssignments();
    } catch (err) {
      toast.error(err.message || "Failed to create assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (id, title) => {
    if (!window.confirm(`Delete assignment "${title}" and all its student submissions?`)) return;

    try {
      const res = await fetch(`/backend/api/assignments/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Assignment deleted.");
        setAssignments((prev) => prev.filter((a) => (a._id || a.id) !== id));
      } else {
        toast.error(data.error || "Failed to delete assignment");
      }
    } catch {
      toast.error("Network error deleting assignment");
    }
  };

  const handleOpenSubmissions = async (assignment) => {
    setActiveAssignment(assignment);
    setShowSubmissionsModal(true);
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/backend/api/assignments/${assignment._id || assignment.id}/submissions`);
      const data = await res.json();
      if (res.ok && data.submissions) {
        setSubmissions(data.submissions);
        const initialGrading = {};
        data.submissions.forEach((sub) => {
          initialGrading[sub._id] = {
            marks: sub.marks !== null && sub.marks !== undefined ? String(sub.marks) : "",
            feedback: sub.feedback || "",
            saving: false,
          };
        });
        setGradingState(initialGrading);
      }
    } catch (err) {
      toast.error("Could not load submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId) => {
    const current = gradingState[submissionId];
    if (!current) return;

    setGradingState((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], saving: true },
    }));

    try {
      const assignmentId = activeAssignment._id || activeAssignment.id;
      const res = await fetch(`/backend/api/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: current.marks,
          feedback: current.feedback,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Grade and feedback saved!");
        setSubmissions((prev) =>
          prev.map((s) => (s._id === submissionId ? data.submission : s))
        );
      } else {
        toast.error(data.error || "Failed to save grade");
      }
    } catch {
      toast.error("Network error saving grade");
    } finally {
      setGradingState((prev) => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], saving: false },
      }));
    }
  };

  // Helper date formatting
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

  const isPastDeadline = (dateStr) => {
    if (!dateStr) return false;
    return new Date() > new Date(dateStr);
  };

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.courseCode?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSem =
        selectedSemester === "all" ||
        String(a.semester).replace(/[^0-9]/g, "") === selectedSemester;

      return matchesSearch && matchesSem;
    });
  }, [assignments, searchQuery, selectedSemester]);

  return (
    <div
      id="assignments"
      className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* Header matching main project hub design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>Coursework & Assessment Center</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Faculty Assignment Manager</span>
            {assignments.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {assignments.length} Total
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Create course assignments, monitor student submissions, and grade coursework with constructive feedback.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setSelectedSemester("all")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedSemester === "all"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Semesters
            </button>
            {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSemester(s)}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  selectedSemester === s
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Sem {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Assignments Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
          <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery ? "No assignments match your query" : "No assignments published yet"}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Click &quot;Create Assignment&quot; to issue new coursework, problem sets, or project deliverables to your classes.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((a, idx) => {
            const pastDeadline = isPastDeadline(a.deadline);
            const aId = a._id || a.id || `asg-${idx}`;

            return (
              <div
                key={aId}
                className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all hover:shadow-md flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2.5">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                      {a.courseCode} • Sem {a.semester}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/50">
                      <Award className="w-3 h-3 text-emerald-500" />
                      <span>{a.totalMarks} Marks</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {a.title}
                    </h3>
                    {a.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>
                    )}
                  </div>

                  {/* Deadline & Submissions indicator */}
                  <div className="pt-1 flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${pastDeadline ? "text-rose-500" : "text-amber-500"}`} />
                      <span className={pastDeadline ? "text-rose-600 dark:text-rose-400 font-semibold" : ""}>
                        Due: {formatDeadline(a.deadline)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {a.submissionCount || 0} Submissions Received
                      </span>
                    </div>
                  </div>

                  {/* Attached Problem Sheet link */}
                  {a.filePath && (
                    <div className="pt-1">
                      <a
                        href={a.filePath.startsWith("http") ? a.filePath : `/backend${a.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="truncate max-w-44">{a.originalName || "Problem Sheet Attachment"}</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleOpenSubmissions(a)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>View & Grade ({a.submissionCount || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAssignment(aId, a.title)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE ASSIGNMENT MODAL ───────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Publish Course Assignment
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Official Student Homework & Deliverables
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAssignment} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Assignment Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assignment 2 - Process Scheduling Algorithm Simulator"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Course Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CSE 4201"
                    value={formData.courseCode}
                    onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Semester
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Submission Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Instructions & Guidelines
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail the problem statement, submission format (PDF/ZIP), late penalties, or rubric..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Problem Sheet File Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Attach Problem Sheet (Optional)</span>
                  <span className="text-[11px] font-normal text-slate-400">PDF, DOCX, ZIP</span>
                </label>
                {attachedFile ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {attachedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold cursor-pointer transition">
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    <span>Upload Problem Sheet file</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? "Publishing..." : "Publish Assignment"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUBMISSIONS VIEWER & GRADING MODAL ────────────────── */}
      {showSubmissionsModal && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  {activeAssignment.courseCode} • Sem {activeAssignment.semester}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                  Submissions: {activeAssignment.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Marks: {activeAssignment.totalMarks} • Due: {formatDeadline(activeAssignment.deadline)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmissionsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Submissions list */}
            {loadingSubmissions ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Loading student submissions...
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p>No students have submitted this assignment yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub, idx) => {
                  const subId = sub._id || sub.id || `sub-${idx}`;
                  const gState = gradingState[subId] || { marks: "", feedback: "", saving: false };

                  return (
                    <div
                      key={subId}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-3"
                    >
                      {/* Top student line */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {sub.studentName}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            ({sub.studentId || sub.studentEmail})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              sub.isLate
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {sub.isLate ? "Late Submission" : "On Time"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatDeadline(sub.submittedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Submitted file & notes */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        {sub.filePath ? (
                          <a
                            href={sub.filePath.startsWith("http") ? sub.filePath : `/backend${sub.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            download={sub.originalName || true}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Work: {sub.originalName || "Student Solution"}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">No file attached</span>
                        )}

                        {sub.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                            &quot;{sub.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Grading inputs */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            Score:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={activeAssignment.totalMarks}
                            placeholder={`Max ${activeAssignment.totalMarks}`}
                            value={gState.marks}
                            onChange={(e) =>
                              setGradingState({
                                ...gradingState,
                                [subId]: { ...gState, marks: e.target.value },
                              })
                            }
                            className="w-24 h-9 px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-400">/ {activeAssignment.totalMarks}</span>
                        </div>

                        <input
                          type="text"
                          placeholder="Teacher feedback / comments..."
                          value={gState.feedback}
                          onChange={(e) =>
                            setGradingState({
                              ...gradingState,
                              [subId]: { ...gState, feedback: e.target.value },
                            })
                          }
                          className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveGrade(subId)}
                          disabled={gState.saving}
                          className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{gState.saving ? "Saving..." : sub.marks !== null ? "Update Grade" : "Save Grade"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
