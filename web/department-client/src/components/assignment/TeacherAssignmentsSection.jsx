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
  FileSpreadsheet,
  Star,
  Filter,
  RefreshCw,
  BookOpen,
  GraduationCap,
  AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import { SectionCollapseToggle, CollapsibleBody } from "@/components/dashboard/CollapsibleSection";
import { SEMESTER_COURSES, SEMESTER_LABELS } from "@/data/courses";

export default function TeacherAssignmentsSection({
  teacher,
  courses = [],
  isCollapsed: controlledCollapsed,
  onToggle: controlledOnToggle,
  defaultCollapsed = false,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledOnToggle || (() => setInternalCollapsed(!internalCollapsed));

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Submissions modal view & filter
  const [submissionViewTab, setSubmissionViewTab] = useState("all"); // "all" | "submitted" | "graded" | "missing"
  const [submissionSearch, setSubmissionSearch] = useState("");

  // Grading states (key: id -> { marks, feedback, saving })
  const [gradingState, setGradingState] = useState({});

  // Create form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    courseCode: "",
    courseTitle: "",
    semester: "7",
    deadline: "",
    totalMarks: "20",
    isCustomCourse: false,
  });
  const [attachedFile, setAttachedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Available courses for selected semester in form
  const availableSemesterCourses = useMemo(() => {
    return SEMESTER_COURSES[formData.semester] || [];
  }, [formData.semester]);

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
    if (!formData.title.trim() || !formData.courseCode.trim() || !formData.deadline) {
      return toast.error("Please fill in assignment title, course code, and deadline.");
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("title", formData.title.trim());
      form.append("description", formData.description.trim());
      form.append("courseCode", formData.courseCode.trim().toUpperCase());
      form.append("courseTitle", formData.courseTitle.trim());
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

      toast.success("Assignment published successfully to students!");
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        courseCode: "",
        courseTitle: "",
        semester: "7",
        deadline: "",
        totalMarks: "20",
        isCustomCourse: false,
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
    setSubmissionViewTab("all");
    setSubmissionSearch("");
    try {
      const res = await fetch(`/backend/api/assignments/${assignment._id || assignment.id}/submissions`);
      const data = await res.json();
      if (res.ok) {
        const subs = data.submissions || [];
        const rost = data.roster || [];
        setSubmissions(subs);
        setRoster(rost);

        // Pre-fill grading state map
        const initialGrading = {};
        rost.forEach((item) => {
          const key = item.submissionId || item.studentEmail || item.studentId;
          initialGrading[key] = {
            marks: item.marks !== null && item.marks !== undefined ? String(item.marks) : "",
            feedback: item.feedback || "",
            saving: false,
          };
        });
        setGradingState(initialGrading);
      }
    } catch (err) {
      console.warn("Could not load submissions:", err);
      toast.error("Could not load student submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Grade save handler (works for existing submissions or grading directly by studentId/email)
  const handleSaveGrade = async (item) => {
    const key = item.submissionId || item.studentEmail || item.studentId;
    const current = gradingState[key];
    if (!current) return;

    const assignmentId = activeAssignment._id || activeAssignment.id;
    const maxMarks = Number(activeAssignment.totalMarks) || 20;
    const enteredMarks = current.marks !== "" && current.marks !== null ? Number(current.marks) : null;

    if (enteredMarks !== null && (enteredMarks < 0 || enteredMarks > maxMarks)) {
      return toast.error(`Marks must be between 0 and ${maxMarks}`);
    }

    setGradingState((prev) => ({
      ...prev,
      [key]: { ...prev[key], saving: true },
    }));

    try {
      let res;
      if (item.submissionId) {
        // Update existing submission
        res = await fetch(`/backend/api/assignments/${assignmentId}/submissions/${item.submissionId}/grade`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marks: current.marks,
            feedback: current.feedback,
          }),
        });
      } else {
        // Grade student directly even if they didn't submit online
        res = await fetch(`/backend/api/assignments/${assignmentId}/grade-student`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentEmail: item.studentEmail,
            studentId: item.studentId,
            studentName: item.studentName,
            marks: current.marks,
            feedback: current.feedback,
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Grade saved for Roll ${item.studentId}!`);
        // Refresh submissions in modal
        const refRes = await fetch(`/backend/api/assignments/${assignmentId}/submissions`);
        const refData = await refRes.json();
        if (refRes.ok) {
          setSubmissions(refData.submissions || []);
          setRoster(refData.roster || []);
        }
      } else {
        toast.error(data.error || "Failed to save grade");
      }
    } catch {
      toast.error("Network error saving grade");
    } finally {
      setGradingState((prev) => ({
        ...prev,
        [key]: { ...prev[key], saving: false },
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

  // Export Roll-Wise CSV
  const handleExportCSV = (assignment, listToExport) => {
    if (!assignment || !listToExport || listToExport.length === 0) {
      return toast.error("No student data available to export.");
    }

    const headers = [
      "Roll Number",
      "Student Name",
      "Student Email",
      "Semester",
      "Course Code",
      "Course Title",
      "Assignment Title",
      "Submission Status",
      "Submission Date & Time",
      `Marks Obtained (Max ${assignment.totalMarks || 20})`,
      "Total Marks",
      "Percentage (%)",
      "Teacher Feedback / Comments"
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = listToExport.map((item) => {
      const roll = item.studentId || item.roll || "N/A";
      const name = item.studentName || item.name || "Student";
      const email = item.studentEmail || item.email || "";

      let statusText = "Not Submitted";
      if (item.hasSubmitted || item.submissionId) {
        statusText = item.isLate ? "Submitted Late" : "Submitted On Time";
      } else if (item.status === "graded") {
        statusText = "Graded (Offline / Direct)";
      } else if (new Date() > new Date(assignment.deadline)) {
        statusText = "Missing / Deadline Passed";
      }

      const dateStr = item.submittedAt
        ? new Date(item.submittedAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka" })
        : "N/A";

      const marks = item.marks !== null && item.marks !== undefined ? item.marks : "Ungraded";
      const totalMarks = assignment.totalMarks || 20;
      const pct = typeof marks === "number" ? `${Math.round((marks / totalMarks) * 100)}%` : "N/A";
      const feedback = item.feedback || "";

      return [
        escapeCsv(roll),
        escapeCsv(name),
        escapeCsv(email),
        escapeCsv(assignment.semester),
        escapeCsv(assignment.courseCode),
        escapeCsv(assignment.courseTitle || ""),
        escapeCsv(assignment.title),
        escapeCsv(statusText),
        escapeCsv(dateStr),
        escapeCsv(marks),
        escapeCsv(totalMarks),
        escapeCsv(pct),
        escapeCsv(feedback),
      ].join(",");
    });

    // Add UTF-8 BOM so Microsoft Excel opens cleanly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanCourse = (assignment.courseCode || "COURSE").replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanTitle = (assignment.title || "Assignment").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `${cleanCourse}_${cleanTitle}_Grades_RollWise.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Roll-wise CSV grade sheet exported successfully!");
  };

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.courseCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSem =
        selectedSemester === "all" ||
        String(a.semester).replace(/[^0-9]/g, "") === selectedSemester;

      return matchesSearch && matchesSem;
    });
  }, [assignments, searchQuery, selectedSemester]);

  // Filtered Roster for Submissions Modal
  const displayedRoster = useMemo(() => {
    const list = roster.length > 0 ? roster : submissions.map(s => ({
      ...s,
      hasSubmitted: true,
      submissionId: s._id,
    }));

    return list.filter((item) => {
      const isGraded = item.marks !== null && item.marks !== undefined;
      const hasSub = item.hasSubmitted || Boolean(item.submissionId);

      if (submissionViewTab === "submitted" && !hasSub) return false;
      if (submissionViewTab === "graded" && !isGraded) return false;
      if (submissionViewTab === "pending" && (!hasSub || isGraded)) return false;
      if (submissionViewTab === "missing" && hasSub) return false;

      if (submissionSearch.trim()) {
        const query = submissionSearch.toLowerCase().trim();
        const matchesName = item.studentName?.toLowerCase().includes(query);
        const matchesRoll = String(item.studentId || "").toLowerCase().includes(query);
        const matchesEmail = item.studentEmail?.toLowerCase().includes(query);
        if (!matchesName && !matchesRoll && !matchesEmail) return false;
      }

      return true;
    });
  }, [roster, submissions, submissionViewTab, submissionSearch]);

  // Statistics for active assignment
  const assignmentStats = useMemo(() => {
    if (!activeAssignment) return { total: 0, submitted: 0, graded: 0, average: 0 };
    const list = roster.length > 0 ? roster : submissions;
    const total = list.length;
    const submitted = list.filter((s) => s.hasSubmitted || s.submittedAt).length;
    const gradedList = list.filter((s) => s.marks !== null && s.marks !== undefined);
    const graded = gradedList.length;
    const avgSum = gradedList.reduce((acc, curr) => acc + Number(curr.marks || 0), 0);
    const average = graded > 0 ? (avgSum / graded).toFixed(1) : 0;

    return { total, submitted, graded, average };
  }, [activeAssignment, roster, submissions]);

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
            <span>Coursework & Continuous Assessment Center</span>
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
            Publish semester assignments, review student submissions roll-wise, award marks, and export CSV grade sheets.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Assignment</span>
          </button>
          <SectionCollapseToggle
            isCollapsed={isCollapsed}
            onToggle={toggleCollapse}
            label="Faculty Assignments"
          />
        </div>
      </div>

      <CollapsibleBody
        isCollapsed={isCollapsed}
        onExpand={toggleCollapse}
        sectionName="Faculty Assignment Manager"
      >
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
              placeholder="Search title, course code..."
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
                {searchQuery ? "No assignments match your search" : "No assignments published yet"}
              </h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Click &quot;Publish Assignment&quot; to issue coursework, problem sets, or project deliverables to your classes.
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
                      {a.courseTitle && (
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                          {a.courseTitle}
                        </p>
                      )}
                      {a.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}
                    </div>

                    {/* Deadline status indicator */}
                    <div className="pt-1 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Clock className={`w-3.5 h-3.5 ${pastDeadline ? "text-rose-500" : "text-amber-500"}`} />
                        <span className={pastDeadline ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-600 dark:text-slate-400"}>
                          {pastDeadline ? "Deadline Passed" : "Due"}: {formatDeadline(a.deadline)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Roll-Wise Grading ({a.submissionCount || 0})</span>
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
      </CollapsibleBody>

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
                    Select Semester & Coursework Details
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
                  placeholder="e.g. Lab Task 2: Implement A* Search Algorithm in Python"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Semester & Course selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Semester <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.semester}
                    onChange={(e) => {
                      const sem = e.target.value;
                      setFormData({
                        ...formData,
                        semester: sem,
                        courseCode: "",
                        courseTitle: "",
                        isCustomCourse: false,
                      });
                    }}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Semester {s} {SEMESTER_LABELS[String(s)] ? `(${SEMESTER_LABELS[String(s)]})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Course <span className="text-rose-500">*</span>
                  </label>
                  {!formData.isCustomCourse ? (
                    <select
                      value={formData.courseCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "CUSTOM") {
                          setFormData({ ...formData, isCustomCourse: true, courseCode: "", courseTitle: "" });
                        } else {
                          const found = availableSemesterCourses.find((c) => c.code === val);
                          setFormData({
                            ...formData,
                            courseCode: val,
                            courseTitle: found ? found.title : "",
                          });
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Course for Sem {formData.semester} --</option>
                      {availableSemesterCourses.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} - {c.title}
                        </option>
                      ))}
                      <option value="CUSTOM">✏️ Other / Custom Course Code</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. CSE 4201"
                        value={formData.courseCode}
                        onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                        className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isCustomCourse: false, courseCode: "" })}
                        className="p-2 text-xs text-indigo-600 hover:underline cursor-pointer"
                      >
                        List
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Deadline & Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Submission Deadline <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
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
                  Instructions & Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail problem statement, report format (PDF/ZIP), rubrics, and submission guidelines..."
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
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
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
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 transition cursor-pointer"
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

      {/* ── ROLL-WISE SUBMISSIONS & GRADING MODAL ─────────────── */}
      {showSubmissionsModal && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                    {activeAssignment.courseCode} • Semester {activeAssignment.semester}
                  </span>
                  <span className="font-bold text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                    Max: {activeAssignment.totalMarks} Marks
                  </span>
                </div>
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1">
                  Roll-Wise Submissions & Grading: {activeAssignment.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Due: {formatDeadline(activeAssignment.deadline)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Export CSV Button */}
                <button
                  type="button"
                  onClick={() => handleExportCSV(activeAssignment, roster.length > 0 ? roster : submissions)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  title="Export complete roll-wise grading sheet as CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Roll-Wise CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSubmissionsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Deadline Status Banner */}
            {isPastDeadline(activeAssignment.deadline) ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Submission Deadline has ended. Final marks entry and review is active.</span>
                </span>
                <span className="text-[11px] font-semibold">Ended: {formatDeadline(activeAssignment.deadline)}</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Submissions are currently active. Students can submit coursework until deadline.</span>
                </span>
                <span className="text-[11px] font-semibold">Due: {formatDeadline(activeAssignment.deadline)}</span>
              </div>
            )}

            {/* Class Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Enrolled Class</span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {assignmentStats.total} Students
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Submitted Work</span>
                <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {assignmentStats.submitted} / {assignmentStats.total}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Graded Count</span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {assignmentStats.graded} Graded
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-600 uppercase">Class Average</span>
                <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                  {assignmentStats.average} / {activeAssignment.totalMarks}
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 overflow-x-auto scrollbar-none">
                {[
                  { id: "all", label: `All Students (${roster.length || submissions.length})` },
                  { id: "submitted", label: `Submitted (${assignmentStats.submitted})` },
                  { id: "graded", label: `Graded (${assignmentStats.graded})` },
                  { id: "pending", label: `Pending Grade (${assignmentStats.submitted - assignmentStats.graded})` },
                  { id: "missing", label: `Missing / No File` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubmissionViewTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                      submissionViewTab === t.id
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold"
                        : "hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by roll or name..."
                  value={submissionSearch}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
                />
              </div>
            </div>

            {/* Submissions & Roster List */}
            {loadingSubmissions ? (
              <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
                Loading roll-wise student submissions...
              </div>
            ) : displayedRoster.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p>No student submissions match your filter.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 scrollbar-thin">
                {displayedRoster.map((item, idx) => {
                  const key = item.submissionId || item.studentEmail || item.studentId || `row-${idx}`;
                  const gState = gradingState[key] || {
                    marks: item.marks !== null && item.marks !== undefined ? String(item.marks) : "",
                    feedback: item.feedback || "",
                    saving: false,
                  };

                  const hasSub = item.hasSubmitted || Boolean(item.submissionId);
                  const isLate = item.isLate;

                  return (
                    <div
                      key={key}
                      className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70 space-y-3 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition"
                    >
                      {/* Top Student Line: Roll & Status */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                            Roll: {item.studentId || "N/A"}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white block">
                              {item.studentName}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {item.studentEmail}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              !hasSub
                                ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                                : isLate
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {!hasSub ? "Not Submitted" : isLate ? "Late Submission" : "Submitted On Time"}
                          </span>

                          {item.submittedAt && (
                            <span className="text-[11px] text-slate-400">
                              {formatDeadline(item.submittedAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submitted Solution Attachment & Student Notes */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                        {item.filePath ? (
                          <a
                            href={item.filePath.startsWith("http") ? item.filePath : `/backend${item.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            download={item.originalName || true}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Work: {item.originalName || "Student Solution File"}</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {hasSub ? "No file attached (submitted as text notes)" : "No file submitted"}
                          </span>
                        )}

                        {item.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 italic">
                            &quot;{item.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Quick Feedback Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Remarks:</span>
                        {[
                          "🌟 Excellent work!",
                          "👍 Well structured",
                          "⚠️ Incomplete output",
                          "⏱️ Late penalty applied",
                        ].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setGradingState({
                                ...gradingState,
                                [key]: { ...gState, feedback: chip },
                              })
                            }
                            className="text-[10px] font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>

                      {/* Marks Input & Feedback Row */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Marks:
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
                                [key]: { ...gState, marks: e.target.value },
                              })
                            }
                            className="w-20 h-9 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-400">/ {activeAssignment.totalMarks}</span>
                        </div>

                        <input
                          type="text"
                          placeholder="Teacher feedback or comment..."
                          value={gState.feedback}
                          onChange={(e) =>
                            setGradingState({
                              ...gradingState,
                              [key]: { ...gState, feedback: e.target.value },
                            })
                          }
                          className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveGrade(item)}
                          disabled={gState.saving}
                          className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{gState.saving ? "Saving..." : item.marks !== null ? "Update Grade" : "Save Grade"}</span>
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
