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
  Layers,
  MessageSquare,
  BarChart3,
  BookOpen,
  TrendingUp,
  FileSpreadsheet,
  ChevronRight,
  Printer,
  SlidersHorizontal,
  Bookmark
} from "lucide-react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { SEMESTER_COURSES, SEMESTER_LABELS } from "@/data/courses";

// Helper to normalize course code for comparison (e.g. "CSE 4104" -> "CSE4104")
const normalizeCourseCode = (code) => (code || "").toUpperCase().replace(/[\s-]/g, "");

// University grading scale details (PUST / UGC Bangladesh standard)
const getGradeDetails = (score, max) => {
  if (score === null || score === undefined || !max || max <= 0) {
    return {
      letter: "Ungraded",
      gpa: 0.0,
      gpaStr: "0.00",
      color: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
      badgeColor: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
      progressColor: "bg-slate-400",
      label: "Ungraded",
    };
  }
  const pct = (score / max) * 100;
  if (pct >= 80) {
    return {
      letter: "A+",
      gpa: 4.0,
      gpaStr: "4.00",
      color: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800",
      badgeColor: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80",
      progressColor: "bg-emerald-500",
      label: "Outstanding",
    };
  }
  if (pct >= 75) {
    return {
      letter: "A",
      gpa: 3.75,
      gpaStr: "3.75",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60",
      badgeColor: "bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
      progressColor: "bg-emerald-500",
      label: "Excellent",
    };
  }
  if (pct >= 70) {
    return {
      letter: "A-",
      gpa: 3.5,
      gpaStr: "3.50",
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/60",
      badgeColor: "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
      progressColor: "bg-indigo-500",
      label: "Very Good",
    };
  }
  if (pct >= 65) {
    return {
      letter: "B+",
      gpa: 3.25,
      gpaStr: "3.25",
      color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/60",
      badgeColor: "bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
      progressColor: "bg-blue-500",
      label: "Good",
    };
  }
  if (pct >= 60) {
    return {
      letter: "B",
      gpa: 3.0,
      gpaStr: "3.00",
      color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800/60",
      badgeColor: "bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
      progressColor: "bg-cyan-500",
      label: "Satisfactory",
    };
  }
  if (pct >= 55) {
    return {
      letter: "B-",
      gpa: 2.75,
      gpaStr: "2.75",
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/60",
      badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
      progressColor: "bg-amber-500",
      label: "Above Average",
    };
  }
  if (pct >= 50) {
    return {
      letter: "C+",
      gpa: 2.5,
      gpaStr: "2.50",
      color: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-800",
      badgeColor: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
      progressColor: "bg-amber-500",
      label: "Average",
    };
  }
  if (pct >= 40) {
    return {
      letter: "D",
      gpa: 2.0,
      gpaStr: "2.00",
      color: "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/70 border-orange-300 dark:border-orange-800",
      badgeColor: "bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800",
      progressColor: "bg-orange-500",
      label: "Pass",
    };
  }
  return {
    letter: "F",
    gpa: 0.0,
    gpaStr: "0.00",
    color: "text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/70 border-rose-300 dark:border-rose-800",
    badgeColor: "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800",
    progressColor: "bg-rose-500",
    label: "Needs Improvement",
  };
};

