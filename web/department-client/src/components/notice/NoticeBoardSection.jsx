"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Plus,
  RefreshCw,
  Search,
  X,
  Globe,
  Lock,
  ArrowRight,
  Sparkles,
  BookOpen,
  GraduationCap,
  Building2,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import NoticeCard from "./NoticeCard";
import NoticeModal from "./NoticeModal";
import CourseNoticeModal from "./CourseNoticeModal";
import { SectionCollapseToggle, CollapsibleBody } from "@/components/dashboard/CollapsibleSection";
import { 
  SEMESTER_COURSES, 
  getCoursesBySemester, 
  getSemesterByCourseCode, 
  SEMESTER_LABELS 
} from "@/data/courses";

export default function NoticeBoardSection({
  isAdmin = false,
  userRole = "", // "teacher" | "student" | "admin" | ...
  studentSemester = null,
  studentCourses = [],
  teacherCourses = [],
  teacherProfile = null,
  title = "Department Notice Board",
  subtitle = "Official circulars, academic notices, and audio announcements for all department members.",
  defaultSection = "all", // "all" | "course" | "department"
  defaultFilter = "all",
  isCollapsed: controlledCollapsed,
  onToggle: controlledOnToggle,
  defaultCollapsed = false,
  onOpenCourseNotice = null,
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledOnToggle || (() => setInternalCollapsed(!internalCollapsed));

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Section switcher: "all" | "course" | "department"
  const [activeSection, setActiveSection] = useState(defaultSection);

  // Department notices visibility filter: "all" | "public" | "internal"
  const [deptFilterType, setDeptFilterType] = useState(defaultFilter);


  // Admin modal state (for department circulars)
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdminNotice, setEditingAdminNotice] = useState(null);

  // Course notice modal state (for course teachers)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourseNotice, setEditingCourseNotice] = useState(null);

  const isTeacher = userRole === "teacher" || (!userRole && (user?.role === "teacher" || user?.role === "faculty"));
  const isStudent = !isAdmin && (userRole === "student" || (!userRole && user?.role === "student"));

  // Resolve student enrolled semester (e.g. 7 or "7")
  const resolvedStudentSemester = useMemo(() => {
    if (!isStudent) return null;
    const raw = studentSemester ?? (userRole === "student" ? user?.semester : null);
    if (!raw) return null;
    const match = String(raw).match(/\d+/);
    return match ? String(parseInt(match[0], 10)) : null;
  }, [isStudent, studentSemester, userRole, user?.semester]);

  // Curriculum courses strictly for the student's semester
  const studentSemesterCourses = useMemo(() => {
    if (!resolvedStudentSemester) return [];
    if (studentCourses && studentCourses.length > 0) return studentCourses;
    return getCoursesBySemester(resolvedStudentSemester) || [];
  }, [resolvedStudentSemester, studentCourses]);

  const studentCourseCodesSet = useMemo(() => {
    return new Set(studentSemesterCourses.map((c) => c.code.toUpperCase().replace(/\s+/g, "")));
  }, [studentSemesterCourses]);

  // Fallback internal teacher routine courses if teacherCourses prop is not yet populated
  const [internalTeacherCourses, setInternalTeacherCourses] = useState([]);

  useEffect(() => {
    if (isTeacher && (!teacherCourses || teacherCourses.length === 0) && (user?.email || user?.name)) {
      const params = new URLSearchParams();
      if (user.email) params.set("email", user.email);
      if (user.name) params.set("teacherName", user.name);
      fetch(`/backend/api/teacher/routine?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((slots) => {
          if (Array.isArray(slots)) {
            const list = [];
            const seen = new Set();
            slots.forEach((s) => {
              if (s.courseCode && !seen.has(s.courseCode.toUpperCase())) {
                seen.add(s.courseCode.toUpperCase());
                list.push({ code: s.courseCode, title: s.courseTitle });
              }
            });
            setInternalTeacherCourses(list);
          }
        })
        .catch(() => {});
    }
  }, [isTeacher, teacherCourses, user?.email, user?.name]);

  const activeTeacherCourses = useMemo(() => {
    if (teacherCourses && teacherCourses.length > 0) return teacherCourses;
    return internalTeacherCourses;
  }, [teacherCourses, internalTeacherCourses]);

  const teacherCourseCodesSet = useMemo(() => {
    const set = new Set();
    (activeTeacherCourses || []).forEach((c) => {
      const code = c?.code || c?.courseCode;
      if (code) {
        set.add(String(code).toUpperCase().replace(/[\s-]/g, ""));
      }
    });
    return set;
  }, [activeTeacherCourses]);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/backend/api/notices", {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data?.notices) {
        setNotices(data.notices);
      } else {
        throw new Error(data.error || "Failed to load notices.");
      }
    } catch (err) {
      console.warn("[NoticeBoardSection] Fetch error:", err.message);
      toast.error("Could not load notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Listen to refresh events from elsewhere
  useEffect(() => {
    const handleRefresh = () => fetchNotices();
    window.addEventListener("refresh-notices", handleRefresh);
    return () => window.removeEventListener("refresh-notices", handleRefresh);
  }, [fetchNotices]);

  // Open publish modals
  const handleOpenCourseNotice = () => {
    if (onOpenCourseNotice) {
      onOpenCourseNotice();
    } else {
      setEditingCourseNotice(null);
      setIsCourseModalOpen(true);
    }
  };

  const handleOpenAdminNotice = () => {
    setEditingAdminNotice(null);
    setIsAdminModalOpen(true);
  };

  const handleEditNotice = (notice) => {
    if (notice.noticeType === "course" || notice.courseCode) {
      setEditingCourseNotice(notice);
      setIsCourseModalOpen(true);
    } else {
      setEditingAdminNotice(notice);
      setIsAdminModalOpen(true);
    }
  };

  const handleDelete = async (notice) => {
    const noticeId = notice.id || notice._id;
    if (!window.confirm(`Delete "${notice.title}"?`)) return;

    try {
      const res = await fetch(`/backend/api/notices/${noticeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Notice deleted.");
        setNotices((prev) => prev.filter((n) => (n.id || n._id) !== noticeId));
      } else {
        toast.error(data.error || "Failed to delete notice.");
      }
    } catch {
      toast.error("Network error deleting notice.");
    }
  };

  // Separate notices into Course Notices vs Department Administration Notices,
  // strictly scoping for students so they ONLY see notices for their related given semester and related courses
  const { scopedCourseNotices, scopedDeptNotices } = useMemo(() => {
    const rawCourses = [];
    const rawDept = [];

    (notices || []).forEach((n) => {
      const codeMatch = n.courseCode || n.title?.match(/\[?(CSE\s*\d{4})\]?/i)?.[1] || n.content?.match(/\[?(CSE\s*\d{4})\]?/i)?.[1];
      const isCourseNotice = n.noticeType === "course" || Boolean(n.courseCode) || Boolean(codeMatch);
      const cleanCode = n.courseCode || (codeMatch ? codeMatch.toUpperCase() : null);

      // Determine notice semester
      let noticeSem = n.semester ? String(n.semester).replace(/\D/g, "") : null;
      if (!noticeSem && cleanCode) {
        const semFromCode = getSemesterByCourseCode(cleanCode);
        if (semFromCode) noticeSem = String(semFromCode);
      }

      const noticeObj = {
        ...n,
        courseCode: cleanCode,
        noticeType: isCourseNotice ? "course" : "department",
        semester: noticeSem,
      };

      if (isCourseNotice) {
        rawCourses.push(noticeObj);
      } else {
        rawDept.push(noticeObj);
      }
    });

    if (isStudent && resolvedStudentSemester) {
      // User requirement:
      // "student can see notice not for all semester. Just see for their related given semester. And related courses of that semester."
      const studentCourses = rawCourses.filter((n) => {
        const noticeSem = n.semester ? String(n.semester).replace(/\D/g, "") : null;
        const normCode = n.courseCode ? n.courseCode.toUpperCase().replace(/\s+/g, "") : null;

        // If notice has an explicit semester and it doesn't match the student's semester, exclude
        if (noticeSem && noticeSem !== resolvedStudentSemester) {
          return false;
        }

        // If notice has a course code and that course belongs to a DIFFERENT semester, exclude
        if (normCode) {
          const semOfCode = getSemesterByCourseCode(normCode);
          if (semOfCode && String(semOfCode) !== resolvedStudentSemester) {
            return false;
          }
        }

        // Must match either the student's semester OR one of the student's semester courses
        const matchesSemester = noticeSem === resolvedStudentSemester;
        const matchesCourse = normCode && studentCourseCodesSet.has(normCode);

        return matchesSemester || matchesCourse;
      });

      const studentDept = rawDept.filter((n) => {
        // Exclude faculty/teacher-only announcements
        if (n.targetAudience === "teachers" || n.targetAudience === "faculty") {
          return false;
        }
        // If department circular specifies a target semester that is NOT this student's semester, exclude
        const deptSem = n.semester ? String(n.semester).replace(/\D/g, "") : null;
        if (deptSem && deptSem !== "all" && deptSem !== resolvedStudentSemester) {
          return false;
        }
        return true;
      });

      return { scopedCourseNotices: studentCourses, scopedDeptNotices: studentDept };
    }

    if (isTeacher) {
      // User requirement:
      // "for notice for giving in teacher panel for course, if any teacher give notice for course, another teacher can not seee it. It will be see by related course teacher and student."
      const teacherEmail = (teacherProfile?.email || user?.email || "").toLowerCase().trim();
      const teacherName = (teacherProfile?.name || user?.name || "").toLowerCase().trim();

      const myCourseNotices = rawCourses.filter((n) => {
        const normCode = n.courseCode ? n.courseCode.toUpperCase().replace(/[\s-]/g, "") : null;
        const authorEmail = (n.authorEmail || n.teacherEmail || "").toLowerCase().trim();
        const authorName = (n.authorName || "").toLowerCase().trim();

        // 1. Is this teacher assigned to this course in the routine?
        const teachesCourse = normCode && teacherCourseCodesSet.has(normCode);

        // 2. Did this teacher author/publish this course notice?
        const isAuthor =
          (teacherEmail && authorEmail && authorEmail === teacherEmail) ||
          (teacherName && authorName && authorName === teacherName);

        // Strict isolation: only related course teacher can see it
        return teachesCourse || isAuthor;
      });

      return { scopedCourseNotices: myCourseNotices, scopedDeptNotices: rawDept };
    }

    if (isAdmin) {
      // Admin sees all circulars
      return { scopedCourseNotices: rawCourses, scopedDeptNotices: rawDept };
    }

    // Public guests, employees: Course notices are private to course teachers and enrolled students
    return {
      scopedCourseNotices: [],
      scopedDeptNotices: rawDept.filter((n) => n.isPublic || user),
    };
  }, [
    notices,
    isStudent,
    isTeacher,
    isAdmin,
    resolvedStudentSemester,
    studentCourseCodesSet,
    teacherCourseCodesSet,
    teacherProfile,
    user,
  ]);

  // Filtered Course Notices (scoped to user role/semester, with search query filter)
  const filteredCourseNotices = useMemo(() => {
    return scopedCourseNotices.filter((n) => {
      // Keyword search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.authorName?.toLowerCase().includes(q) ||
        n.courseCode?.toLowerCase().includes(q) ||
        n.courseTitle?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      );
    });
  }, [scopedCourseNotices, searchQuery]);

  // Filtered Department Notices
  const filteredDeptNotices = useMemo(() => {
    return scopedDeptNotices.filter((n) => {
      // Visibility filter
      if (deptFilterType === "public" && !n.isPublic) return false;
      if (deptFilterType === "internal" && n.isPublic) return false;

      // Keyword search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.authorName?.toLowerCase().includes(q) ||
        n.originalName?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      );
    });
  }, [scopedDeptNotices, deptFilterType, searchQuery]);

  const totalCourseCount = scopedCourseNotices.length;
  const totalDeptCount = scopedDeptNotices.length;
  const totalNoticesCount = totalCourseCount + totalDeptCount;


  return (
    <div
      id="notices"
      className="p-6 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* ── Section Main Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            <span>Academic Circulars & Course Announcements</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
            <span>{title}</span>
            {totalNoticesCount > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {totalNoticesCount} Total
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={fetchNotices}
            disabled={loading}
            title="Refresh notice broadcasts"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Quick Course Notice Button for Teachers */}
          {isTeacher && (
            <button
              type="button"
              onClick={handleOpenCourseNotice}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all hover:scale-105 cursor-pointer"
              title="Publish a notice for your course students"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Give Course Notice</span>
            </button>
          )}

          {/* Admin Notice Publish Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdminNotice}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Admin Notice</span>
            </button>
          )}

          <SectionCollapseToggle
            isCollapsed={isCollapsed}
            onToggle={toggleCollapse}
            label={title}
          />
        </div>
      </div>

      <CollapsibleBody
        isCollapsed={isCollapsed}
        onExpand={toggleCollapse}
        sectionName={title}
      >
        <div className="space-y-6">
          {/* ── Section Navigation Tabs & Search Toolbar ──────────────── */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            {/* Section Switcher Tabs */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveSection("all")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "all"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-white/10"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Circulars</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {totalNoticesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("course")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "course"
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Course Notices (Given by Teacher)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSection === "course" ? "bg-white/20 text-white" : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                }`}>
                  {totalCourseCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("department")}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeSection === "department"
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                    : "text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Official Department Circulars</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeSection === "department" ? "bg-white/20 text-white" : "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                }`}>
                  {totalDeptCount}
                </span>
              </button>
            </div>

            {/* Keyword Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by headline, course, teacher, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: COURSE & ACADEMIC NOTICES (Given by Course Teacher) */}
          {/* ════════════════════════════════════════════════════════════ */}
          {(activeSection === "all" || activeSection === "course") && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-slate-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900/40 border border-indigo-100/90 dark:border-indigo-900/40 space-y-4">
              {/* Subsection Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-indigo-100/80 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Course & Academic Notices
                      </h3>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        Given by Course Teacher
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Direct circulars, homework alerts, lab announcements, and reschedule notices from subject instructors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Course Notices Cards Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3"
                    >
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredCourseNotices.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/70 dark:bg-slate-800/40 border border-dashed border-indigo-200 dark:border-indigo-900/40 space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    {isStudent && resolvedStudentSemester
                      ? `No Course Notices for Semester ${resolvedStudentSemester} Found`
                      : "No Course Notices Published Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? "No course notices found matching the search query."
                      : isStudent && resolvedStudentSemester
                        ? `When teachers for your Semester ${resolvedStudentSemester} courses post announcements or homework, they will appear here.`
                        : "Course instructors publish lecture cancellations, assignment instructions, and lab circulars here. Check back when teachers announce updates."}
                  </p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-700 transition"
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCourseNotices.map((notice, idx) => (
                    <NoticeCard
                      key={notice._id || notice.id || `course-notice-${idx}`}
                      notice={notice}
                      isAdmin={isAdmin}
                      onEdit={handleEditNotice}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: OFFICIAL DEPARTMENT NOTICES (Given by Dept Admin)  */}
          {/* ════════════════════════════════════════════════════════════ */}
          {(activeSection === "all" || activeSection === "department") && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50/80 via-sky-50/30 to-slate-50/50 dark:from-slate-900/50 dark:via-sky-950/10 dark:to-slate-900/30 border border-slate-200/80 dark:border-slate-800 space-y-4">
              {/* Subsection Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        Department Administration Circulars
                      </h3>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                        Official Admin Broadcast
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Official administrative circulars, exam controller directives, holiday orders, and public notifications.
                    </p>
                  </div>
                </div>

                {/* Visibility Filter Buttons */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDeptFilterType("all")}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      deptFilterType === "all"
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All ({totalDeptCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeptFilterType("public")}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      deptFilterType === "public"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-emerald-600"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeptFilterType("internal")}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      deptFilterType === "internal"
                        ? "bg-amber-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-amber-600"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Members Only</span>
                  </button>
                </div>
              </div>

              {/* Department Notices Cards Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3"
                    >
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : filteredDeptNotices.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white/70 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-2.5">
                  <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-500 mx-auto flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                    No Department Circulars Found
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? `No department circulars found matching "${searchQuery}".`
                      : "Official circulars and holiday notices from Department Administration will appear here."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDeptNotices.map((notice, idx) => (
                    <NoticeCard
                      key={notice._id || notice.id || `dept-notice-${idx}`}
                      notice={notice}
                      isAdmin={isAdmin}
                      onEdit={handleEditNotice}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleBody>

      {/* Admin Publish/Edit Modal for Department Circulars */}
      {isAdmin && (
        <NoticeModal
          isOpen={isAdminModalOpen}
          onClose={() => {
            setIsAdminModalOpen(false);
            setEditingAdminNotice(null);
          }}
          onNoticeSaved={fetchNotices}
          editingNotice={editingAdminNotice}
        />
      )}

      {/* Course Notice Modal for Teachers */}
      <CourseNoticeModal
        isOpen={isCourseModalOpen}
        onClose={() => {
          setIsCourseModalOpen(false);
          setEditingCourseNotice(null);
        }}
        onNoticeSaved={fetchNotices}
        teacherCourses={activeTeacherCourses}
        currentTeacher={teacherProfile || {
          name: user?.name,
          email: user?.email,
          designation: user?.role === "teacher" ? "Course Instructor" : "Faculty",
        }}
        editingNotice={editingCourseNotice}
      />
    </div>
  );
}
