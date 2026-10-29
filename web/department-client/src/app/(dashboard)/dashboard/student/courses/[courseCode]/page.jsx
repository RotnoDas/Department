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
  FileSpreadsheet
} from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { apiFetch } from "@/lib/api";
import Loading from "@/components/common/Loading";
import NoticeCard from "@/components/notice/NoticeCard";
import { SEMESTER_COURSES, getCoursesBySemester } from "@/data/courses";

// Helper for UGC grading breakdown
const getGradeBadge = (score, max) => {
  if (score === null || score === undefined || !max || max <= 0) {
    return { letter: "Ungraded", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  }
  const pct = (score / max) * 100;
  if (pct >= 80) return { letter: "A+", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
  if (pct >= 75) return { letter: "A", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
  if (pct >= 70) return { letter: "A-", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" };
  if (pct >= 65) return { letter: "B+", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" };
  if (pct >= 60) return { letter: "B", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
  if (pct >= 55) return { letter: "B-", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
  if (pct >= 50) return { letter: "C+", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
  if (pct >= 40) return { letter: "D", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-300 border-orange-200 dark:border-orange-800" };
  return { letter: "F", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-200 dark:border-rose-800" };
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
  const validTabs = useMemo(() => ["notices", "materials", "assignments", "attendance", "schedule"], []);

  // Active Tab: "notices" | "materials" | "assignments" | "attendance" | "schedule"
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

  // ── 6. FETCH ATTENDANCE METRICS FOR THIS COURSE ───────────────
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
      fetchCourseAttendance();
    }
  }, [courseCode, fetchCourseDetails, fetchCourseNotices, fetchCourseMaterials, fetchCourseAssignments, fetchCourseAttendance]);

  // Handle assignment submission
  const handleSubmitAssignmentSolution = async (e) => {
    e.preventDefault();
    if (!submittingAssignment) return;
    if (!submissionFile) {
      toast.error("Please select a file to submit.");
      return;
    }

    setIsSubmittingFile(true);
    try {
      const form = new FormData();
      form.append("file", submissionFile);
      form.append("comment", submissionComment.trim());
      form.append("studentEmail", user?.email || "");
      form.append("studentId", studentProfile?.studentId || "");
      form.append("studentName", studentProfile?.name || user?.name || "Student");
      form.append("roll", studentProfile?.roll || studentProfile?.studentId || "");

      const assignmentId = submittingAssignment.id || submittingAssignment._id;
      const res = await fetch(`/backend/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit assignment.");
      }

      toast.success("Assignment submitted successfully!");
      setSubmittingAssignment(null);
      setSubmissionFile(null);
      setSubmissionComment("");
      fetchCourseAssignments();
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
    const totalHeld = attendanceStat?.totalHeld || attendanceStat?.totalClasses || 0;
    const attended = attendanceStat?.attended || attendanceStat?.presentCount || 0;
    const pct = totalHeld > 0 ? Math.round((attended / totalHeld) * 100) : 100;

    const submittedCount = assignments.filter((a) => a.mySubmission || a.submission).length;
    const gradedCount = assignments.filter((a) => {
      const sub = a.mySubmission || a.submission;
      return sub && sub.marks !== null && sub.marks !== undefined;
    }).length;

    return {
      noticesCount: notices.length,
      materialsCount: materials.length,
      assignmentsCount: assignments.length,
      submittedCount,
      gradedCount,
      totalHeld,
      attended,
      missed: Math.max(0, totalHeld - attended),
      attendancePct: pct,
      isCollegiate: pct >= 75,
      isNonCollegiate: pct >= 60 && pct < 75,
      isDiscollegiate: pct < 60 && totalHeld > 0,
    };
  }, [attendanceStat, notices, materials, assignments]);

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
              fetchCourseAttendance();
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

            {/* Attendance Status Banner */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2 min-w-[220px]">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-bold">My Attendance Rate</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  courseStats.isCollegiate
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : courseStats.isNonCollegiate
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                    : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                }`}>
                  {courseStats.isCollegiate ? "Collegiate (Eligible)" : courseStats.isNonCollegiate ? "Non-Collegiate" : "Discollegiate"}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{courseStats.attendancePct}%</span>
                <span className="text-xs text-slate-400">
                  ({courseStats.attended} of {courseStats.totalHeld} held)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${courseStats.attendancePct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-6 border-t border-white/10">
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

            {/* Card 4: Attendance */}
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

            {/* Card 5: Routine */}
            <div
              onClick={() => handleTabChange("schedule")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTabChange("schedule"); }}
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 transition-all cursor-pointer space-y-1 text-left col-span-2 sm:col-span-1"
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
                          <div className="space-y-1.5 text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Submitted</span>
                            </span>
                            {sub.filePath && (
                              <div>
                                <a
                                  href={`/backend/${sub.filePath}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <FileCheck className="w-3 h-3" />
                                  <span>View My Submitted Solution</span>
                                </a>
                              </div>
                            )}
                            {!isPastDeadline && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmittingAssignment(task);
                                  setSubmissionFile(null);
                                  setSubmissionComment("");
                                }}
                                className="mt-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 underline cursor-pointer"
                              >
                                Re-upload Solution
                              </button>
                            )}
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
                    courseStats.isCollegiate
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200"
                  }`}
                >
                  {courseStats.attendancePct}% Cumulative
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
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Classes Held</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{courseStats.totalHeld}</div>
              <span className="text-[10px] text-slate-400 font-medium">Recorded by teacher</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Classes Attended</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{courseStats.attended}</div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Present in session</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Missed Sessions</span>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{courseStats.missed}</div>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Unexcused absence</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Exam Status</span>
              <div className={`text-base font-black ${
                courseStats.isCollegiate ? "text-emerald-600" : courseStats.isNonCollegiate ? "text-amber-600" : "text-rose-600"
              }`}>
                {courseStats.isCollegiate ? "Collegiate (≥75%)" : courseStats.isNonCollegiate ? "Non-Collegiate (60-74%)" : "Discollegiate (<60%)"}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {courseStats.isCollegiate ? "Fully eligible for final exam" : "Requires board approval & fine"}
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
          SUBMISSION MODAL: UPLOAD ASSIGNMENT SOLUTION
          ════════════════════════════════════════════════════════════════ */}
      {submittingAssignment && (
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
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Submit Assignment Solution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {courseCode} • {submittingAssignment.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubmittingAssignment(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Solution Document (PDF, Word, or ZIP archive) *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
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
                  disabled={isSubmittingFile || !submissionFile}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingFile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingFile ? "Uploading Solution..." : "Upload & Submit Solution"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