export default function StudentAssignmentsSection({
  student,
  semester,
}) {
  const [mounted, setMounted] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Main Section View: "tasks" (Continuous Tasks) | "results" (Grades & Marks Section)
  const [activeSectionView, setActiveSectionView] = useState("tasks");

  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "pending" | "submitted"
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

  // Student Roll Number
  const studentRoll = useMemo(() => {
    return student?.studentId || student?.roll || student?.classRoll || "";
  }, [student]);

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
      return toast.error("Please attach a solution file or write submission notes.");
    }

    setIsSubmitting(true);
    try {
      const assignmentId = submittingAssignment._id || submittingAssignment.id;
      const form = new FormData();
      form.append("studentEmail", student?.email || "");
      form.append("studentName", student?.name || "Student");
      form.append("studentId", studentRoll);
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

  // Grade helper
  const getLetterGrade = (score, max) => {
    if (score === null || score === undefined || !max) return "Ungraded";
    const pct = (score / max) * 100;
    if (pct >= 80) return "A+ (Outstanding)";
    if (pct >= 75) return "A (Excellent)";
    if (pct >= 70) return "A- (Very Good)";
    if (pct >= 65) return "B+ (Good)";
    if (pct >= 60) return "B (Satisfactory)";
    if (pct >= 55) return "B- (Above Average)";
    if (pct >= 50) return "C+ (Average)";
    if (pct >= 40) return "D (Pass)";
    return "F (Needs Improvement)";
  };

  // Results View Scope: "graded-only" (show courses with graded marks) | "all-courses" (show all semester curriculum courses)
  const [resultsScope, setResultsScope] = useState("graded-only");

  // Filtered lists for Tasks tab
  const filteredTasks = useMemo(() => {
    return assignments.filter((a) => {
      const mySub = a.mySubmission;
      if (filterStatus === "pending" && mySub) return false;
      if (filterStatus === "submitted" && !mySub) return false;

      if (selectedCourse !== "all") {
        const cCode = normalizeCourseCode(a.courseCode);
        const sCode = normalizeCourseCode(selectedCourse);
        if (cCode !== sCode) return false;
      }

      return true;
    });
  }, [assignments, filterStatus, selectedCourse]);

  // Comprehensive Course-Wise Data Grouping
  const courseWiseData = useMemo(() => {
    const courseMap = new Map();

    // 1. Populate registered semester courses first to retain official curriculum order
    semesterCourses.forEach((c) => {
      const key = normalizeCourseCode(c.code);
      courseMap.set(key, {
        key,
        code: c.code,
        title: c.title,
        credits: c.credits || 3,
        assignments: [],
        gradedAssignments: [],
        submittedUngradedAssignments: [],
        pendingAssignments: [],
        totalObtained: 0,
        totalMax: 0,
      });
    });

    // 2. Iterate over all assignments fetched for this student
    assignments.forEach((a) => {
      const key = normalizeCourseCode(a.courseCode || "GENERAL");
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          key,
          code: a.courseCode || "General Course",
          title: a.courseTitle || "Coursework Deliverables",
          credits: 3,
          assignments: [],
          gradedAssignments: [],
          submittedUngradedAssignments: [],
          pendingAssignments: [],
          totalObtained: 0,
          totalMax: 0,
        });
      }

      const group = courseMap.get(key);
      group.assignments.push(a);

      const sub = a.mySubmission;
      const isGraded = sub && sub.marks !== null && sub.marks !== undefined;

      if (isGraded) {
        const score = Number(sub.marks) || 0;
        const max = Number(a.totalMarks) || 20;
        group.gradedAssignments.push(a);
        group.totalObtained += score;
        group.totalMax += max;
      } else if (sub) {
        group.submittedUngradedAssignments.push(a);
      } else {
        group.pendingAssignments.push(a);
      }
    });

    // 3. Process each course group to derive percentages and academic letter grades
    const list = [];
    courseMap.forEach((group) => {
      const hasAssignments = group.assignments.length > 0;
      const hasGraded = group.gradedAssignments.length > 0;
      const percentage = group.totalMax > 0 ? Math.round((group.totalObtained / group.totalMax) * 100) : 0;
      const gradeInfo = hasGraded ? getGradeDetails(group.totalObtained, group.totalMax) : null;

      list.push({
        ...group,
        hasAssignments,
        hasGraded,
        percentage,
        gradeInfo,
      });
    });

    return list;
  }, [semesterCourses, assignments]);

  // Courses that have at least one evaluated assignment with marks
  const coursesWithGrades = useMemo(() => {
    return courseWiseData.filter((c) => c.hasGraded);
  }, [courseWiseData]);

  // Overall Continuous Assessment Weighted GPA
  const overallContinuousGPA = useMemo(() => {
    if (coursesWithGrades.length === 0) return null;
    let totalPoints = 0;
    let totalCredits = 0;
    coursesWithGrades.forEach((c) => {
      if (c.gradeInfo && c.credits) {
        totalPoints += c.gradeInfo.gpa * c.credits;
        totalCredits += c.credits;
      }
    });
    if (totalCredits === 0) return null;
    return (totalPoints / totalCredits).toFixed(2);
  }, [coursesWithGrades]);

  // Cumulative marks across evaluated courses
  const totalCumulativeMarksObtained = useMemo(() => {
    return coursesWithGrades.reduce((sum, c) => sum + c.totalObtained, 0);
  }, [coursesWithGrades]);

  const totalCumulativeMaxMarks = useMemo(() => {
    return coursesWithGrades.reduce((sum, c) => sum + c.totalMax, 0);
  }, [coursesWithGrades]);

  const totalCumulativePercentage = useMemo(() => {
    if (totalCumulativeMaxMarks === 0) return 0;
    return Math.round((totalCumulativeMarksObtained / totalCumulativeMaxMarks) * 100);
  }, [totalCumulativeMarksObtained, totalCumulativeMaxMarks]);

  // Filtered courses for Graded Results tab based on course selection & scope
  const displayedResultCourses = useMemo(() => {
    let list = courseWiseData;
    if (selectedCourse !== "all") {
      const target = normalizeCourseCode(selectedCourse);
      list = list.filter((c) => c.key === target);
    } else if (resultsScope === "graded-only") {
      const graded = list.filter((c) => c.hasGraded);
      // If none are graded yet, show all active courses with assignments
      list = graded.length > 0 ? graded : list.filter((c) => c.hasAssignments);
    }
    return list;
  }, [courseWiseData, selectedCourse, resultsScope]);

  // Filtered lists for flat Graded Results (for counts)
  const gradedResults = useMemo(() => {
    return assignments.filter((a) => {
      const mySub = a.mySubmission;
      const isGraded = mySub && mySub.marks !== null && mySub.marks !== undefined;
      if (!isGraded) return false;

      if (selectedCourse !== "all") {
        const cCode = normalizeCourseCode(a.courseCode);
        const sCode = normalizeCourseCode(selectedCourse);
        if (cCode !== sCode) return false;
      }

      return true;
    });
  }, [assignments, selectedCourse]);

  // Statistics
  const pendingCount = assignments.filter((a) => !a.mySubmission).length;
  const submittedCount = assignments.filter((a) => a.mySubmission).length;
  const gradedCount = assignments.filter((a) => a.mySubmission?.marks !== null && a.mySubmission?.marks !== undefined).length;

  // Average score percentage across all individual graded tasks
  const averageGradePct = useMemo(() => {
    const list = assignments.filter((a) => a.mySubmission?.marks !== null && a.mySubmission?.marks !== undefined);
    if (list.length === 0) return 0;
    const totalPct = list.reduce((acc, curr) => {
      const max = curr.totalMarks || 20;
      const score = curr.mySubmission.marks;
      return acc + (score / max) * 100;
    }, 0);
    return Math.round(totalPct / list.length);
  }, [assignments]);

  // CSV Export Function for Student Course-Wise Continuous Assessment Marks
  const exportStudentGradesCSV = () => {
    if (gradedResults.length === 0) {
      toast.error("No graded assignment marks available to export.");
      return;
    }

    const rows = [
      ["Roll Number", "Student Name", "Semester", "Course Code", "Course Title", "Credits", "Assignment Title", "Marks Obtained", "Total Marks", "Percentage (%)", "Letter Grade", "Submission Status", "Submitted Date", "Instructor Feedback"]
    ];

    courseWiseData.forEach((course) => {
      course.gradedAssignments.forEach((asg) => {
        const sub = asg.mySubmission;
        const score = sub.marks ?? "";
        const max = asg.totalMarks || 20;
        const pct = max > 0 && score !== "" ? Math.round((Number(score) / max) * 100) : "";
        const grade = getGradeDetails(score, max).letter;
        const status = sub.isLate ? "Late Submission" : "On Time";
        const submittedDate = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : "";
        const feedback = (sub.feedback || "").replace(/"/g, '""');

        rows.push([
          `"${studentRoll || ""}"`,
          `"${(student?.name || "").replace(/"/g, '""')}"`,
          `"Semester ${studentSemester || ""}"`,
          `"${course.code}"`,
          `"${course.title.replace(/"/g, '""')}"`,
          `"${course.credits}"`,
          `"${asg.title.replace(/"/g, '""')}"`,
          `"${score}"`,
          `"${max}"`,
          `"${pct}"`,
          `"${grade}"`,
          `"${status}"`,
          `"${submittedDate}"`,
          `"${feedback}"`
        ]);
      });
    });

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Roll_${studentRoll || "Student"}_Semester_${studentSemester || "Term"}_Coursewise_Grades.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Course-wise continuous assessment grade sheet exported successfully!");
  };

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
            <span>My Assignments & Grades</span>
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
            Semester {studentSemester || "Enrolled"} coursework deliverables, problem sheets, and instructor graded results.
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

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Published</span>
          <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{assignments.length} Tasks</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Submission</span>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingCount} Due</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Submitted Work</span>
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{submittedCount} Submitted</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Graded Performance</span>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {gradedCount > 0 ? `${averageGradePct}% Average` : "Pending Grading"}
          </p>
        </div>
      </div>

      {/* Main Two Section Switcher Tabs: Continuous Tasks vs Grades & Marks */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => setActiveSectionView("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSectionView === "tasks"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tasks & Submissions ({assignments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSectionView("results")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition cursor-pointer ${
              activeSectionView === "results"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Award className="w-4 h-4 text-emerald-500" />
            <span>Graded Results & Marks ({gradedCount})</span>
          </button>
        </div>

        {/* Course Filter Dropdown */}
        <div className="flex items-center gap-2">
          {semesterCourses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              aria-label="Filter assignments by course"
              className="px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
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
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: CONTINUOUS TASKS & SUBMISSION VIEW
          ══════════════════════════════════════════════════════════════ */}
      {activeSectionView === "tasks" && (
        <div className="space-y-4">
          {/* Sub filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/70 dark:bg-slate-800/70 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 w-fit">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterStatus === "all" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" : ""
              }`}
            >
              All ({assignments.length})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterStatus === "pending" ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold" : ""
              }`}
            >
              Due ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus("submitted")}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                filterStatus === "submitted" ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold" : ""
              }`}
            >
              Submitted ({submittedCount})
            </button>
          </div>

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
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
              <CheckCircle className="w-10 h-10 text-emerald-400 dark:text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {filterStatus !== "all" || selectedCourse !== "all"
                  ? "No assignments match your selected filter"
                  : `No assignments currently active for Semester ${studentSemester || "your term"}`}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Continuous assessments and laboratory tasks will appear here as soon as course instructors publish them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((a, idx) => {
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
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                          {a.courseCode} • Sem {a.semester}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/80 px-2.5 py-0.5 rounded-md">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>{a.totalMarks} Marks</span>
                        </span>
                      </div>

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
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {a.description}
                          </p>
                        )}
                      </div>

                      {/* Problem Sheet link */}
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

                      {/* Deadline status */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">Due: {formatDeadline(a.deadline)}</span>
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
                    </div>

                    {/* Bottom Submission Action */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {mySub ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                              mySub.isLate
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{mySub.isLate ? "Submitted Late" : "Submitted"}</span>
                          </span>

                          {mySub.filePath && (
                            <a
                              href={mySub.filePath.startsWith("http") ? mySub.filePath : `/backend${mySub.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                              download={mySub.originalName || true}
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="truncate max-w-36">{mySub.originalName || "My Solution"}</span>
                            </a>
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
                          onClick={() => {
                            setSubmittingAssignment(a);
                            setSubmissionNotes(mySub?.notes || "");
                            setSubmissionFile(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:text-slate-200 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Update Submission</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittingAssignment(a);
                            setSubmissionNotes("");
                            setSubmissionFile(null);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition cursor-pointer"
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
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: DISTINCT COURSE-WISE GRADED RESULTS & MARKS SECTION
          ══════════════════════════════════════════════════════════════ */}
      {activeSectionView === "results" && (
        <div className="space-y-6">
          {/* Results Section Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900/50 to-indigo-950/40 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Course-Wise Academic Performance & Continuous Assessment</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Semester {studentSemester || "Enrolled"} Continuous Assessment Grade Sheet</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
                Official marks awarded by course teachers categorized strictly by course, with continuous assessment grade point averages (GPA) and faculty remarks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {studentRoll && (
                <div className="px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 shadow-xs">
                  Roll: {studentRoll}
                </div>
              )}

              <button
                type="button"
                onClick={exportStudentGradesCSV}
                disabled={gradedResults.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download your continuous assessment transcript in CSV format"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Grade Sheet (CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.print();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                title="Print your continuous assessment grade sheet"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>
          </div>

          {/* Academic Continuous Assessment Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Continuous GPA</span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                  {overallContinuousGPA ? `${overallContinuousGPA} / 4.00` : "Pending"}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {coursesWithGrades.length > 0 ? `${coursesWithGrades.length} Courses Weighted` : "Awaiting Evaluation"}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Marks Earned</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {totalCumulativeMarksObtained} <span className="text-xs text-slate-400 font-bold">/ {totalCumulativeMaxMarks || 0}</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {totalCumulativePercentage}% Overall Average
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Courses Graded</span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                  {coursesWithGrades.length} <span className="text-xs text-slate-400 font-bold">/ {courseWiseData.length}</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {gradedCount} evaluated tasks
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Deliverables</span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-0.5 block">
                  {submittedCount} <span className="text-xs text-slate-400 font-bold">/ {assignments.length}</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {pendingCount === 0 ? "All coursework submitted" : `${pendingCount} tasks awaiting submission`}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Course-Wise Quick Switcher Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Filter by Course:</span>
                </span>

                {/* Scope Switcher: Graded Only vs All Registered Courses */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setResultsScope("graded-only")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      resultsScope === "graded-only"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    Courses with Marks ({coursesWithGrades.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultsScope("all-courses")}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      resultsScope === "all-courses"
                        ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    All Curriculum Courses ({courseWiseData.length})
                  </button>
                </div>
              </div>

              {selectedCourse !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedCourse("all")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer self-start sm:self-auto"
                >
                  Clear filter (Show all courses)
                </button>
              )}
            </div>

            {/* Course Scorecard Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCourse("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                  selectedCourse === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                All Courses ({displayedResultCourses.length})
              </button>

              {courseWiseData
                .filter((c) => resultsScope === "all-courses" || c.hasGraded || c.hasAssignments)
                .map((c) => {
                  const isSelected = selectedCourse !== "all" && normalizeCourseCode(selectedCourse) === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedCourse(isSelected ? "all" : c.code)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 border ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300 shadow-xs"
                          : "bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-300"
                      }`}
                    >
                      <span>{c.code}</span>
                      {c.hasGraded ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${c.gradeInfo?.badgeColor || "bg-emerald-100 text-emerald-700"}`}>
                          {c.totalObtained}/{c.totalMax} • {c.gradeInfo?.letter}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-400">
                          {c.assignments.length} tasks
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* ── COURSE-WISE CARDS LIST ─────────────────────────── */}
          {displayedResultCourses.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
              <Award className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {selectedCourse !== "all"
                  ? `No evaluated results found for ${selectedCourse}`
                  : "No Continuous Assessment Marks Evaluated Yet"}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once course faculty review and grade your coursework deliverables, each course will present its cumulative continuous assessment marks and feedback here.
              </p>
              {resultsScope === "graded-only" && (
                <button
                  type="button"
                  onClick={() => setResultsScope("all-courses")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View All Enrolled Semester Courses</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {displayedResultCourses.map((course) => {
                const hasGraded = course.hasGraded;
                const grade = course.gradeInfo;

                return (
                  <div
                    key={course.key}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md transition space-y-5"
                  >
                    {/* Course Header Banner */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400">
                            {course.code}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {course.credits} Credits • Semester {studentSemester}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {course.title}
                        </h3>
                      </div>

                      {/* Cumulative Continuous Assessment Score on Right */}
                      {hasGraded ? (
                        <div className="flex items-center gap-3 self-start md:self-auto">
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Continuous Marks
                            </span>
                            <div className="inline-flex items-baseline gap-1">
                              <span className="text-xl font-black text-slate-900 dark:text-white">
                                {course.totalObtained}
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                / {course.totalMax}
                              </span>
                            </div>
                          </div>

                          <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center justify-center ${grade?.badgeColor || "bg-emerald-100 text-emerald-800 border-emerald-300"}`}>
                            <span className="text-base font-black leading-none">{grade?.letter || "N/A"}</span>
                            <span className="text-[9.5px] font-extrabold uppercase tracking-tight mt-0.5">
                              GPA {grade?.gpaStr || "0.00"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="self-start md:self-auto">
                          {course.submittedUngradedAssignments.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Evaluation in Progress</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                              <span>No Evaluated Marks</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Progress Bar Visual (if graded) */}
                    {hasGraded && (
                      <div className="space-y-1.5 bg-slate-50/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Course Assessment Mastery</span>
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white">
                            {course.percentage}% • {grade?.label} ({course.gradedAssignments.length} of {course.assignments.length} tasks graded)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${grade?.progressColor || "bg-indigo-600"}`}
                            style={{ width: `${Math.min(course.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* List of Evaluated Tasks Under this Course */}
                    {hasGraded ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Evaluated Coursework Tasks ({course.gradedAssignments.length})</span>
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Sum: {course.totalObtained} / {course.totalMax} Marks
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {course.gradedAssignments.map((asg, aIdx) => {
                            const sub = asg.mySubmission;
                            const score = sub.marks;
                            const maxMarks = asg.totalMarks || 20;
                            const pct = Math.round((score / maxMarks) * 100);
                            const asgGrade = getGradeDetails(score, maxMarks);

                            return (
                              <div
                                key={asg._id || aIdx}
                                className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between space-y-3 hover:border-emerald-400/60 transition"
                              >
                                <div className="space-y-2">
                                  {/* Task title & marks badge */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                        {asg.title}
                                      </h5>
                                      {asg.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                          {asg.description}
                                        </p>
                                      )}
                                    </div>

                                    {/* Score Badge */}
                                    <div className="text-right shrink-0">
                                      <div className="inline-flex items-baseline gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                                        <span>{score}</span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">/ {maxMarks}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                                        {pct}% • {asgGrade.letter}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Teacher Feedback Callout Box */}
                                  {sub.feedback ? (
                                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-indigo-500" />
                                        <span>Faculty Feedback:</span>
                                      </span>
                                      <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed italic">
                                        &ldquo;{sub.feedback}&rdquo;
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-400 italic">
                                      Marked by instructor. No written remarks entered.
                                    </div>
                                  )}
                                </div>

                                {/* Task Submission Metadata & File Link */}
                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                        sub.isLate
                                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      }`}
                                    >
                                      {sub.isLate ? "Submitted Late" : "Submitted on time"}
                                    </span>
                                    <span>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : ""}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {sub.filePath && (
                                      <a
                                        href={sub.filePath.startsWith("http") ? sub.filePath : `/backend${sub.filePath}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={sub.originalName || true}
                                        className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                                        title="Download my submitted coursework file"
                                      >
                                        <Download className="w-3 h-3" />
                                        <span>My Solution</span>
                                      </a>
                                    )}

                                    {asg.filePath && (
                                      <a
                                        href={asg.filePath.startsWith("http") ? asg.filePath : `/backend${asg.filePath}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={asg.originalName || true}
                                        className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline font-semibold"
                                        title="Download original problem sheet"
                                      >
                                        <Paperclip className="w-3 h-3" />
                                        <span>Problem Sheet</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {/* Pipeline Status: Other Tasks in this Course */}
                    {course.submittedUngradedAssignments.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium">
                          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                          <span>
                            <strong>{course.submittedUngradedAssignments.length} deliverable</strong> submitted & currently under teacher review:{" "}
                            {course.submittedUngradedAssignments.map((a) => a.title).join(", ")}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-indigo-600 shrink-0">
                          Pending Grades
                        </span>
                      </div>
                    )}

                    {course.pendingAssignments.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            <strong>{course.pendingAssignments.length} pending task</strong> due in this course:{" "}
                            {course.pendingAssignments.map((a) => a.title).join(", ")}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course.code);
                            setActiveSectionView("tasks");
                          }}
                          className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline hover:text-amber-900 cursor-pointer shrink-0"
                        >
                          Submit Now
                        </button>
                      </div>
                    )}

                    {!course.hasAssignments && (
                      <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                        No continuous assessment coursework tasks have been published yet for {course.code} ({course.title}).
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUBMIT / UPDATE MODAL ─────────────────────────────── */}
      {submittingAssignment && mounted && typeof document !== "undefined" && createPortal((() => {
        const isUpdating = Boolean(submittingAssignment.mySubmission);
        const existingSub = submittingAssignment.mySubmission;

        return (
          <div
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
          >
            <div
              data-lenis-prevent
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                <div>
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                    {submittingAssignment.courseCode} • Sem {submittingAssignment.semester}
                  </span>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">
                    {isUpdating ? "Update Submission" : "Submit Coursework Deliverable"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">
                    {submittingAssignment.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student identification verification */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{student?.name || "Student"}</span>
                  <span className="text-slate-400 ml-2">Roll: {studentRoll || "N/A"}</span>
                </div>
                <span className="text-indigo-600 font-semibold">{student?.email}</span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitWork} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Attach Solution File (PDF, ZIP, DOCX up to 50MB)</span>
                    {existingSub?.filePath && (
                      <span className="text-[10px] text-emerald-600 font-semibold">Previous file on record</span>
                    )}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {existingSub?.originalName && (
                    <p className="text-[11px] text-slate-400">
                      Current file: <strong>{existingSub.originalName}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Submission Comments & Explanation (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter notes for instructor, assumptions made, or online repository links..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setSubmittingAssignment(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? "Submitting..." : isUpdating ? "Update Submission" : "Submit Coursework"}</span>
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
