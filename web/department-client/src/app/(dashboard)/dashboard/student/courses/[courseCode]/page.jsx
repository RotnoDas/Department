"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  Layers,
  GraduationCap,
  MapPin,
  RefreshCw,
  Award,
  ChevronRight,
  ChevronDown,
  Paperclip,
  FileCheck,
  Send,
  MessageSquare,
  AlertCircle,
  BookMarked,
  Info,
  Flame,
  ShieldCheck,
  User,
  Bell,
  Star,
  FileSpreadsheet,
  Edit3
} from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import Loading from "@/components/common/Loading";
import NoticeCard from "@/components/notice/NoticeCard";
import { SEMESTER_COURSES, getCoursesBySemester } from "@/data/courses";

// Helper for UGC / PUST grading breakdown (Image 3 from University Regulations)
const getGradeBadge = (score, max) => {
  if (score === null || score === undefined || !max || max <= 0) {
    return {
      letter: "Ungraded",
      gpa: 0.0,
      interpretation: "Pending Evaluation",
      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    };
  }
  const pct = (score / max) * 100;
  if (pct >= 80)
    return {
      letter: "A+",
      gpa: 4.0,
      interpretation: "Outstanding",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  if (pct >= 75)
    return {
      letter: "A",
      gpa: 3.75,
      interpretation: "Excellent",
      color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    };
  if (pct >= 70)
    return {
      letter: "A-",
      gpa: 3.5,
      interpretation: "Very Good",
      color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    };
  if (pct >= 65)
    return {
      letter: "B+",
      gpa: 3.25,
      interpretation: "Good",
      color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    };
  if (pct >= 60)
    return {
      letter: "B",
      gpa: 3.0,
      interpretation: "Satisfactory",
      color: "bg-blue-50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    };
  if (pct >= 55)
    return {
      letter: "B-",
      gpa: 2.75,
      interpretation: "Below Satisfactory",
      color: "bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  if (pct >= 50)
    return {
      letter: "C+",
      gpa: 2.5,
      interpretation: "Average",
      color: "bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    };
  if (pct >= 45)
    return {
      letter: "C",
      gpa: 2.25,
      interpretation: "Pass",
      color: "bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  if (pct >= 40)
    return {
      letter: "D",
      gpa: 2.0,
      interpretation: "Poor",
      color: "bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
    };
  return {
    letter: "F",
    gpa: 0.0,
    interpretation: "Fail",
    color: "bg-rose-50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  };
};

export default function StudentCourseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = decodeURIComponent(params?.courseCode || "");
  const courseCode = rawCode.trim().toUpperCase();

  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const user = sessionData?.user;

  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");
  const validTabs = useMemo(() => ["notices", "materials", "assignments", "class-tests", "continuous-evaluation", "attendance", "schedule"], []);

  // Active Tab: "notices" | "materials" | "assignments" | "class-tests" | "attendance" | "schedule"
  const [activeTab, setActiveTab] = useState(() =>
    urlTab && validTabs.includes(urlTab) ? urlTab : "notices"
  );

  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, validTabs, activeTab]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabId);
      window.history.replaceState(null, "", url.toString());
    }
  }, []);

  // Student Profile State
  const [studentProfile, setStudentProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Course Details & Routine State
  const [course, setCourse] = useState(null);
  const [routineSlots, setRoutineSlots] = useState([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);

  // Semester Enrolled Courses (for quick switcher)
  const [semesterCourses, setSemesterCourses] = useState([]);

  // Course Notices State
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(true);
  const [noticeSearch, setNoticeSearch] = useState("");

  // Course Materials State
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialFilter, setMaterialFilter] = useState("all");

  // Course Assignments State
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // "all" | "pending" | "submitted" | "graded"

  // Assignment Submission Modal State
  const [submittingAssignment, setSubmittingAssignment] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionComment, setSubmissionComment] = useState("");
  const [isSubmittingFile, setIsSubmittingFile] = useState(false);

  // Attendance State for this Course
  const [attendanceStat, setAttendanceStat] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);

  // Class Tests (CT) State
  const [classTests, setClassTests] = useState([]);
  const [isClassTestsLoading, setIsClassTestsLoading] = useState(true);

  // Continuous Assessment & Combined 20% Evaluation State
  const [continuousEvaluation, setContinuousEvaluation] = useState(null);
  const [isEvaluationLoading, setIsEvaluationLoading] = useState(true);
  const [showGradingSchemeModal, setShowGradingSchemeModal] = useState(false);

  // ── 1. FETCH STUDENT PROFILE ──────────────────────────────────
  useEffect(() => {
    if (!user?.email) {
      setIsLoadingProfile(false);
      return;
    }
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/backend/api/students/email/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setStudentProfile(data);
        }
      } catch (err) {
        console.warn("Could not fetch student profile:", err);
      } finally {
        if (isMounted) setIsLoadingProfile(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.email]);

  // Semester Number calculation
  const currentSemesterNum = useMemo(() => {
    const raw = studentProfile?.semester || "7";
    const num = parseInt(String(raw).replace(/\D/g, ""), 10);
    return !isNaN(num) && num >= 1 && num <= 8 ? num : 7;
  }, [studentProfile?.semester]);

  // Load semester curriculum courses for quick switcher
  useEffect(() => {
    try {
      const courses = getCoursesBySemester(currentSemesterNum);
      setSemesterCourses(courses || []);
    } catch {
      setSemesterCourses([]);
    }
  }, [currentSemesterNum]);

  // ── 2. FETCH COURSE DETAILS & SCHEDULE ────────────────────────
  const fetchCourseDetails = useCallback(async () => {
    setIsLoadingCourse(true);
    try {
      const res = await fetch(`/backend/api/courses/code/${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course) setCourse(data.course);
        if (data.routineSlots) setRoutineSlots(data.routineSlots);
      } else {
        // Fallback: search in SEMESTER_COURSES
        let matched = null;
        Object.values(SEMESTER_COURSES).forEach((cList) => {
          const found = cList.find((c) => c.code.toUpperCase() === courseCode);
          if (found) matched = found;
        });
        setCourse(
          matched || {
            code: courseCode,
            title: `${courseCode} Module`,
            credits: 3.0,
            semester: `Semester ${currentSemesterNum}`,
            semesterNum: currentSemesterNum,
          }
        );
      }
    } catch (e) {
      console.warn("Failed to load course details:", e);
      setCourse({
        code: courseCode,
        title: `${courseCode} Module`,
        credits: 3.0,
        semester: `Semester ${currentSemesterNum}`,
        semesterNum: currentSemesterNum,
      });
    } finally {
      setIsLoadingCourse(false);
    }
  }, [courseCode, currentSemesterNum]);

  // ── 3. FETCH NOTICES FOR THIS COURSE ─────────────────────────
  const fetchCourseNotices = useCallback(async () => {
    setNoticesLoading(true);
    try {
      const res = await fetch(`/backend/api/notices?courseCode=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setNotices(data.notices || []);
      }
    } catch (e) {
      console.warn("Could not fetch course notices:", e);
    } finally {
      setNoticesLoading(false);
    }
  }, [courseCode]);

  // ── 4. FETCH MATERIALS FOR THIS COURSE ────────────────────────
  const fetchCourseMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch(`/backend/api/materials?course=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (e) {
      console.warn("Could not fetch course materials:", e);
    } finally {
      setMaterialsLoading(false);
    }
  }, [courseCode]);

  // ── 5. FETCH ASSIGNMENTS & MARKS FOR THIS COURSE ─────────────
  const fetchCourseAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const emailQuery = user?.email ? `&studentEmail=${encodeURIComponent(user.email)}` : "";
      const res = await fetch(`/backend/api/assignments?courseCode=${encodeURIComponent(courseCode)}${emailQuery}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      console.warn("Could not fetch course assignments:", e);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courseCode, user?.email]);

  // ── 6. FETCH CLASS TESTS (CT) & OFFLINE MARKS ─────────────────
  const fetchCourseClassTests = useCallback(async () => {
    setIsClassTestsLoading(true);
    try {
      const emailQuery = user?.email ? `&studentEmail=${encodeURIComponent(user.email)}` : "";
      const res = await fetch(`/backend/api/class-tests?courseCode=${encodeURIComponent(courseCode)}${emailQuery}`);
      if (res.ok) {
        const data = await res.json();
        setClassTests(data.classTests || []);
      }
    } catch (e) {
      console.warn("Could not fetch course class tests:", e);
    } finally {
      setIsClassTestsLoading(false);
    }
  }, [courseCode, user?.email]);

  // ── 8. FETCH CONTINUOUS ASSESSMENT EVALUATION (20% WEIGHT) ────
  const fetchContinuousEvaluation = useCallback(async () => {
    setIsEvaluationLoading(true);
    try {
      const emailQuery = user?.email ? `&studentEmail=${encodeURIComponent(user.email)}` : "";
      const idQuery = studentProfile?.studentId ? `&studentId=${encodeURIComponent(studentProfile.studentId)}` : "";
      const res = await fetch(`/backend/api/class-tests/continuous-evaluation?courseCode=${encodeURIComponent(courseCode)}${emailQuery}${idQuery}`);
      if (res.ok) {
        const data = await res.json();
        setContinuousEvaluation(data || null);
      }
    } catch (e) {
      console.warn("Could not fetch continuous evaluation:", e);
    } finally {
      setIsEvaluationLoading(false);
    }
  }, [courseCode, user?.email, studentProfile?.studentId]);

  // ── 7. FETCH ATTENDANCE METRICS FOR THIS COURSE ───────────────
  const fetchCourseAttendance = useCallback(async () => {
    setIsAttendanceLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.allSettled([
        apiFetch("/api/attendance/student/stats"),
        apiFetch("/api/attendance/student/history"),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value?.stats) {
        const matchedStat = statsRes.value.stats.find(
          (s) => s.courseCode?.replace(/\s+/g, "").toUpperCase() === courseCode.replace(/\s+/g, "").toUpperCase()
        );
        setAttendanceStat(matchedStat || null);
      }

      if (historyRes.status === "fulfilled" && historyRes.value?.history) {
        const matchedHistory = historyRes.value.history.filter(
          (h) => h.courseCode?.replace(/\s+/g, "").toUpperCase() === courseCode.replace(/\s+/g, "").toUpperCase()
        );
        setAttendanceHistory(matchedHistory);
      }
    } catch (e) {
      console.warn("Could not fetch course attendance:", e);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [courseCode]);

  // Initial Data Fetch
  useEffect(() => {
    if (courseCode) {
      fetchCourseDetails();
      fetchCourseNotices();
      fetchCourseMaterials();
      fetchCourseAssignments();
      fetchCourseClassTests();
      fetchCourseAttendance();
      fetchContinuousEvaluation();
    }
  }, [courseCode, fetchCourseDetails, fetchCourseNotices, fetchCourseMaterials, fetchCourseAssignments, fetchCourseClassTests, fetchCourseAttendance, fetchContinuousEvaluation]);

  // Handle assignment submission
  const handleSubmitAssignmentSolution = async (e) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    const existingSub = submittingAssignment?.mySubmission || submittingAssignment?.submission;
    const isUpdating = Boolean(existingSub);

    if (!isUpdating && !submissionFile) {
      toast.error("Please select a file to submit.");
      return;
    }
    if (isUpdating && !submissionFile && !submissionComment.trim() && !existingSub?.filePath) {
      toast.error("Please provide a solution file or submission notes.");
      return;
    }

    setIsSubmittingFile(true);
    try {
      const form = new FormData();
      if (submissionFile) {
        form.append("file", submissionFile);
      }
      form.append("notes", submissionComment.trim());
      form.append("comment", submissionComment.trim());
      form.append("studentEmail", user?.email || "");
      form.append("studentId", studentProfile?.studentId || "");
      form.append("studentName", studentProfile?.name || user?.name || "Student");
      form.append("roll", studentProfile?.roll || studentProfile?.studentId || "");
      form.append("semester", String(studentProfile?.semester || course?.semesterNum || "7"));

      const assignmentId = submittingAssignment.id || submittingAssignment._id;
      const res = await fetch(`/backend/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit assignment.");
      }

      toast.success(isUpdating ? "Assignment resubmitted successfully!" : "Assignment submitted successfully!");
      setSubmittingAssignment(null);
      setSubmissionFile(null);
      setSubmissionComment("");
      fetchCourseAssignments();
      fetchContinuousEvaluation();
    } catch (err) {
      console.error("Assignment submission error:", err);
      toast.error(err.message || "Network error submitting solution.");
    } finally {
      setIsSubmittingFile(false);
    }
  };

  // Filtered Notices
  const filteredNotices = useMemo(() => {
    if (!noticeSearch.trim()) return notices;
    const q = noticeSearch.toLowerCase();
    return notices.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
    );
  }, [notices, noticeSearch]);

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    let list = materials;
    if (materialFilter !== "all") {
      list = list.filter((m) => m.type?.toLowerCase().includes(materialFilter.toLowerCase()));
    }
    if (materialSearch.trim()) {
      const q = materialSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.title?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.originalName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [materials, materialFilter, materialSearch]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    if (assignmentFilter === "all") return assignments;
    if (assignmentFilter === "submitted") {
      return assignments.filter((a) => a.mySubmission || a.submission);
    }
    if (assignmentFilter === "pending") {
      return assignments.filter((a) => !(a.mySubmission || a.submission));
    }
    if (assignmentFilter === "graded") {
      return assignments.filter((a) => {
        const sub = a.mySubmission || a.submission;
        return sub && sub.marks !== null && sub.marks !== undefined;
      });
    }
    return assignments;
  }, [assignments, assignmentFilter]);

  // Course Stats
  const courseStats = useMemo(() => {
    const totalHeld = attendanceStat?.conductedSessions || attendanceStat?.totalHeld || 0;
    const attended = attendanceStat?.attendedSessions || attendanceStat?.attended || attendanceStat?.presentCount || 0;
    const targetClasses = attendanceStat?.targetSessions || attendanceStat?.totalPlannedClasses || course?.totalClasses || null;
    const baseTotal = targetClasses && targetClasses > 0 ? targetClasses : totalHeld;
    const pct = attendanceStat?.percentage !== undefined && attendanceStat?.percentage !== null
      ? attendanceStat.percentage
      : (baseTotal > 0 ? Math.round((attended / baseTotal) * 100) : 0);

    const submittedCount = assignments.filter((a) => a.mySubmission || a.submission).length;
    const gradedCount = assignments.filter((a) => {
      const sub = a.mySubmission || a.submission;
      return sub && sub.marks !== null && sub.marks !== undefined;
    }).length;

    // CT evaluations
    const evaluatedCTs = classTests.filter(
      (ct) => ct.myResult && !ct.myResult.isAbsent && ct.myResult.marks !== null && ct.myResult.marks !== undefined
    );
    const absentCTs = classTests.filter((ct) => ct.myResult?.isAbsent);
    const totalCTMarksObtained = evaluatedCTs.reduce((sum, ct) => sum + Number(ct.myResult.marks || 0), 0);
    const totalCTMarksPossible = evaluatedCTs.reduce((sum, ct) => sum + Number(ct.totalMarks || 20), 0);
    const ctAveragePct = totalCTMarksPossible > 0 ? Math.round((totalCTMarksObtained / totalCTMarksPossible) * 100) : null;

    const continuousMarks20 = continuousEvaluation?.summary?.combined20Marks ?? null;
    const continuousPct = continuousEvaluation?.summary?.percentage ?? null;
    const continuousGrade = continuousEvaluation?.summary?.letterGrade || "Ungraded";
    const continuousGpa = continuousEvaluation?.summary?.gpa || 0.0;
    const continuousInterpretation = continuousEvaluation?.summary?.interpretation || "";

    return {
      continuousMarks20,
      continuousPct,
      continuousGrade,
      continuousGpa,
      continuousInterpretation,
      noticesCount: notices.length,
      materialsCount: materials.length,
      assignmentsCount: assignments.length,
      classTestsCount: classTests.length,
      evaluatedCTsCount: evaluatedCTs.length,
      absentCTsCount: absentCTs.length,
      ctAveragePct,
      submittedCount,
      gradedCount,
      totalHeld,
      targetClasses,
      baseTotal,
      attended,
      missed: Math.max(0, totalHeld - attended),
      attendancePct: pct,
      isCollegiate: (totalHeld > 0 || (targetClasses && targetClasses > 0)) && pct >= 75,
      isNonCollegiate: (totalHeld > 0 || (targetClasses && targetClasses > 0)) && pct >= 60 && pct < 75,
      isDiscollegiate: (totalHeld > 0 || (targetClasses && targetClasses > 0)) && pct < 60,
    };
  }, [attendanceStat, notices, materials, assignments, classTests, continuousEvaluation, course?.totalClasses]);

  const isLabCourse = useMemo(() => {
    return (
      course?.type === "Sessional" ||
      course?.type === "Laboratory" ||
      course?.title?.toLowerCase().includes("sessional") ||
      course?.title?.toLowerCase().includes("lab")
    );
  }, [course]);

  if (isLoadingCourse && !course) {
    return (
      <Loading
        text="Loading Course Workspace..."
        subtext={`Synchronizing notices, materials, assignments, and routine for ${courseCode}`}
        fullScreen
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* ── TOP BREADCRUMB & COURSE SWITCHER ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Student Hub</span>
          </Link>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Semester {currentSemesterNum} Course
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            {/* Quick Course Switcher Dropdown */}
            <div className="relative inline-block">
              <select
                value={courseCode}
                onChange={(e) => {
                  const targetCode = e.target.value;
                  if (targetCode && targetCode !== courseCode) {
                    router.push(`/dashboard/student/courses/${encodeURIComponent(targetCode)}`);
                  }
                }}
                className="appearance-none font-mono text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 pr-8 outline-none cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <option value={courseCode}>
                  {courseCode} • {course?.title || "Active Course"}
                </option>
                {semesterCourses
                  .filter((c) => c.code !== courseCode)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} • {c.title}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchCourseDetails();
              fetchCourseNotices();
              fetchCourseMaterials();
              fetchCourseAssignments();
              fetchCourseClassTests();
              fetchCourseAttendance();
              fetchContinuousEvaluation();
              toast.success("Workspace synchronized!");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200/80 dark:border-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── COURSE WORKSPACE HERO CARD ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white p-7 sm:p-9 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-black text-xs border border-indigo-400/30">
                  {courseCode}
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/10 text-slate-200 font-bold text-xs border border-white/10">
                  {course?.credits || 3.0} Credits
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/10 text-slate-200 font-bold text-xs border border-white/10">
                  Semester {course?.semesterNum || currentSemesterNum}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  isLabCourse
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-400/30"
                }`}>
                  {isLabCourse ? "Sessional / Lab" : "Theory Core"}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {course?.title || `${courseCode} Course Module`}
              </h1>

              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Course Faculty: {routineSlots[0]?.teacherName || "Assigned Department Faculty"}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Classroom: {routineSlots[0]?.roomNo || (isLabCourse ? "AI & Hardware Lab" : `Room ${400 + currentSemesterNum}`)}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {/* Attendance Status Banner */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2 min-w-[210px]">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold">My Attendance Rate</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  courseStats.totalHeld === 0
                    ? "bg-slate-500/20 text-slate-300 border border-slate-400/30"
                    : courseStats.isCollegiate
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : courseStats.isNonCollegiate
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                }`}>
                  {courseStats.totalHeld === 0
                    ? "No Sessions Held"
                    : courseStats.isCollegiate
                    ? "Collegiate (Eligible)"
                    : courseStats.isNonCollegiate
                    ? "Non-Collegiate"
                    : "Discollegiate"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{courseStats.attendancePct}%</span>
                <span className="text-xs text-slate-400">
                  {courseStats.targetClasses
                    ? `(${courseStats.attended} of ${courseStats.targetClasses} target)`
                    : `(${courseStats.attended} of ${courseStats.totalHeld} held)`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${courseStats.attendancePct}%` }}
                />
              </div>
            </div>

            {/* Continuous Assessment Hero Card (30% for Sessional, 20% for Theory) */}
            <div
              onClick={() => handleTabChange("continuous-evaluation")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("continuous-evaluation"); }}
              className="p-4 rounded-2xl bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-400/30 hover:border-indigo-400/60 backdrop-blur-md space-y-2 min-w-[220px] cursor-pointer transition group"
              title="Click to view detailed Continuous Assessment Breakdown"
            >
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold flex items-center gap-1.5 text-indigo-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isLabCourse ? "Sessional (30%)" : "Theory (20%)"}</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {isLabCourse ? "All Tasks (30%)" : "Best 2 Tasks (20%)"}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">
                    {continuousEvaluation?.summary?.continuousMarks !== undefined && continuousEvaluation?.summary?.continuousMarks !== null
                      ? continuousEvaluation.summary.continuousMarks
                      : "—"}
                  </span>
                  <span className="text-xs text-indigo-300 font-bold">/ {isLabCourse ? "30" : "20"}</span>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                  continuousEvaluation?.summary?.letterGrade === "A+" || continuousEvaluation?.summary?.letterGrade === "A"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                    : "bg-indigo-500/20 text-indigo-300 border-indigo-400/40"
                }`}>
                  {continuousEvaluation?.summary?.letterGrade || "Ungraded"}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((continuousEvaluation?.summary?.continuousMarks || 0) / (isLabCourse ? 30 : 20)) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>{isLabCourse ? "All CT + Tasks Combined" : "Best 2 of CT + Tasks"}</span>
                <span className="text-indigo-300 group-hover:underline flex items-center gap-0.5 font-bold">
                  Scorecard <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
          </div>

          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 border-t border-white/10">
            {/* Card 1: Notices */}
            <div
              onClick={() => handleTabChange("notices")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("notices"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notices</span>
                <Bell className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{courseStats.noticesCount}</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">Teacher Updates</span>
            </div>

            {/* Card 2: Materials */}
            <div
              onClick={() => handleTabChange("materials")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("materials"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Materials</span>
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{courseStats.materialsCount}</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">Slides & Files</span>
            </div>

            {/* Card 3: Assignments */}
            <div
              onClick={() => handleTabChange("assignments")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("assignments"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tasks</span>
                <FileText className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{courseStats.assignmentsCount}</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">
                {courseStats.submittedCount} Submitted
              </span>
            </div>

            {/* Card 4: Class Tests (CT) */}
            <div
              onClick={() => handleTabChange("class-tests")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("class-tests"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Class Tests</span>
                <Award className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{courseStats.classTestsCount}</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">
                {courseStats.ctAveragePct !== null ? `${courseStats.ctAveragePct}% Avg Score` : "Offline Tests"}
              </span>
            </div>

            {/* Card 5: Attendance */}
            <div
              onClick={() => handleTabChange("attendance")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("attendance"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Attendance</span>
                <UserCheck className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{courseStats.attendancePct}%</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">
                {courseStats.attended} of {courseStats.totalHeld} Attended
              </span>
            </div>

            {/* Card 6: Routine */}
            <div
              onClick={() => handleTabChange("schedule")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("schedule"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Schedule</span>
                <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="text-2xl font-black text-white">{routineSlots.length}</div>
              <span className="text-[10px] text-indigo-300 font-medium block truncate">Weekly Classes</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── COURSE WORKSPACE TABS BAR ───────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: "notices", label: "Course Notices", icon: Bell, count: notices.length },
          { id: "materials", label: "Study Materials", icon: BookOpen, count: materials.length },
          { id: "assignments", label: "Continuous Tasks & Marks", icon: FileText, count: assignments.length },
          { id: "class-tests", label: "Class Tests (CT)", icon: Award, count: classTests.length },
          {
            id: "continuous-evaluation",
            label: isLabCourse ? "Continuous Result (30%)" : "Continuous Result (20%)",
            icon: Sparkles,
            count: continuousEvaluation?.summary?.continuousMarks !== undefined && continuousEvaluation?.summary?.continuousMarks !== null
              ? `${continuousEvaluation.summary.continuousMarks}/${isLabCourse ? 30 : 20}`
              : (isLabCourse ? "30%" : "20%"),
          },
          { id: "attendance", label: "My Attendance", icon: UserCheck, count: `${courseStats.attendancePct}%` },
          { id: "schedule", label: "Class Schedule", icon: Calendar, count: `${routineSlots.length} Slots` },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                  : "bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: COURSE NOTICES & ANNOUNCEMENTS
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "notices" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Course Notices & Teacher Announcements
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {notices.length} Published
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Official notices, test schedules, classroom changes, and voice recordings broadcasted for {courseCode}.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notices..."
                value={noticeSearch}
                onChange={(e) => setNoticeSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-64"
              />
              {noticeSearch && (
                <button
                  onClick={() => setNoticeSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Notices Grid */}
          {noticesLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading course notices...</p>
            </div>
          ) : filteredNotices.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredNotices.map((notice) => (
                <NoticeCard key={notice.id || notice._id} notice={notice} isAdmin={false} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {noticeSearch ? "No matching course notices found" : `No notices posted for ${courseCode} yet`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {noticeSearch
                  ? "Try adjusting your search keyword."
                  : "When your course instructor broadcasts an announcement or guideline, it will appear here."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: STUDY MATERIALS & LECTURES
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "materials" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Study Materials & Lecture Notes
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {materials.length} Files
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Download slides, lecture notes, reference PDFs, and syllabus documents uploaded for {courseCode}.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
                />
                {materialSearch && (
                  <button
                    onClick={() => setMaterialSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={materialFilter}
                onChange={(e) => setMaterialFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">All File Types</option>
                <option value="slide">Slides (PDF / PPT)</option>
                <option value="note">Notes & Handouts</option>
                <option value="book">Reference Books</option>
                <option value="syllabus">Syllabus</option>
              </select>
            </div>
          </div>

          {/* Materials List */}
          {materialsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading course materials...</p>
            </div>
          ) : filteredMaterials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => {
                const downloadUrl = mat.fileUrl || mat.filePath || `/backend/api/materials/${mat.id || mat._id}/download`;
                return (
                  <div
                    key={mat.id || mat._id}
                    className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-600 transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          {mat.type || "Document"}
                        </span>
                        {mat.fileSize && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {mat.fileSize}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">
                        {mat.title}
                      </h3>
                      {mat.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {mat.description}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium truncate">
                        {mat.author || mat.teacherName || "Course Teacher"}
                      </span>
                      <a
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {materialSearch ? "No matching materials found" : `No study materials uploaded for ${courseCode} yet`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {materialSearch
                  ? "Try clearing your search keyword."
                  : "Lecture slides, handouts, and notes will appear here once uploaded by your instructor."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: CONTINUOUS TASKS, ASSIGNMENTS & MARKS
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "assignments" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Continuous Assessment Tasks & Marks
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {assignments.length} Tasks
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Submit course assignments, track deadlines, and review evaluated marks with teacher feedback.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All Tasks" },
                { id: "pending", label: "Pending" },
                { id: "submitted", label: "Submitted" },
                { id: "graded", label: "Evaluated" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setAssignmentFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    assignmentFilter === filter.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Continuous Assessment (20%) Combined Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    {isLabCourse ? "Sessional Continuous Assessment (30% Weight)" : "Theory Continuous Assessment (20% Weight)"}
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                    {isLabCourse ? "All Tasks (30%)" : "Best 2 Tasks (20%)"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isLabCourse
                    ? "All class tests and assignment marks combine into the 30% sessional continuous mark: "
                    : "Best 2 marks from class tests and assignments combine into the 20% continuous mark: "}
                  <strong className="text-indigo-700 dark:text-indigo-300 font-mono ml-1.5 font-bold">
                    {continuousEvaluation?.summary?.continuousMarks !== undefined && continuousEvaluation?.summary?.continuousMarks !== null
                      ? `${continuousEvaluation.summary.continuousMarks} / ${isLabCourse ? 30 : 20} Marks (${continuousEvaluation.summary.percentage}% • ${continuousEvaluation.summary.letterGrade})`
                      : "Awaiting evaluation"}
                  </strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange("continuous-evaluation")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>{isLabCourse ? "Full 30% Breakdown" : "Full 20% Breakdown"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Assignments List */}
          {assignmentsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading coursework assignments...</p>
            </div>
          ) : filteredAssignments.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {filteredAssignments.map((task) => {
                const sub = task.mySubmission || task.submission;
                const isSubmitted = Boolean(sub);
                const isGraded = sub && sub.marks !== null && sub.marks !== undefined;
                const gradeInfo = getGradeBadge(sub?.marks, task.totalMarks || 20);

                const deadlineDate = task.deadline ? new Date(task.deadline) : null;
                const isPastDeadline = deadlineDate && new Date() > deadlineDate;

                return (
                  <div
                    key={task.id || task._id}
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Max {task.totalMarks || 20} Marks
                          </span>

                          {deadlineDate && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                isPastDeadline
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>Due: {deadlineDate.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </span>
                          )}

                          {isGraded ? (
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${gradeInfo.color}`}>
                              Grade: {gradeInfo.letter} ({sub.marks} / {task.totalMarks || 20})
                            </span>
                          ) : isSubmitted ? (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              Submitted • Awaiting Marks
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              Submission Pending
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                            {task.description}
                          </p>
                        )}

                        {/* Teacher's Attachment (Problem sheet) */}
                        {task.filePath && (
                          <div className="pt-1">
                            <a
                              href={`/backend/${task.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>Download Problem Sheet ({task.originalName || "Assignment Brief"})</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action / Grade Card */}
                      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        {isGraded ? (
                          <div className="text-right p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 min-w-[140px]">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Awarded Score</span>
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                              {sub.marks} <span className="text-xs font-semibold text-slate-400">/ {task.totalMarks || 20}</span>
                            </div>
                            {sub.feedback && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic max-w-[180px] text-left">
                                &ldquo;{sub.feedback}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : isSubmitted ? (
                          <div className="space-y-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  sub.isLate
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                                    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{sub.isLate ? "Submitted Late" : "Submitted"}</span>
                              </span>
                              {sub.submittedAt && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(sub.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {sub.filePath && (
                              <div>
                                <a
                                  href={`/backend/${sub.filePath.replace(/^\//, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 max-w-[200px] truncate"
                                  title="View your submitted solution file"
                                >
                                  <FileCheck className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate">{sub.originalName || "My Submitted Solution"}</span>
                                </a>
                              </div>
                            )}

                            {(sub.notes || sub.comment) && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic max-w-[220px] text-right truncate">
                                &ldquo;{sub.notes || sub.comment}&rdquo;
                              </p>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmittingAssignment(task);
                                  setSubmissionFile(null);
                                  setSubmissionComment(sub.notes || sub.comment || "");
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-slate-200 dark:hover:text-indigo-400 text-xs font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                                title="Edit and resubmit your assignment solution"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                <span>Edit & Resubmit</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittingAssignment(task);
                              setSubmissionFile(null);
                              setSubmissionComment("");
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Submit Solution</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                No coursework assignments posted yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Continuous assessment tasks, quizzes, and problem sets given by your instructor will appear here for submission.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: CLASS TESTS (CT) & OFFLINE ASSESSMENT MARKS
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "class-tests" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Class Tests (CT) & Offline Marks
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {classTests.length} Tests
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Offline classroom assessment scores, UGC letter grades, teacher feedback, and comparative class averages.
              </p>
            </div>
          </div>

          {/* Student CT Benchmark Summary Cards */}
          {classTests.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tests Conducted
                </p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                  {classTests.length}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">By course instructor</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/50">
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Evaluated Tests
                </p>
                <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
                  {courseStats.evaluatedCTsCount} <span className="text-xs font-normal text-slate-400">/ {classTests.length}</span>
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Marks published</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50">
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  My Average Score
                </p>
                <p className="text-2xl font-black text-indigo-800 dark:text-indigo-300 mt-1">
                  {courseStats.ctAveragePct !== null ? `${courseStats.ctAveragePct}%` : "—"}
                </p>
                <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/70 mt-0.5">
                  {courseStats.ctAveragePct !== null
                    ? getGradeBadge(courseStats.ctAveragePct, 100).letter + " Equivalent"
                    : "Awaiting marks"}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Class Absences
                </p>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {courseStats.absentCTsCount}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Missed assessments</p>
              </div>
            </div>
          )}

          {/* Continuous Assessment (20%) Combined Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                    {isLabCourse ? "Sessional Continuous Assessment (30% Weight)" : "Theory Continuous Assessment (20% Weight)"}
                  </h4>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                    {isLabCourse ? "All Tasks (30%)" : "Best 2 Tasks (20%)"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isLabCourse
                    ? "All class tests and assignment marks combine into the 30% sessional continuous mark: "
                    : "Best 2 marks from class tests and assignments combine into the 20% continuous mark: "}
                  <strong className="text-indigo-700 dark:text-indigo-300 font-mono ml-1.5 font-bold">
                    {continuousEvaluation?.summary?.continuousMarks !== undefined && continuousEvaluation?.summary?.continuousMarks !== null
                      ? `${continuousEvaluation.summary.continuousMarks} / ${isLabCourse ? 30 : 20} Marks (${continuousEvaluation.summary.percentage}% • ${continuousEvaluation.summary.letterGrade})`
                      : "Awaiting evaluation"}
                  </strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleTabChange("continuous-evaluation")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>{isLabCourse ? "Full 30% Breakdown" : "Full 20% Breakdown"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Class Tests List */}
          {isClassTestsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading offline class tests & marks...</p>
            </div>
          ) : classTests.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {classTests.map((ct) => {
                const res = ct.myResult;
                const isAbsent = Boolean(res?.isAbsent);
                const hasScore = !isAbsent && res?.marks !== null && res?.marks !== undefined;
                const scoreNum = hasScore ? Number(res.marks) : null;
                const gradeInfo = hasScore ? getGradeBadge(scoreNum, ct.totalMarks || 20) : null;

                return (
                  <div
                    key={ct.id || ct._id}
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-5 transition"
                  >
                    {/* Header Strip */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Max {ct.totalMarks || 20} Marks
                          </span>

                          {ct.date && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Date: {ct.date}</span>
                            </span>
                          )}

                          {ct.room && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{ct.room}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {ct.title}
                        </h3>

                        {ct.topic && (
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">
                              Syllabus / Topics Covered:
                            </span>
                            <span className="whitespace-pre-line">{ct.topic}</span>
                          </div>
                        )}
                      </div>

                      {/* Student's Personal Result Card */}
                      <div className="shrink-0 min-w-[200px]">
                        {isAbsent ? (
                          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-right space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                              My Test Status
                            </span>
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                              Absent
                            </div>
                            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 font-medium">
                              Recorded absent in classroom
                            </p>
                          </div>
                        ) : hasScore ? (
                          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-right space-y-1">
                            <div className="flex items-center justify-end gap-1.5 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                My Score
                              </span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${gradeInfo?.color}`}>
                                {res.grade || gradeInfo?.letter}
                              </span>
                            </div>
                            <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                              {res.marks}{" "}
                              <span className="text-xs font-semibold text-slate-400">
                                / {ct.totalMarks || 20}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {res.percentage}% • UGC Grade {res.grade || gradeInfo?.letter}
                            </div>
                            {res.remarks && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic text-left border-t border-slate-100 dark:border-slate-800 pt-1.5">
                                &ldquo;{res.remarks}&rdquo;
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-right space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                              Evaluation
                            </span>
                            <div className="text-base font-extrabold text-amber-700 dark:text-amber-300">
                              Pending
                            </div>
                            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80">
                              Marks awaiting entry by instructor
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Class Comparative Benchmarks Bar */}
                    {ct.stats && (
                      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/40 p-3 rounded-xl">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span>
                            Class Average:{" "}
                            <strong className="text-slate-800 dark:text-slate-100 font-extrabold">
                              {ct.stats.averageMarks !== null ? `${ct.stats.averageMarks} / ${ct.totalMarks}` : "—"}
                            </strong>
                            {ct.stats.avgPercentage ? ` (${ct.stats.avgPercentage}%)` : ""}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span>
                            Highest Mark:{" "}
                            <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                              {ct.stats.highestMarks !== null ? `${ct.stats.highestMarks} / ${ct.totalMarks}` : "—"}
                            </strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-slate-400">
                            Class Turnout: {ct.stats.evaluatedCount || 0} Evaluated
                            {ct.stats.absentCount > 0 && ` • ${ct.stats.absentCount} Absent`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                No offline class tests recorded yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When offline classroom tests (CT) are taken and evaluated by your instructor, your scores, UGC letter grades, and feedback will be displayed here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: CONTINUOUS ASSESSMENT EVALUATION (30% Sessional / 20% Theory)
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "continuous-evaluation" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-8 transition-colors">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {isLabCourse ? "Sessional Continuous Assessment (30%)" : "Theory Continuous Assessment (20%)"}
                </h2>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {isLabCourse ? "30% Sessional Scale (All Tasks)" : "20% Theory Scale (Best 2 Tasks)"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isLabCourse
                  ? "Sessional subject continuous evaluation: combines all Class Tests (CT), lab performance, and coursework assignments into 30%."
                  : "Theoretical subject continuous evaluation: combines the best 2 scores from Class Tests (CT) and coursework assignments into 20%."}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowGradingSchemeModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <BookMarked className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Grading Scheme & Rules</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchContinuousEvaluation();
                  toast.success("Continuous marks refreshed!");
                }}
                disabled={isEvaluationLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluationLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Result: 30% for Sessional, 20% for Theory */}
            <div className="p-6 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{isLabCourse ? "Continuous Result (30%)" : "Continuous Result (20%)"}</span>
                </span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                  continuousEvaluation?.summary?.letterGrade === "A+" || continuousEvaluation?.summary?.letterGrade === "A"
                    ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                }`}>
                  {continuousEvaluation?.summary?.letterGrade || "Ungraded"} ({continuousEvaluation?.summary?.gpa !== null && continuousEvaluation?.summary?.gpa !== undefined ? Number(continuousEvaluation.summary.gpa).toFixed(2) : "0.00"} GPA)
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {continuousEvaluation?.summary?.continuousMarks !== undefined && continuousEvaluation?.summary?.continuousMarks !== null
                      ? continuousEvaluation.summary.continuousMarks
                      : "—"}
                  </span>
                  <span className="text-base font-bold text-slate-500 dark:text-slate-400">/ {isLabCourse ? "30.0" : "20.0"} Marks</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Percentage: <strong className="text-slate-900 dark:text-white font-mono">{continuousEvaluation?.summary?.percentage ?? "—"}%</strong> ({continuousEvaluation?.summary?.interpretation || "Pending Assessment"})
                </p>
              </div>

              {/* Score Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, ((continuousEvaluation?.summary?.continuousMarks || 0) / (isLabCourse ? 30 : 20)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>0 Marks</span>
                  <span>Pass ({isLabCourse ? "12.0" : "8.0"})</span>
                  <span>Max ({isLabCourse ? "30.0" : "20.0"})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-[11px] text-indigo-900 dark:text-indigo-200 font-medium">
                {isLabCourse
                  ? "✓ Calculated from all evaluated CTs and assignments combined."
                  : "✓ Calculated from the best 2 evaluated CTs and assignments."}
              </div>
            </div>

            {/* Assessment Structure Breakdown (Attendance 10% kept separate for final mark compilation) */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Course Mark Breakdown</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  Total: 100 Marks
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isLabCourse ? "Continuous Lab Assessment (30%):" : "Continuous Assessment (20%):"}</span>
                  </span>
                  <span className="font-black text-indigo-700 dark:text-indigo-300 font-mono">
                    {continuousEvaluation?.summary?.continuousMarks ?? "—"} / {isLabCourse ? "30.0" : "20.0"} Marks
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span>Class Attendance (10%):</span>
                    </span>
                    <span className="text-[10px] text-slate-400 block ml-5">
                      Added when final semester mark is combined
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                    10% (Later)
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isLabCourse ? "Final Sessional Exam (60%):" : "Semester Final Exam (70%):"}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                    {isLabCourse ? "60 Marks" : "70 Marks"}
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300">
                Notice: Attendance marks (10%) are not combined into continuous coursework. They will be integrated directly at semester end with the final examination.
              </div>
            </div>

            {/* Assessment Counts & Completion Status */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Recorded Assessments</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {continuousEvaluation?.summary?.evaluatedCount || 0} Evaluated
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Class Tests</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {continuousEvaluation?.summary?.classTestsCount || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assignments</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {continuousEvaluation?.summary?.assignmentsCount || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Subject Type</span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase mt-1 block">
                    {isLabCourse ? "Sessional (30%)" : "Theory (20%)"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Marks</span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {continuousEvaluation?.summary?.pendingCount || 0}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {isLabCourse
                  ? "All test and assignment scores contribute directly to your 30% sessional mark."
                  : "Your 2 highest scores among all tests and assignments are automatically selected."}
              </p>
            </div>
          </div>

          {/* Rule Card: Best 2 rule (for Theory) or All Tasks rule (for Sessional) */}
          {!isLabCourse ? (
            <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200">
                      Theory Regulation: Best-2 Assessment Rule (20% Weight)
                    </h4>
                    <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80">
                      &ldquo;Performance in the class tests/ assignments/quizzes will be on the basis of the best two of the three class tests/assignments/quizzes.&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block uppercase">Best 2 Score</span>
                    <span className="text-lg font-black text-indigo-900 dark:text-indigo-100 font-mono">
                      {continuousEvaluation?.summary?.theoryBest2Score?.marks20 ?? continuousEvaluation?.summary?.continuousMarks ?? "—"} / 20.0
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-xs">
                    {continuousEvaluation?.summary?.theoryBest2Score?.letterGrade || continuousEvaluation?.summary?.letterGrade}
                  </span>
                </div>
              </div>

              {continuousEvaluation?.summary?.theoryBest2Score?.selectedItems && continuousEvaluation.summary.theoryBest2Score.selectedItems.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                  <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300">Selected Best 2 Assessments:</span>
                  {continuousEvaluation.summary.theoryBest2Score.selectedItems.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-indigo-300 dark:border-indigo-800 text-[11px] font-bold"
                    >
                      <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                      <span>{item.title}</span>
                      <span className="text-indigo-600 font-mono">({item.obtained}/{item.max} • {item.percentage}%)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                      Sessional Regulation: Cumulative Lab Evaluation (30% Weight)
                    </h4>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      &ldquo;Thirty percent (30%) of marks of a sessional course is allotted for continuous lab evaluation, lab test, quizzes, and home assignments.&rdquo; All assessments contribute to the 30% continuous mark.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold block uppercase">Cumulative Score</span>
                    <span className="text-lg font-black text-amber-900 dark:text-amber-100 font-mono">
                      {continuousEvaluation?.summary?.sessionalScore?.marks30 ?? continuousEvaluation?.summary?.continuousMarks ?? "—"} / 30.0
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-600 text-white text-xs font-black shadow-xs">
                    {continuousEvaluation?.summary?.sessionalScore?.letterGrade || continuousEvaluation?.summary?.letterGrade}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Itemized Assessments Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Itemized Assessment Roster & Marks
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Complete list of Class Tests and Coursework Assignments evaluated for {courseCode}.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                {continuousEvaluation?.allAssessments?.length || 0} Total Recorded
              </span>
            </div>

            {isEvaluationLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">Computing continuous assessment marks...</p>
              </div>
            ) : continuousEvaluation?.allAssessments && continuousEvaluation.allAssessments.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4">Assessment Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date / Due</th>
                      <th className="py-3 px-4 text-center">Total Marks</th>
                      <th className="py-3 px-4 text-center">Marks Obtained</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-center">Letter Grade</th>
                      <th className="py-3 px-4 text-center">Grade Point</th>
                      <th className="py-3 px-4">Feedback / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/70 dark:bg-slate-900/40">
                    {continuousEvaluation.allAssessments.map((item, idx) => {
                      const isCT = item.type === "class_test";
                      const isAbsent = Boolean(item.isAbsent);
                      const hasMarks = item.isEvaluated && item.obtainedMarks !== null && !isAbsent;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{item.title}</span>
                              {item.topic && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({item.topic})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isCT
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/60"
                            }`}>
                              {isCT ? "Class Test (CT)" : "Assignment"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                            {item.date || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono">
                            {item.totalMarks}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isAbsent ? (
                              <span className="text-xs font-bold text-rose-600">Absent (0)</span>
                            ) : hasMarks ? (
                              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                                {item.obtainedMarks}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 italic">Pending</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold">
                            {item.percentage !== null ? `${item.percentage}%` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isAbsent
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : hasMarks
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60"
                                : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {item.grade || "Ungraded"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold">
                            {item.gpa !== null ? Number(item.gpa).toFixed(2) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {item.remarks || item.feedback ? (
                              <span className="italic text-slate-500 dark:text-slate-400">
                                &ldquo;{item.remarks || item.feedback}&rdquo;
                              </span>
                            ) : hasMarks ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" />
                                <span>Evaluated</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">Awaiting evaluation</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Award className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No continuous assessments published yet
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When your instructor creates class tests or coursework assignments and enters grades, your scorecard will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4: MY ATTENDANCE & EXAM ELIGIBILITY
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  My Course Attendance & Exam Eligibility
                </h2>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    courseStats.totalHeld === 0
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      : courseStats.isCollegiate
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200"
                  }`}
                >
                  {courseStats.totalHeld === 0 ? "No Sessions Held" : `${courseStats.attendancePct}% Cumulative`}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Official attendance records, PUST collegiate threshold monitoring, and session log for {courseCode}.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchCourseAttendance}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Roster</span>
            </button>
          </div>

          {/* Eligibility Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                {courseStats.targetClasses ? "Target Classes" : "Total Classes Held"}
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {courseStats.targetClasses ? courseStats.targetClasses : courseStats.totalHeld}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {courseStats.targetClasses ? `${courseStats.totalHeld} conducted so far` : "Recorded by teacher"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Classes Attended</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {courseStats.attended}
                {courseStats.targetClasses && (
                  <span className="text-xs font-bold text-slate-400 font-mono ml-1">/ {courseStats.targetClasses}</span>
                )}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {courseStats.targetClasses ? `${courseStats.attendancePct}% target attendance` : "Present in session"}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Missed Sessions</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{courseStats.missed}</div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Unexcused absence</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Exam Status</span>
              <div className={`text-base font-black ${
                courseStats.totalHeld === 0
                  ? "text-slate-600 dark:text-slate-400"
                  : courseStats.isCollegiate ? "text-emerald-600" : courseStats.isNonCollegiate ? "text-amber-600" : "text-rose-600"
              }`}>
                {courseStats.totalHeld === 0
                  ? "No Sessions Yet"
                  : courseStats.isCollegiate ? "Collegiate (≥75%)" : courseStats.isNonCollegiate ? "Non-Collegiate (60-74%)" : "Discollegiate (<60%)"}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {courseStats.totalHeld === 0
                  ? "Attendance tracking not started"
                  : courseStats.isCollegiate ? "Fully eligible for final exam" : "Requires board approval & fine"}
              </span>
            </div>
          </div>

          {/* Session History Log */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Course Session History Log
            </h3>

            {isAttendanceLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading session history...</div>
            ) : attendanceHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Time Slot</th>
                      <th className="px-4 py-3">Topic / Lecture</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attendanceHistory.map((sess, idx) => {
                      const isPresent = sess.status === "present" || sess.present;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                            {sess.date || sess.sessionDate || "Recent Class"}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{sess.timeSlot || "Scheduled Slot"}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{sess.topic || "Regular Curriculum Lecture"}</td>
                          <td className="px-4 py-3 text-slate-500 capitalize">{sess.method || "Biometric / Roll Call"}</td>
                          <td className="px-4 py-3 text-right font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                isPresent
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              }`}
                            >
                              {isPresent ? "Present" : "Absent"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                No session log records logged for this course yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 5: ROUTINE SCHEDULE & TIMETABLE
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "schedule" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Course Routine & Weekly Timetable
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {routineSlots.length} Classes Weekly
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Official weekly timetable schedule and classroom allocation for {courseCode}.
              </p>
            </div>
          </div>

          {routineSlots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routineSlots.map((slot, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {slot.day || "Class Day"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                      Room {slot.roomNo || (isLabCourse ? "Lab" : "407")}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{slot.timeSlot || "09:00 - 10:00"}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Instructor: {slot.teacherName || "Course Faculty"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                No routine slots configured
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                The weekly timetable schedule for this course will be displayed here once mapped in the departmental routine.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUBMISSION MODAL: UPLOAD / EDIT ASSIGNMENT SOLUTION
          ════════════════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════════════
          OFFICIAL UNIVERSITY GRADING & EVALUATION POLICY MODAL
          (Based on Academic Ordinances: Theoretical & Sessional)
          ════════════════════════════════════════════════════════════════ */}
      {showGradingSchemeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Academic Grading & Evaluation System
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Department of Computer Science & Engineering • Official Ordinances
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGradingSchemeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scheme 1: Theoretical Course */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  <span>Distribution of Marks for Theoretical Course (100 Marks Total)</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Continuous 30% + Final 70%
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Thirty percent (30%) of marks of a theoretical course is allotted for continuous assessment (attendance, class tests, assignments, and quizzes). Seventy percent (70%) is allotted to the semester final examination.
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">Component</th>
                      <th className="py-2.5 px-4 text-right">Percentage / Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-4">Class Attendance</td>
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-600 font-mono">10%</td>
                    </tr>
                    <tr className="bg-indigo-50/40 dark:bg-indigo-950/20 font-bold">
                      <td className="py-2.5 px-4 text-indigo-950 dark:text-indigo-200">
                        Class Tests / Assignments / Quizzes (Combined)
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-indigo-600 font-mono">20%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4">Semester Final Examination (3 Hours)</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono">70%</td>
                    </tr>
                    <tr className="bg-slate-100/70 dark:bg-slate-800 font-black">
                      <td className="py-2.5 px-4">Total</td>
                      <td className="py-2.5 px-4 text-right font-mono">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400 italic border border-slate-200 dark:border-slate-700">
                &ldquo;Number of class tests/assignments/quizzes of a course shall be three. Performance in the class tests/assignments/quizzes will be on the basis of the best two of the three.&rdquo;
              </div>
            </div>

            {/* Scheme 2: Sessional / Laboratory Course */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Distribution of Marks for Sessional / Laboratory Course</span>
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  Continuous 40% + Final 60%
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Forty percent (40%) of marks of a sessional/laboratory course is allotted for continuous assessment. Sixty percent (60%) is allotted to the semester final sessional/laboratory examination.
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">Component</th>
                      <th className="py-2.5 px-4 text-right">Percentage / Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-4">Sessional / Laboratory Attendance</td>
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-600 font-mono">10%</td>
                    </tr>
                    <tr className="bg-amber-50/40 dark:bg-amber-950/20 font-bold">
                      <td className="py-2.5 px-4 text-amber-950 dark:text-amber-200">
                        Lab Test / Lab Performance and Lab Report (Continuous)
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-amber-600 font-mono">30%</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4">Final Sessional / Laboratory Examination</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono">60%</td>
                    </tr>
                    <tr className="bg-slate-100/70 dark:bg-slate-800 font-black">
                      <td className="py-2.5 px-4">Total</td>
                      <td className="py-2.5 px-4 text-right font-mono">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Scheme 3: Official Letter Grade and Grade Point Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Official Letter Grade and Grade Point Scale (PUST Standard)</span>
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">Numerical Grade</th>
                      <th className="py-2.5 px-4">Letter Grade</th>
                      <th className="py-2.5 px-4 text-center">Grade Point</th>
                      <th className="py-2.5 px-4">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    <tr className="bg-emerald-50/30 dark:bg-emerald-950/10 font-bold">
                      <td className="py-2 px-4 font-sans">80% and above</td>
                      <td className="py-2 px-4 font-black text-emerald-700 dark:text-emerald-300">A+ (A plus)</td>
                      <td className="py-2 px-4 text-center">4.00</td>
                      <td className="py-2 px-4 font-sans text-emerald-700 dark:text-emerald-300">Outstanding</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">75% to less than 80%</td>
                      <td className="py-2 px-4 font-bold text-emerald-600 dark:text-emerald-400">A (A regular)</td>
                      <td className="py-2 px-4 text-center">3.75</td>
                      <td className="py-2 px-4 font-sans">Excellent</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">70% to less than 75%</td>
                      <td className="py-2 px-4 font-bold text-indigo-600 dark:text-indigo-400">A- (A minus)</td>
                      <td className="py-2 px-4 text-center">3.50</td>
                      <td className="py-2 px-4 font-sans">Very Good</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">65% to less than 70%</td>
                      <td className="py-2 px-4 font-bold text-indigo-600 dark:text-indigo-400">B+ (B plus)</td>
                      <td className="py-2 px-4 text-center">3.25</td>
                      <td className="py-2 px-4 font-sans">Good</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">60% to less than 65%</td>
                      <td className="py-2 px-4 font-bold text-blue-600 dark:text-blue-400">B (B regular)</td>
                      <td className="py-2 px-4 text-center">3.00</td>
                      <td className="py-2 px-4 font-sans">Satisfactory</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">55% to less than 60%</td>
                      <td className="py-2 px-4 font-bold text-amber-600 dark:text-amber-400">B- (B minus)</td>
                      <td className="py-2 px-4 text-center">2.75</td>
                      <td className="py-2 px-4 font-sans">Below Satisfactory</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">50% to less than 55%</td>
                      <td className="py-2 px-4 font-bold text-amber-600 dark:text-amber-400">C+ (C plus)</td>
                      <td className="py-2 px-4 text-center">2.50</td>
                      <td className="py-2 px-4 font-sans">Average</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">45% to less than 50%</td>
                      <td className="py-2 px-4 font-bold text-orange-600 dark:text-orange-400">C (C regular)</td>
                      <td className="py-2 px-4 text-center">2.25</td>
                      <td className="py-2 px-4 font-sans">Pass</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 font-sans">40% to less than 45%</td>
                      <td className="py-2 px-4 font-bold text-orange-700 dark:text-orange-300">D</td>
                      <td className="py-2 px-4 text-center">2.00</td>
                      <td className="py-2 px-4 font-sans">Poor</td>
                    </tr>
                    <tr className="bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300">
                      <td className="py-2 px-4 font-sans">less than 40%</td>
                      <td className="py-2 px-4 font-black">F</td>
                      <td className="py-2 px-4 text-center">0.00</td>
                      <td className="py-2 px-4 font-sans">Fail</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGradingSchemeModal(false)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {submittingAssignment && (() => {
        const existingSub = submittingAssignment.mySubmission || submittingAssignment.submission;
        const isUpdating = Boolean(existingSub);

        return (
          <div
            data-lenis-prevent
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
          >
            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {isUpdating ? <Edit3 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isUpdating ? "Edit & Resubmit Assignment Solution" : "Submit Assignment Solution"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {courseCode} • {submittingAssignment.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitAssignmentSolution} className="space-y-4">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Student: {studentProfile?.name || user?.name || "Enrolled Student"}
                  </div>
                  <div className="text-slate-500">
                    Roll / ID: {studentProfile?.roll || studentProfile?.studentId || "Student Roll"}
                  </div>
                </div>

                {/* Show existing submission details if editing */}
                {isUpdating && existingSub?.filePath && (
                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Current solution on file:</span>
                      </span>
                      <a
                        href={`/backend/${existingSub.filePath.replace(/^\//, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Download Current
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate">
                      {existingSub.originalName || "Uploaded Solution File"}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {isUpdating ? "Upload New Solution File (Optional)" : "Solution Document (PDF, Word, or ZIP archive) *"}
                  </label>
                  <input
                    type="file"
                    required={!isUpdating && !existingSub?.filePath}
                    onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  {isUpdating && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Choose a new file to replace your existing solution, or leave blank to keep your current file.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Submission Comments / Solution Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    placeholder="Mention code execution guidelines, repository link, or notes for the instructor..."
                    className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSubmittingAssignment(null)}
                    disabled={isSubmittingFile}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFile || (!isUpdating && !submissionFile)}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingFile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {isSubmittingFile
                        ? "Saving..."
                        : isUpdating
                        ? "Save Changes & Resubmit"
                        : "Upload & Submit Solution"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

