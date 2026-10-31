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
  UploadCloud,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
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
  Eye,
  FileCheck,
  Send,
  MessageSquare,
  Share2,
  Copy,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle,
  BookMarked,
  Info,
  Flame,
  ArrowUpDown,
  Mail,
  CheckSquare,
  Square,
  Bell,
  Edit3,
  Save,
  CalendarCheck,
  History,
  Lock,
  Target
} from "lucide-react";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import Loading from "@/components/common/Loading";
import { SEMESTER_COURSES } from "@/data/courses";
import CourseNoticeModal from "@/components/notice/CourseNoticeModal";
import NoticeCard from "@/components/notice/NoticeCard";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

// Helper for Class Test UGC letter grading
const getCTGradeDetails = (score, max) => {
  if (score === null || score === undefined || !max || max <= 0) {
    return { letter: "Ungraded", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
  }
  const pct = (score / max) * 100;
  if (pct >= 80) return { letter: "A+", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
  if (pct >= 75) return { letter: "A", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
  if (pct >= 70) return { letter: "A-", color: "bg-indigo-50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" };
  if (pct >= 65) return { letter: "B+", color: "bg-indigo-50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" };
  if (pct >= 60) return { letter: "B", color: "bg-blue-50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
  if (pct >= 55) return { letter: "B-", color: "bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
  if (pct >= 50) return { letter: "C+", color: "bg-amber-50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
  if (pct >= 40) return { letter: "D", color: "bg-orange-50 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" };
  return { letter: "F", color: "bg-rose-50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800" };
};

export default function TeacherCourseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = decodeURIComponent(params?.courseCode || "");
  const courseCode = rawCode.trim().toUpperCase();

  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const user = sessionData?.user;

  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab");
  const validTabs = useMemo(() => ["notices", "attendance", "materials", "assignments", "class-tests", "schedule"], []);

  // Active Tab: "notices" | "attendance" | "materials" | "assignments" | "class-tests" | "schedule"
  const [activeTab, setActiveTab] = useState(() => (urlTab && validTabs.includes(urlTab) ? urlTab : "attendance"));

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

  // Course Details State
  const [course, setCourse] = useState(null);
  const [routineSlots, setRoutineSlots] = useState([]);
  const [isLoadingCourse, setIsLoadingCourse] = useState(true);

  // Instructor's other courses (for quick switcher)
  const [teacherCourses, setTeacherCourses] = useState([]);

  // Attendance State (Calculated individually for THIS course)
  const [rosterData, setRosterData] = useState(null);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "eligible" | "warning" | "risk"

  // Manual Roll-Call Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualTimeSlot, setManualTimeSlot] = useState("09:00 - 10:00");
  const [manualTopic, setManualTopic] = useState("");
  const [manualAttendanceMap, setManualAttendanceMap] = useState({}); // studentEmail -> boolean
  const [manualSearch, setManualSearch] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // Target Classes Modal State
  const [showEditClassesModal, setShowEditClassesModal] = useState(false);
  const [plannedClassesInput, setPlannedClassesInput] = useState("");
  const [isSavingPlannedClasses, setIsSavingPlannedClasses] = useState(false);

  // Past Session Inspection Modal
  const [inspectedSession, setInspectedSession] = useState(null);
  const [sessionSearch, setSessionSearch] = useState("");
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // Live Attendance Session State
  const [isStartingLive, setIsStartingLive] = useState(false);

  // Materials State (Specifically for this course)
  const [materials, setMaterials] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialCategory, setMaterialCategory] = useState("all");
  const [materialForm, setMaterialForm] = useState({
    title: "",
    type: "Lecture Slides (PDF)",
    description: "",
  });
  const [materialFile, setMaterialFile] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [materialSearch, setMaterialSearch] = useState("");

  // Assignments State (Specifically for this course)
  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState("all"); // "all" | "active" | "closed"
  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    deadline: "",
    totalMarks: 20,
  });
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Submissions & Class Roster Review Modal State (Roll-wise grading)
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [assignmentRoster, setAssignmentRoster] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState("all"); // "all" | "submitted" | "pending-submission" | "graded" | "pending-grade"
  const [gradingStudentKey, setGradingStudentKey] = useState(null);
  const [gradeInput, setGradeInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Course Announcement Modal & Notices State
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [courseNotices, setCourseNotices] = useState([]);
  const [isNoticesLoading, setIsNoticesLoading] = useState(true);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [isPublishingNotice, setIsPublishingNotice] = useState(false);

  // Class Tests (CT) & Offline Marks State
  const [classTests, setClassTests] = useState([]);
  const [isClassTestsLoading, setIsClassTestsLoading] = useState(true);
  const [showCTModal, setShowCTModal] = useState(false);
  const [editingCT, setEditingCT] = useState(null);
  const [ctForm, setCTForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    totalMarks: 20,
    topic: "",
    room: "",
  });
  const [isSavingCT, setIsSavingCT] = useState(false);

  // Roll-Wise Marks Entry Modal States
  const [activeCTForGrading, setActiveCTForGrading] = useState(null);
  const [gradingMarksMap, setGradingMarksMap] = useState([]);
  const [gradingSearch, setGradingSearch] = useState("");
  const [isSavingCTMarks, setIsSavingCTMarks] = useState(false);

  // Course Sessions History Inspector Modal
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [sessionHistoryFilter, setSessionHistoryFilter] = useState("all");

  // ── 1. FETCH COURSE INFO & SCHEDULE ──────────────────────────
  const fetchCourseDetails = useCallback(async () => {
    setIsLoadingCourse(true);
    try {
      const res = await fetch(`/backend/api/courses/code/${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.course) {
          setCourse(data.course);
        }
        if (data.routineSlots) {
          setRoutineSlots(data.routineSlots);
          if (data.routineSlots.length > 0 && data.routineSlots[0].timeSlot) {
            setManualTimeSlot(data.routineSlots[0].timeSlot);
          }
        }
      } else {
        // Fallback default course object
        setCourse({
          code: courseCode,
          title: `${courseCode} Course Module`,
          credits: 3.0,
          semester: "Semester 7",
          semesterNum: 7,
        });
      }
    } catch (e) {
      console.warn("Could not fetch course details:", e);
      setCourse({
        code: courseCode,
        title: `${courseCode} Course Module`,
        credits: 3.0,
        semester: "Semester 7",
        semesterNum: 7,
      });
    } finally {
      setIsLoadingCourse(false);
    }
  }, [courseCode]);

  // ── 2. FETCH TEACHER'S ASSIGNED COURSES (FOR QUICK SWITCHER) ──
  const fetchTeacherCourses = useCallback(async () => {
    if (!user?.name && !user?.email) return;
    try {
      const params = new URLSearchParams();
      if (user.name) params.set("teacherName", user.name);
      if (user.email) params.set("email", user.email);
      const res = await fetch(`/backend/api/teacher/routine?${params.toString()}`);
      if (res.ok) {
        const slots = await res.json();
        const unique = [];
        const seen = new Set();
        (slots || []).forEach((s) => {
          if (s.courseCode && !seen.has(s.courseCode)) {
            seen.add(s.courseCode);
            unique.push({
              code: s.courseCode,
              title: s.courseTitle || s.courseCode,
              semester: s.semester,
            });
          }
        });
        setTeacherCourses(unique);
      }
    } catch (e) {
      console.warn("Could not fetch teacher courses for switcher:", e);
    }
  }, [user?.name, user?.email]);

  // ── 3. FETCH ATTENDANCE ROSTER SPECIFIC TO THIS COURSE ────────
  const fetchCourseRoster = useCallback(async (showFeedback = false) => {
    setIsRosterLoading(true);
    try {
      const semesterNum = course?.semesterNum || 7;
      const res = await fetch(
        `/backend/api/attendance/teacher/roster-report?courseCode=${encodeURIComponent(courseCode)}&semester=${semesterNum}`
      );
      if (res.ok) {
        const data = await res.json();
        setRosterData(data);
        if (showFeedback) toast.success("Attendance roster synchronized!");
      } else {
        throw new Error("Failed to load roster");
      }
    } catch (e) {
      console.warn("Could not fetch course roster:", e);
      if (showFeedback) toast.error("Could not sync course attendance.");
    } finally {
      setIsRosterLoading(false);
    }
  }, [courseCode, course?.semesterNum]);

  // ── 4. FETCH STUDY MATERIALS FOR THIS COURSE ──────────────────
  const fetchCourseMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const res = await fetch(`/backend/api/materials?course=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (e) {
      console.warn("Could not fetch materials:", e);
    } finally {
      setMaterialsLoading(false);
    }
  }, [courseCode]);

  // ── 5. FETCH ASSIGNMENTS FOR THIS COURSE ──────────────────────
  const fetchCourseAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const res = await fetch(`/backend/api/assignments?courseCode=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setAssignments(data.assignments || []);
      }
    } catch (e) {
      console.warn("Could not fetch assignments:", e);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courseCode]);

  // ── 6. FETCH NOTICES FOR THIS COURSE ─────────────────────────
  const fetchCourseNotices = useCallback(async () => {
    setIsNoticesLoading(true);
    try {
      const res = await fetch(`/backend/api/notices?courseCode=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setCourseNotices(data.notices || []);
      }
    } catch (e) {
      console.warn("Could not fetch course notices:", e);
    } finally {
      setIsNoticesLoading(false);
    }
  }, [courseCode]);

  // ── 7. FETCH CLASS TESTS (CT) FOR THIS COURSE ─────────────────
  const fetchCourseClassTests = useCallback(async () => {
    setIsClassTestsLoading(true);
    try {
      const res = await fetch(`/backend/api/class-tests?courseCode=${encodeURIComponent(courseCode)}`);
      if (res.ok) {
        const data = await res.json();
        setClassTests(data.classTests || []);
      }
    } catch (e) {
      console.warn("Could not fetch course class tests:", e);
    } finally {
      setIsClassTestsLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    if (courseCode) {
      fetchCourseDetails();
      fetchCourseMaterials();
      fetchCourseAssignments();
      fetchCourseNotices();
      fetchCourseClassTests();
      fetchTeacherCourses();
    }
  }, [courseCode, fetchCourseDetails, fetchCourseMaterials, fetchCourseAssignments, fetchCourseNotices, fetchCourseClassTests, fetchTeacherCourses]);

  // Listen for global notice refresh events
  useEffect(() => {
    const handleRefreshNotices = () => {
      fetchCourseNotices();
    };
    window.addEventListener("refresh-notices", handleRefreshNotices);
    return () => window.removeEventListener("refresh-notices", handleRefreshNotices);
  }, [fetchCourseNotices]);

  useEffect(() => {
    if (course) {
      fetchCourseRoster();
    }
  }, [course, fetchCourseRoster]);

  useEffect(() => {
    if (course?.totalClasses !== undefined && course?.totalClasses !== null && !isNaN(Number(course.totalClasses))) {
      setPlannedClassesInput(String(course.totalClasses));
    } else if (rosterData?.totalPlannedClasses !== undefined && rosterData?.totalPlannedClasses !== null && !isNaN(Number(rosterData.totalPlannedClasses))) {
      setPlannedClassesInput(String(rosterData.totalPlannedClasses));
    } else {
      setPlannedClassesInput("");
    }
  }, [course?.totalClasses, rosterData?.totalPlannedClasses]);

  // ── UPDATE TARGET TOTAL CLASSES ─────────────────────────────
  const handleUpdatePlannedClasses = async (targetCount) => {
    const rawVal = targetCount !== undefined ? targetCount : plannedClassesInput;
    const isReset = rawVal === "" || rawVal === null || rawVal === "0" || Number(rawVal) === 0;
    const count = isReset ? null : parseInt(rawVal, 10);

    if (!isReset && (isNaN(count) || count < 1 || count > 300)) {
      toast.error("Please enter a valid target classes count between 1 and 300.");
      return;
    }

    setIsSavingPlannedClasses(true);
    try {
      const res = await fetch(`/backend/api/courses/code/${encodeURIComponent(courseCode)}/classes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalClasses: count }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update target classes");
      }
      toast.success(data.message || (count ? `Target classes updated to ${count} classes!` : "Target classes reset."));
      setCourse((prev) => (prev ? { ...prev, totalClasses: count } : null));
      setRosterData((prev) => (prev ? { ...prev, totalPlannedClasses: count } : null));
      setShowEditClassesModal(false);
      fetchCourseRoster(false);
      fetchCourseDetails();
    } catch (err) {
      console.error("Error updating target classes:", err);
      toast.error(err.message || "Failed to update target classes");
    } finally {
      setIsSavingPlannedClasses(false);
    }
  };

  // ── MANUAL ATTENDANCE (ROLL CALL) HANDLERS ────────────────────
  const handleOpenManualModal = () => {
    if (!rosterData?.roster || rosterData.roster.length === 0) {
      toast.error("No enrolled students found for this course semester yet.");
      return;
    }
    const map = {};
    rosterData.roster.forEach((stu) => {
      // Default to true (present)
      map[stu.email] = true;
    });
    setManualAttendanceMap(map);
    setManualSearch("");
    setShowManualModal(true);
  };

  const handleToggleManualStudent = (email) => {
    setManualAttendanceMap((prev) => ({
      ...prev,
      [email]: !prev[email],
    }));
  };

  const handleMarkAllManual = (status) => {
    if (!rosterData?.roster) return;
    const map = {};
    rosterData.roster.forEach((stu) => {
      map[stu.email] = status;
    });
    setManualAttendanceMap(map);
  };

  const handleInvertManual = () => {
    if (!rosterData?.roster) return;
    setManualAttendanceMap((prev) => {
      const next = {};
      rosterData.roster.forEach((stu) => {
        next[stu.email] = !prev[stu.email];
      });
      return next;
    });
  };

  const handleSaveManualSession = async (e) => {
    e.preventDefault();
    if (!manualDate) {
      toast.error("Please pick a session date.");
      return;
    }
    setIsSavingManual(true);
    try {
      const records = (rosterData?.roster || []).map((stu) => ({
        studentEmail: stu.email,
        studentId: stu.studentId,
        studentName: stu.name,
        present: Boolean(manualAttendanceMap[stu.email]),
      }));

      const payload = {
        courseCode,
        semester: course?.semesterNum || 7,
        sessionDate: manualDate,
        timeSlot: manualTimeSlot,
        topic: manualTopic.trim(),
        records,
        teacherName: user?.name || "Course Instructor",
        teacherEmail: user?.email || "",
      };

      const res = await fetch("/backend/api/attendance/teacher/manual-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Class attendance recorded for ${manualDate}!`);
        setShowManualModal(false);
        setManualTopic("");
        fetchCourseRoster();
      } else {
        toast.error(data.error || "Failed to record attendance session");
      }
    } catch {
      toast.error("Network error while recording attendance");
    } finally {
      setIsSavingManual(false);
    }
  };

  // Quick single-student status toggle
  const handleToggleSingleStudent = async (student, session) => {
    const isCurrentlyPresent = session.status === "present";
    const nextPresent = !isCurrentlyPresent;

    try {
      const res = await fetch("/backend/api/attendance/teacher/toggle-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: session.sessionKey,
          studentEmail: student.email,
          studentId: student.studentId,
          studentName: student.name,
          courseCode,
          sessionDate: session.date,
          timeSlot: session.timeSlot,
          present: nextPresent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${student.name} marked as ${nextPresent ? "Present" : "Absent"}`);
        fetchCourseRoster();
      } else {
        toast.error(data.error || "Could not toggle attendance");
      }
    } catch {
      toast.error("Network error updating attendance");
    }
  };

  // Delete Conducted Session
  const handleDeleteSession = async (sessionKey) => {
    if (!window.confirm("Are you sure you want to delete this recorded attendance session? This will remove attendance records for all students on this date.")) {
      return;
    }
    setIsDeletingSession(true);
    try {
      const res = await fetch(`/backend/api/attendance/teacher/session/${encodeURIComponent(sessionKey)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Attendance session deleted successfully.");
        setInspectedSession(null);
        fetchCourseRoster();
      } else {
        toast.error(data.error || "Failed to delete session");
      }
    } catch {
      toast.error("Network error deleting session");
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Start Live Geofence Session
  const handleStartLiveSession = async (routineId) => {
    setIsStartingLive(true);
    try {
      const rId = routineId || routineSlots[0]?._id;
      if (!rId) {
        toast.error("No routine slot linked for live window. Please use Record Attendance (Roll Call).");
        setIsStartingLive(false);
        return;
      }

      const res = await fetch("/backend/api/attendance/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routineId: rId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || `Check-in window open for ${courseCode}!`);
        fetchCourseRoster();
      } else {
        toast.error(data.message || data.error || "Could not open live session (check class hour)");
      }
    } catch {
      toast.error("Network error starting live attendance");
    } finally {
      setIsStartingLive(false);
    }
  };

  // Export Attendance to CSV
  const handleExportAttendanceCSV = () => {
    if (!rosterData?.roster || rosterData.roster.length === 0) {
      toast.error("No student attendance data available to export.");
      return;
    }

    const sessions = rosterData.sessions || [];
    const headers = [
      "Student ID",
      "Student Name",
      "Email",
      "Attended Classes",
      courseStats.targetClasses ? "Target Classes" : "Total Held",
      ...(courseStats.targetClasses ? ["Conducted Sessions"] : []),
      "Attendance %",
      "Eligibility Status",
      ...sessions.map((s) => `${s.date} (${s.timeSlot})`),
    ];

    const rows = rosterData.roster.map((stu) => {
      const isEligible = stu.percentage >= 75;
      const isWarning = stu.percentage >= 60 && stu.percentage < 75;
      const statusText = isEligible ? "Eligible (>=75%)" : isWarning ? "Collegiate (60-74%)" : "Non-Collegiate (<60%)";

      const sessionStatuses = sessions.map((s) => {
        const found = (stu.history || []).find((h) => h.sessionKey === s.sessionKey);
        return found?.status === "present" ? "P" : "A";
      });

      return [
        `"${stu.studentId}"`,
        `"${stu.name}"`,
        `"${stu.email}"`,
        stu.attendedCount,
        courseStats.targetClasses ? courseStats.targetClasses : stu.totalSessions,
        ...(courseStats.targetClasses ? [stu.totalSessions] : []),
        `${stu.percentage}%`,
        `"${statusText}"`,
        ...sessionStatuses,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Attendance_${courseCode.replace(/\s+/g, "_")}_Sem${course?.semesterNum || 7}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance sheet exported as CSV successfully!");
  };

  // Copy At-Risk Students Emails
  const handleCopyAtRiskEmails = () => {
    const atRisk = (rosterData?.roster || []).filter((s) => s.percentage < 75);
    if (atRisk.length === 0) {
      toast.success("All students are currently meeting the 75% attendance threshold! 🎉");
      return;
    }
    const emails = atRisk.map((s) => s.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(emails);
    toast.success(`Copied ${atRisk.length} at-risk student email(s) to clipboard!`, { duration: 5000 });
  };

  // ── MATERIAL HANDLERS ─────────────────────────────────────────
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title.trim()) {
      toast.error("Please enter material title.");
      return;
    }
    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("title", materialForm.title.trim());
      formData.append("course", courseCode);
      formData.append("type", materialForm.type);
      formData.append("semester", String(course?.semesterNum || 7));
      formData.append("teacherName", user?.name || "Course Instructor");
      formData.append("teacherEmail", user?.email || "");
      if (materialForm.description) {
        formData.append("description", materialForm.description.trim());
      }
      if (materialFile) {
        formData.append("file", materialFile);
      }

      const res = await fetch("/backend/api/materials", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Study material uploaded to this course!");
        setShowMaterialModal(false);
        setMaterialForm({ title: "", type: "Lecture Slides (PDF)", description: "" });
        setMaterialFile(null);
        fetchCourseMaterials();
      } else {
        toast.error(data.error || "Failed to upload study material");
      }
    } catch {
      toast.error("Network error uploading material");
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Are you sure you want to delete this study material?")) return;
    try {
      const res = await fetch(`/backend/api/materials/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Material deleted.");
        setMaterials((prev) => prev.filter((m) => (m._id || m.id) !== id));
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Network error deleting material");
    }
  };

  const handleCopyMaterialLink = (mat) => {
    const url = mat.filePath?.startsWith("http") ? mat.filePath : `${SERVER_URL}${mat.filePath}`;
    navigator.clipboard.writeText(url);
    toast.success("Resource link copied to clipboard!");
  };

  // ── ASSIGNMENT HANDLERS ───────────────────────────────────────
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title.trim() || !assignmentForm.deadline) {
      toast.error("Please enter title and submission deadline.");
      return;
    }
    setCreatingAssignment(true);
    try {
      const formData = new FormData();
      formData.append("title", assignmentForm.title.trim());
      formData.append("description", assignmentForm.description.trim());
      formData.append("courseCode", courseCode);
      formData.append("courseTitle", course?.title || courseCode);
      formData.append("semester", String(course?.semesterNum || 7));
      formData.append("deadline", assignmentForm.deadline);
      formData.append("totalMarks", String(assignmentForm.totalMarks || 20));
      formData.append("teacherName", user?.name || "Course Instructor");
      formData.append("teacherEmail", user?.email || "");
      if (assignmentFile) {
        formData.append("file", assignmentFile);
      }

      const res = await fetch("/backend/api/assignments", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Assignment published for enrolled students!");
        setShowAssignmentModal(false);
        setAssignmentForm({ title: "", description: "", deadline: "", totalMarks: 20 });
        setAssignmentFile(null);
        fetchCourseAssignments();
      } else {
        toast.error(data.error || "Failed to create assignment");
      }
    } catch {
      toast.error("Network error creating assignment");
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment and all its submissions?")) return;
    try {
      const res = await fetch(`/backend/api/assignments/${id}`, { method: "DELETE" });
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
    setSelectedAssignment(assignment);
    setSubmissionsLoading(true);
    setSubmissionSearch("");
    setSubmissionFilter("all");
    setGradingStudentKey(null);
    setGradeInput("");
    setFeedbackInput("");
    try {
      const res = await fetch(`/backend/api/assignments/${assignment._id || assignment.id}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
        setAssignmentRoster(data.roster || []);
      } else {
        setSubmissions([]);
        setAssignmentRoster([]);
      }
    } catch {
      toast.error("Could not fetch student submissions");
      setSubmissions([]);
      setAssignmentRoster([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleSaveGrade = async (targetStudent) => {
    if (gradeInput === "") {
      toast.error("Please enter awarded marks");
      return;
    }
    const num = Number(gradeInput);
    const maxMarks = selectedAssignment?.totalMarks || 20;
    if (isNaN(num) || num < 0 || num > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    setIsSavingGrade(true);
    try {
      let res;
      if (targetStudent.submissionId) {
        res = await fetch(`/backend/api/assignments/submissions/${targetStudent.submissionId}/grade`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marks: num, feedback: feedbackInput }),
        });
      } else {
        const assignmentId = selectedAssignment._id || selectedAssignment.id;
        res = await fetch(`/backend/api/assignments/${assignmentId}/grade-student`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: targetStudent.studentId,
            studentName: targetStudent.studentName,
            studentEmail: targetStudent.studentEmail,
            marks: num,
            feedback: feedbackInput,
          }),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Marks saved for Roll ${targetStudent.studentId || targetStudent.studentName}!`);

        // Update roster locally
        setAssignmentRoster((prev) =>
          prev.map((s) => {
            if (s.studentId === targetStudent.studentId || (targetStudent.submissionId && s.submissionId === targetStudent.submissionId)) {
              return {
                ...s,
                marks: num,
                feedback: feedbackInput,
                status: "graded",
                hasSubmitted: true,
                submissionId: s.submissionId || data.submission?._id,
              };
            }
            return s;
          })
        );

        // Update submissions list locally
        setSubmissions((prev) => {
          const exists = prev.some((s) => s.studentId === targetStudent.studentId);
          if (exists) {
            return prev.map((s) =>
              s.studentId === targetStudent.studentId
                ? { ...s, marks: num, feedback: feedbackInput, status: "graded" }
                : s
            );
          }
          if (data.submission) {
            return [...prev, data.submission];
          }
          return prev;
        });

        fetchCourseAssignments();
        setGradingStudentKey(null);
        setGradeInput("");
        setFeedbackInput("");
      } else {
        toast.error(data.error || "Failed to save grade");
      }
    } catch {
      toast.error("Network error while grading");
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Export Assignment Grades to CSV (Complete Roll-wise Class Roster with UTF-8 BOM)
  const handleExportGradesCSV = () => {
    const list = assignmentRoster.length > 0 ? assignmentRoster : submissions;
    if (!selectedAssignment || list.length === 0) {
      toast.error("No class roster or submissions available to export.");
      return;
    }

    const maxMarks = selectedAssignment.totalMarks || 20;
    const headers = [
      "Roll Number",
      "Student Name",
      "Email",
      "Batch",
      "Semester",
      "Course Code",
      "Assignment Title",
      "Submission Status",
      "Submitted Date",
      `Marks Obtained (Max ${maxMarks})`,
      "Total Marks",
      "Percentage (%)",
      "Letter Grade",
      "Instructor Feedback",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Sort submissions roll-wise ascending
    const sorted = [...list].sort((a, b) => {
      const rollA = parseInt(String(a.studentId || "").replace(/\D/g, ""), 10);
      const rollB = parseInt(String(b.studentId || "").replace(/\D/g, ""), 10);
      if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) return rollA - rollB;
      return String(a.studentId || a.studentName || "").localeCompare(String(b.studentId || b.studentName || ""));
    });

    const getGradeLetter = (score, max) => {
      if (score === null || score === undefined || !max) return "Ungraded";
      const pct = (score / max) * 100;
      if (pct >= 80) return "A+";
      if (pct >= 75) return "A";
      if (pct >= 70) return "A-";
      if (pct >= 65) return "B+";
      if (pct >= 60) return "B";
      if (pct >= 55) return "B-";
      if (pct >= 50) return "C+";
      if (pct >= 40) return "D";
      return "F";
    };

    const rows = sorted.map((s) => {
      const roll = s.studentId || "N/A";
      const name = s.studentName || "Student";
      const email = s.studentEmail || "";
      const batch = s.batch || "";
      const semester = s.semester || course?.semesterNum || "";
      const status = s.hasSubmitted ? (s.isLate ? "Submitted Late" : "Submitted On Time") : "Not Submitted";
      const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleString("en-US", { timeZone: "Asia/Dhaka" }) : "N/A";
      const marks = s.marks !== null && s.marks !== undefined ? s.marks : "";
      const pct = marks !== "" ? `${Math.round((Number(marks) / maxMarks) * 100)}%` : "";
      const grade = marks !== "" ? getGradeLetter(Number(marks), maxMarks) : "Ungraded";
      const feedback = s.feedback || "";

      return [
        escapeCsv(roll),
        escapeCsv(name),
        escapeCsv(email),
        escapeCsv(batch),
        escapeCsv(semester),
        escapeCsv(courseCode),
        escapeCsv(selectedAssignment.title),
        escapeCsv(status),
        escapeCsv(dateStr),
        escapeCsv(marks),
        escapeCsv(maxMarks),
        escapeCsv(pct),
        escapeCsv(grade),
        escapeCsv(feedback),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanCourse = courseCode.replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanTitle = (selectedAssignment.title || "Assignment").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.href = url;
    link.download = `${cleanCourse}_${cleanTitle}_Grades_RollWise.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Roll-wise class roster & assignment grades exported as CSV!");
  };

  // ── COURSE NOTICE ACTION HANDLERS ───────────────────────────
  const handleCreateNotice = () => {
    setEditingNotice(null);
    setShowNoticeModal(true);
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setShowNoticeModal(true);
  };

  const handleDeleteNotice = async (notice) => {
    const id = notice.id || notice._id;
    if (!id) return;
    if (!window.confirm(`Are you sure you want to remove the course notice "${notice.title}"?`)) return;
    try {
      const res = await fetch(`/backend/api/notices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Course notice removed");
        fetchCourseNotices();
        window.dispatchEvent(new CustomEvent("refresh-notices"));
      } else {
        toast.error(data.error || "Failed to delete notice");
      }
    } catch {
      toast.error("Network error removing notice");
    }
  };

  // ── STRICT COURSE TEACHER PERMISSION CHECK ──────────────────
  // User requirement:
  // "for notice for giving in teacher panel for course, if any teacher give notice for course, another teacher can not seee it. It will be see by related course teacher and student."
  const isRelatedTeacher = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin" || (user.email || "").toLowerCase().trim() === "admin@cse.edu") {
      return true;
    }

    const normTargetCode = courseCode.replace(/[\s-]/g, "").toUpperCase();
    const userEmail = (user.email || "").toLowerCase().trim();
    const userName = (user.name || "").toLowerCase().trim();

    // 1. Is this course in the teacher's assigned routine courses?
    const hasInRoutineCourses = (teacherCourses || []).some((c) => {
      const code = c?.code || c?.courseCode;
      return code && String(code).replace(/[\s-]/g, "").toUpperCase() === normTargetCode;
    });
    if (hasInRoutineCourses) return true;

    // 2. Is this teacher assigned to any routine slot for this course?
    const hasInRoutineSlots = (routineSlots || []).some((slot) => {
      const slotEmail = (slot.teacherEmail || "").toLowerCase().trim();
      const slotName = (slot.teacherName || "").toLowerCase().trim();
      return (userEmail && slotEmail === userEmail) || (userName && slotName === userName);
    });
    if (hasInRoutineSlots) return true;

    // 3. Is this teacher listed in the course faculty field?
    if (course?.faculty) {
      const fac = String(course.faculty).toLowerCase();
      if ((userName && fac.includes(userName)) || (userEmail && fac.includes(userEmail))) {
        return true;
      }
    }

    // 4. Did this teacher author any notice for this course?
    const hasAuthoredNotice = (courseNotices || []).some((n) => {
      const aEmail = (n.authorEmail || n.teacherEmail || "").toLowerCase().trim();
      const aName = (n.authorName || "").toLowerCase().trim();
      return (userEmail && aEmail === userEmail) || (userName && aName === userName);
    });
    if (hasAuthoredNotice) return true;

    return false;
  }, [user, courseCode, teacherCourses, routineSlots, course?.faculty, courseNotices]);

  const filteredCourseNotices = useMemo(() => {
    // If not a related course teacher, another teacher cannot view course notices
    if (!isRelatedTeacher) return [];
    if (!noticeSearch.trim()) return courseNotices;
    const q = noticeSearch.toLowerCase();
    return courseNotices.filter((n) =>
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.category?.toLowerCase().includes(q)
    );
  }, [isRelatedTeacher, courseNotices, noticeSearch]);

  // ── CLASS TEST (CT) ACTION HANDLERS ─────────────────────────
  const handleOpenCreateCT = () => {
    setEditingCT(null);
    const nextNum = classTests.length + 1;
    setCTForm({
      title: `Class Test ${nextNum}`,
      date: new Date().toISOString().split("T")[0],
      totalMarks: 20,
      topic: "",
      room: routineSlots[0]?.roomNo || "Room 407",
    });
    setShowCTModal(true);
  };

  const handleOpenEditCT = (ct) => {
    setEditingCT(ct);
    setCTForm({
      title: ct.title || "",
      date: ct.date || new Date().toISOString().split("T")[0],
      totalMarks: ct.totalMarks || 20,
      topic: ct.topic || "",
      room: ct.room || "",
    });
    setShowCTModal(true);
  };

  const handleSaveCT = async (e) => {
    e.preventDefault();
    if (!ctForm.title.trim()) {
      toast.error("Please enter a Class Test title.");
      return;
    }
    const marksNum = Number(ctForm.totalMarks);
    if (isNaN(marksNum) || marksNum <= 0) {
      toast.error("Please enter valid total marks (greater than 0).");
      return;
    }

    setIsSavingCT(true);
    try {
      const url = editingCT ? `/backend/api/class-tests/${editingCT.id || editingCT._id}` : "/backend/api/class-tests";
      const method = editingCT ? "PUT" : "POST";
      const payload = {
        title: ctForm.title.trim(),
        courseCode,
        courseTitle: course?.title || `${courseCode} Module`,
        semester: String(course?.semesterNum || 7),
        date: ctForm.date,
        totalMarks: marksNum,
        topic: ctForm.topic.trim(),
        room: ctForm.room.trim(),
        teacherName: user?.name || "Course Instructor",
        teacherEmail: user?.email || "",
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save class test.");
      }
      toast.success(editingCT ? "Class test updated!" : "Class test created!");
      setShowCTModal(false);
      fetchCourseClassTests();
    } catch (err) {
      toast.error(err.message || "Network error saving class test.");
    } finally {
      setIsSavingCT(false);
    }
  };

  const handleDeleteCT = async (ct) => {
    if (!window.confirm(`Are you sure you want to delete "${ct.title}"? All entered student marks for this test will be removed.`)) return;
    try {
      const res = await fetch(`/backend/api/class-tests/${ct.id || ct._id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Class test deleted.");
        fetchCourseClassTests();
      } else {
        toast.error(data.error || "Failed to delete class test.");
      }
    } catch {
      toast.error("Network error deleting class test.");
    }
  };

  // Open Roll-Wise Marks Entry Interface
  const handleOpenGradingModal = async (ct) => {
    setActiveCTForGrading(ct);
    setGradingSearch("");

    const existingMarks = Array.isArray(ct.marks) ? ct.marks : [];
    const existingMap = new Map();
    existingMarks.forEach((m) => {
      if (m.studentId) existingMap.set(String(m.studentId).trim(), m);
      if (m.studentEmail) existingMap.set(String(m.studentEmail).trim().toLowerCase(), m);
    });

    let rosterStudents = rosterData?.roster || [];
    if (rosterStudents.length === 0) {
      try {
        const semesterNum = course?.semesterNum || 7;
        const res = await fetch(
          `/backend/api/attendance/teacher/roster-report?courseCode=${encodeURIComponent(courseCode)}&semester=${semesterNum}`
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roster) && data.roster.length > 0) {
            rosterStudents = data.roster;
            setRosterData(data);
          }
        }
      } catch (err) {
        console.warn("Could not fetch roster for CT grading:", err);
      }
    }

    const merged = [];
    const seenRolls = new Set();

    if (rosterStudents.length > 0) {
      rosterStudents.forEach((stu) => {
        const roll = String(stu.studentId || "").trim();
        const email = String(stu.email || "").trim().toLowerCase();
        const existing = (roll ? existingMap.get(roll) : null) || (email ? existingMap.get(email) : null);
        if (roll) seenRolls.add(roll);
        merged.push({
          studentId: stu.studentId || "",
          studentName: stu.name || existing?.studentName || "Student",
          studentEmail: stu.email || existing?.studentEmail || "",
          marks: existing && existing.marks !== null && existing.marks !== undefined ? String(existing.marks) : "",
          isAbsent: Boolean(existing?.isAbsent),
          remarks: existing?.remarks || "",
        });
      });
    }

    existingMarks.forEach((m) => {
      const roll = String(m.studentId || "").trim();
      if (roll && !seenRolls.has(roll)) {
        seenRolls.add(roll);
        merged.push({
          studentId: m.studentId || "",
          studentName: m.studentName || "Student",
          studentEmail: m.studentEmail || "",
          marks: m.marks !== null && m.marks !== undefined ? String(m.marks) : "",
          isAbsent: Boolean(m.isAbsent),
          remarks: m.remarks || "",
        });
      }
    });

    merged.sort((a, b) => {
      const numA = parseInt(a.studentId, 10);
      const numB = parseInt(b.studentId, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return (a.studentId || "").localeCompare(b.studentId || "");
    });

    setGradingMarksMap(merged);
  };

  // Save All Roll-Wise Marks
  const handleSaveAllCTMarks = async () => {
    if (!activeCTForGrading) return;
    setIsSavingCTMarks(true);
    try {
      const maxAllowed = Number(activeCTForGrading.totalMarks) || 20;
      const formatted = gradingMarksMap.map((entry) => ({
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentEmail: entry.studentEmail,
        marks: entry.isAbsent
          ? 0
          : entry.marks !== "" && !isNaN(Number(entry.marks))
          ? Math.min(Number(entry.marks), maxAllowed)
          : null,
        isAbsent: Boolean(entry.isAbsent),
        remarks: entry.remarks || "",
      }));

      const res = await fetch(`/backend/api/class-tests/${activeCTForGrading.id || activeCTForGrading._id}/marks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marks: formatted }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save marks.");
      }
      toast.success(`Marks recorded for ${formatted.length} students!`);
      setActiveCTForGrading(null);
      fetchCourseClassTests();
    } catch (err) {
      toast.error(err.message || "Network error saving marks.");
    } finally {
      setIsSavingCTMarks(false);
    }
  };

  // Export CT Marksheet as CSV
  const handleExportCTCSV = (ct) => {
    const marksList = Array.isArray(ct.marks) ? ct.marks : [];
    if (marksList.length === 0) {
      toast.error("No student records found to export.");
      return;
    }

    const total = ct.totalMarks || 20;
    const rows = [
      [`PUST CSE Department - Class Test Marksheet`],
      [`Course: ${courseCode} - ${course?.title || ""}`],
      [`Class Test: ${ct.title}`],
      [`Date: ${ct.date || "N/A"}, Total Marks: ${total}`],
      [],
      ["Roll / Student ID", "Student Name", "Marks Obtained", "Total Marks", "Percentage", "Grade", "Status", "Remarks"],
    ];

    marksList.forEach((stu) => {
      const isAbs = Boolean(stu.isAbsent);
      const score = !isAbs && stu.marks !== null && stu.marks !== undefined ? Number(stu.marks) : (isAbs ? 0 : "N/A");
      const pct = typeof score === "number" ? `${Math.round((score / total) * 100)}%` : "N/A";
      const grade = isAbs ? "Absent" : (typeof score === "number" ? getCTGradeDetails(score, total).letter : "Ungraded");
      const status = isAbs ? "Absent" : (typeof score === "number" ? "Present" : "Ungraded");
      rows.push([
        `"${stu.studentId}"`,
        `"${stu.studentName}"`,
        score,
        total,
        pct,
        grade,
        status,
        `"${(stu.remarks || "").replace(/"/g, '""')}"`,
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${courseCode}_${ct.title.replace(/\s+/g, "_")}_Marks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CT marksheet exported as CSV!");
  };

  const handleUpdateGradingEntry = (studentId, field, value) => {
    setGradingMarksMap((prev) =>
      prev.map((entry) => {
        if (entry.studentId === studentId) {
          const updated = { ...entry, [field]: value };
          if (field === "isAbsent" && value === true) {
            updated.marks = "";
          }
          return updated;
        }
        return entry;
      })
    );
  };


  // ── FILTERED DATA HOOKS ──────────────────────────────────────
  const rosterStudents = useMemo(() => {
    const list = rosterData?.roster || [];
    return list.filter((stu) => {
      const matchesSearch =
        !studentSearch ||
        stu.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        stu.studentId?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        stu.email?.toLowerCase().includes(studentSearch.toLowerCase());

      const pct = stu.percentage;
      let matchesStatus = true;
      if (statusFilter === "eligible") matchesStatus = pct >= 75;
      if (statusFilter === "warning") matchesStatus = pct >= 60 && pct < 75;
      if (statusFilter === "risk") matchesStatus = pct < 60;

      return matchesSearch && matchesStatus;
    });
  }, [rosterData, studentSearch, statusFilter]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesCat = materialCategory === "all" || m.type === materialCategory;
      const matchesSearch =
        !materialSearch ||
        m.title?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        m.type?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        m.originalName?.toLowerCase().includes(materialSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [materials, materialCategory, materialSearch]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const isOverdue = new Date() > new Date(a.deadline);
      if (assignmentFilter === "active") return !isOverdue;
      if (assignmentFilter === "closed") return isOverdue;
      return true;
    });
  }, [assignments, assignmentFilter]);

  // Selected assignment roster statistics
  const assignmentRosterStats = useMemo(() => {
    const list = assignmentRoster.length > 0 ? assignmentRoster : submissions;
    const total = list.length;
    const submitted = list.filter((s) => s.hasSubmitted).length;
    const graded = list.filter((s) => s.marks !== null && s.marks !== undefined).length;
    const pendingGrade = submitted - graded;
    return {
      total,
      submitted,
      graded,
      pendingGrade: Math.max(0, pendingGrade),
      pendingSubmission: Math.max(0, total - submitted),
    };
  }, [assignmentRoster, submissions]);

  const filteredSubmissions = useMemo(() => {
    const list = assignmentRoster.length > 0 ? assignmentRoster : submissions.map((s) => ({
      ...s,
      hasSubmitted: true,
      submissionId: s._id,
    }));

    return list.filter((s) => {
      // Status filter
      if (submissionFilter === "submitted" && !s.hasSubmitted) return false;
      if (submissionFilter === "pending-submission" && s.hasSubmitted) return false;
      if (submissionFilter === "graded" && (s.marks === null || s.marks === undefined)) return false;
      if (submissionFilter === "pending-grade" && (s.marks !== null && s.marks !== undefined)) return false;

      // Search query
      if (submissionSearch.trim()) {
        const q = submissionSearch.toLowerCase().trim();
        const rollMatch = String(s.studentId || "").toLowerCase().includes(q);
        const nameMatch = String(s.studentName || "").toLowerCase().includes(q);
        const emailMatch = String(s.studentEmail || "").toLowerCase().includes(q);
        if (!rollMatch && !nameMatch && !emailMatch) return false;
      }

      return true;
    });
  }, [assignmentRoster, submissions, submissionFilter, submissionSearch]);

  const filteredManualStudents = useMemo(() => {
    const list = rosterData?.roster || [];
    if (!manualSearch) return list;
    const term = manualSearch.toLowerCase();
    return list.filter((s) => s.name?.toLowerCase().includes(term) || s.studentId?.toLowerCase().includes(term));
  }, [rosterData?.roster, manualSearch]);

  const courseStats = useMemo(() => {
    const totalHeld = rosterData?.totalSessions || 0;
    const rawTarget =
      course?.totalClasses !== undefined && course?.totalClasses !== null
        ? Number(course.totalClasses)
        : rosterData?.totalPlannedClasses !== undefined && rosterData?.totalPlannedClasses !== null
        ? Number(rosterData.totalPlannedClasses)
        : null;

    const hasTarget = rawTarget !== null && !isNaN(rawTarget) && rawTarget > 0;
    const targetClasses = hasTarget ? rawTarget : null;
    const remainingClasses = hasTarget ? Math.max(0, targetClasses - totalHeld) : null;
    const progressPct = hasTarget ? Math.min(100, Math.round((totalHeld / targetClasses) * 100)) : null;

    const studentsList = rosterData?.roster || [];
    const totalStudents = studentsList.length;

    // Calculate cohort average attendance % based on target if available
    const baseTotal = targetClasses || totalHeld;
    const avgPercentage =
      totalStudents > 0 && baseTotal > 0
        ? Math.round(studentsList.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalStudents)
        : (baseTotal === 0 ? null : 0);

    const eligibleCount = studentsList.filter((s) => s.percentage >= 75).length;
    const warningCount = studentsList.filter((s) => s.percentage >= 60 && s.percentage < 75).length;
    const atRiskCount = studentsList.filter((s) => s.percentage < 60).length;

    const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionCount || 0), 0);

    return {
      totalHeld,
      targetClasses,
      hasTarget,
      remainingClasses,
      progressPct,
      totalStudents,
      avgPercentage,
      eligibleCount,
      warningCount,
      atRiskCount,
      totalMaterials: materials.length,
      totalAssignments: assignments.length,
      totalSubmissions,
      totalNotices: isRelatedTeacher ? courseNotices.length : 0,
      totalClassTests: classTests.length,
    };
  }, [rosterData, materials, assignments, courseNotices, classTests, isRelatedTeacher, course?.totalClasses]);

  // Loading Screen
  if (isLoadingCourse && !course) {
    return (
      <Loading
        text="Loading Course Workspace..."
        subtext={`Synchronizing roster, materials, and assignments for ${courseCode}`}
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
            href="/dashboard/teacher"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Teacher Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          {/* Quick Course Switcher Dropdown */}
          <div className="relative group/switcher flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Course Workspace:</span>
            <div className="relative inline-block">
              <select
                value={courseCode}
                onChange={(e) => {
                  const targetCode = e.target.value;
                  if (targetCode && targetCode !== courseCode) {
                    router.push(`/dashboard/teacher/courses/${encodeURIComponent(targetCode)}`);
                  }
                }}
                className="appearance-none font-mono text-xs font-extrabold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-1.5 pr-8 outline-none cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <option value={courseCode}>{courseCode} • {course?.title || "Active Course"}</option>
                {teacherCourses
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
          {isRelatedTeacher && (
            <button
              type="button"
              onClick={handleCreateNotice}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Broadcast course notice to students of this course"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Give Course Notice</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchCourseDetails();
              fetchCourseRoster(true);
              fetchCourseMaterials();
              fetchCourseAssignments();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            title="Synchronize Course Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── COURSE HERO HEADER CARD ────────────────────────────────── */}
      <div className="p-7 sm:p-9 rounded-[2.5rem] bg-gradient-to-r from-slate-950 via-indigo-950/90 to-slate-950 text-white shadow-2xl relative overflow-hidden border border-white/10">
        {/* Decorative background glow accents */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 top-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-4 max-w-3xl">
            {/* Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-black px-3.5 py-1 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 backdrop-blur-md shadow-sm">
                {courseCode}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                {course?.semester || `Semester ${course?.semesterNum || 7}`}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md">
                {course?.credits || 3.0} Credit Units
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md">
                B.Sc. in CSE Program
              </span>
            </div>

            {/* Course Title */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              {course?.title || courseCode}
            </h1>

            {/* Details Meta */}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-300 flex-wrap pt-1">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Instructor: <strong>{course?.faculty || user?.name || "Assigned Faculty"}</strong></span>
              </span>

              {routineSlots.length > 0 && routineSlots.map((s) => s.room).filter(Boolean)[0] ? (
                <button
                  type="button"
                  onClick={() => handleTabChange("schedule")}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-emerald-400/50 transition cursor-pointer text-left"
                  title="Click to view routine schedule"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  <span>Room: <strong>{routineSlots.map((s) => s.room).filter(Boolean)[0]}</strong></span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("schedule")}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer text-left"
                  title="Click to view routine schedule"
                >
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Room: <em>Not assigned</em></span>
                </button>
              )}

              {routineSlots.length > 0 ? (
                <button
                  type="button"
                  onClick={() => handleTabChange("schedule")}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 hover:border-amber-400/50 transition cursor-pointer text-left"
                  title="Click to view routine schedule"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    Lectures: <strong>{routineSlots.length} sessions/week ({routineSlots.map((s) => s.day.slice(0, 3)).join(", ")})</strong>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTabChange("schedule")}
                  className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 transition cursor-pointer text-left"
                  title="Click to view routine schedule"
                >
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Lectures: <em>No timetable</em></span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Action Hub in Banner */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 w-full lg:w-auto shrink-0">
            <button
              type="button"
              onClick={handleOpenManualModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-indigo-400/30"
            >
              <UserCheck className="w-4 h-4 text-white" />
              <span>Record Attendance (Roll Call)</span>
            </button>

            <button
              type="button"
              onClick={handleExportAttendanceCSV}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs border border-emerald-400/30 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Attendance CSV</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  handleTabChange("materials");
                  setShowMaterialModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-300" />
                <span>Upload Slide</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleTabChange("assignments");
                  setShowAssignmentModal(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sky-300" />
                <span>New Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── COURSE KEY PERFORMANCE METRICS (INTERACTIVE STAT CARDS) ───────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-8 pt-6 border-t border-white/10">
          {/* Card 1: Classes Held & Semester Target */}
          <div
            onClick={() => setShowSessionsModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setShowSessionsModal(true);
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 backdrop-blur-md space-y-2 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-indigo-500/10 text-left"
            title="Click to view class session history, attendance logs & edit target classes"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-indigo-300 transition-colors">
                Classes & Target
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditClassesModal(true);
                }}
                className="text-[10px] text-indigo-300 hover:text-white font-bold flex items-center gap-1 bg-white/10 hover:bg-indigo-600 px-2 py-0.5 rounded-lg transition"
                title="Edit target classes for this semester"
              >
                <Edit3 className="w-2.5 h-2.5" />
                <span>{courseStats.targetClasses ? "Edit Target" : "Set Target"}</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{courseStats.totalHeld}</span>
                <span className="text-xs font-semibold text-slate-400">
                  {courseStats.targetClasses ? `/ ${courseStats.targetClasses} Target` : "Classes Held"}
                </span>
                {courseStats.targetClasses ? (
                  <span className="text-[10px] text-indigo-300 font-bold ml-auto bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-400/30">
                    {courseStats.progressPct}% Held
                  </span>
                ) : courseStats.totalHeld === 0 ? (
                  <span className="text-[10px] text-amber-300 font-bold ml-auto bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                    No Target Set
                  </span>
                ) : null}
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    courseStats.targetClasses
                      ? "bg-indigo-500"
                      : courseStats.totalHeld > 0
                      ? "bg-indigo-500 w-full"
                      : "bg-slate-700/50 w-full"
                  }`}
                  style={courseStats.targetClasses ? { width: `${courseStats.progressPct || 0}%` } : undefined}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>
                  {courseStats.targetClasses
                    ? `${courseStats.remainingClasses} classes remaining`
                    : routineSlots.length > 0
                    ? `${routineSlots.length} weekly slots`
                    : "Target not configured"}
                </span>
                <span className="text-indigo-300 font-bold group-hover/card:underline flex items-center gap-0.5">
                  <span>History</span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Class Avg Attendance */}
          <div
            onClick={() => handleTabChange("attendance")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabChange("attendance");
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/60 backdrop-blur-md space-y-1 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-emerald-500/10 text-left"
            title="Click to view full attendance roster & roll call"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-emerald-300 transition-colors">
                Class Avg Attendance
              </span>
              <span className="text-[10px] font-bold text-emerald-300 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Roster</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${
                courseStats.avgPercentage === null
                  ? "text-slate-400"
                  : courseStats.avgPercentage >= 75
                  ? "text-emerald-400"
                  : courseStats.avgPercentage >= 60
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}>
                {courseStats.avgPercentage === null ? "—" : `${courseStats.avgPercentage}%`}
              </span>
              <span className="text-xs text-slate-400 font-medium">Cohort Rate</span>
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold block pt-0.5 truncate">
              {courseStats.targetClasses
                ? `${courseStats.eligibleCount} of ${courseStats.totalStudents} eligible (target-based)`
                : courseStats.totalHeld === 0
                ? "No classes held yet"
                : `${courseStats.eligibleCount} of ${courseStats.totalStudents} students eligible (≥75%)`}
            </span>
          </div>

          {/* Card 3: Study Materials */}
          <div
            onClick={() => handleTabChange("materials")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabChange("materials");
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-400/60 backdrop-blur-md space-y-1 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-sky-500/10 text-left"
            title="Click to view or upload course study materials"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-sky-300 transition-colors">
                Study Materials
              </span>
              <span className="text-[10px] font-bold text-sky-300 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Files</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{courseStats.totalMaterials}</span>
              <span className="text-xs text-slate-400 font-medium">Files & Notes</span>
            </div>
            <span className="text-[10px] text-sky-300 font-semibold block pt-0.5 truncate">
              {courseStats.totalMaterials > 0 ? "Instant student downloads" : "Click to upload slide / notes"}
            </span>
          </div>

          {/* Card 4: Assignments & Tasks */}
          <div
            onClick={() => handleTabChange("assignments")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabChange("assignments");
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/60 backdrop-blur-md space-y-1 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-amber-500/10 text-left"
            title="Click to view or create coursework assignments"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-amber-300 transition-colors">
                Assignments & Tasks
              </span>
              <span className="text-[10px] font-bold text-amber-300 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Tasks</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{courseStats.totalAssignments}</span>
              <span className="text-xs text-slate-400 font-medium">Tasks Given</span>
            </div>
            <span className="text-[10px] text-amber-300 font-semibold block pt-0.5 truncate">
              {courseStats.totalAssignments > 0
                ? `${courseStats.totalSubmissions} submissions received`
                : "Click to create assignment task"}
            </span>
          </div>

          {/* Card 5: Course Notices */}
          <div
            onClick={() => handleTabChange("notices")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabChange("notices");
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 backdrop-blur-md space-y-1 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-indigo-500/10 text-left"
            title="Click to view and broadcast course notices"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-indigo-300 transition-colors">
                Course Notices
              </span>
              <span className="text-[10px] font-bold text-indigo-300 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Notices</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{courseStats.totalNotices}</span>
              <span className="text-xs text-slate-400 font-medium">Broadcasts</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-semibold block pt-0.5 truncate">
              {courseStats.totalNotices > 0 ? "Published to students" : "Click to broadcast notice"}
            </span>
          </div>

          {/* Card 6: Class Tests (CT) */}
          <div
            onClick={() => handleTabChange("class-tests")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleTabChange("class-tests");
            }}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/60 backdrop-blur-md space-y-1 relative group/card cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.99] shadow-sm hover:shadow-indigo-500/10 text-left"
            title="Click to view and input offline Class Test (CT) marks"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block group-hover/card:text-indigo-300 transition-colors">
                Class Tests (CT)
              </span>
              <span className="text-[10px] font-bold text-indigo-300 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-0.5">
                <span>Marks</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{courseStats.totalClassTests}</span>
              <span className="text-xs text-slate-400 font-medium">Offline CTs</span>
            </div>
            <span className="text-[10px] text-indigo-300 font-semibold block pt-0.5 truncate">
              {courseStats.totalClassTests > 0 ? "Roll-wise marks recorded" : "Click to record CT marks"}
            </span>
          </div>
        </div>
      </div>

      {/* ── COURSE WORKSPACE TABS ──────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2 overflow-x-auto scrollbar-none">
        {[
          { id: "notices", label: "Course Notices", icon: Bell, count: isRelatedTeacher ? courseNotices.length : 0 },
          { id: "attendance", label: "Attendance Hub", icon: UserCheck, count: `${courseStats.totalHeld} Sessions` },
          { id: "materials", label: "Study Materials", icon: BookOpen, count: courseStats.totalMaterials },
          { id: "assignments", label: "Continuous Tasks", icon: FileText, count: courseStats.totalAssignments },
          { id: "class-tests", label: "Class Tests (CT)", icon: Award, count: `${courseStats.totalClassTests} CTs` },
          { id: "schedule", label: "Routine Schedule", icon: Calendar, count: `${routineSlots.length} Classes` },
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
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 0: COURSE NOTICES & ANNOUNCEMENTS
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "notices" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          {!isRelatedTeacher ? (
            <div className="py-16 text-center rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-dashed border-amber-200 dark:border-amber-900/40 p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Course Notices Restricted
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Course notices and student announcements for {courseCode} are strictly private to the assigned course instructor and enrolled students. Another teacher cannot view or publish notices for this course.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Course Notices & Announcements
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                      {filteredCourseNotices.length} Published
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Broadcast instant guidelines, reschedule alerts, and voice notes to students of {courseCode}. You can view, edit, or remove notices below.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search notices..."
                      value={noticeSearch}
                      onChange={(e) => setNoticeSearch(e.target.value)}
                      className="pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
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

                  <button
                    type="button"
                    onClick={handleCreateNotice}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Give Course Notice</span>
                  </button>
                </div>
              </div>

              {/* Notices List */}
              {isNoticesLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Loading course notices...</p>
                </div>
              ) : filteredCourseNotices.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCourseNotices.map((notice) => (
                    <NoticeCard
                      key={notice.id || notice._id}
                      notice={notice}
                      isAdmin={user?.role === "admin"}
                      onEdit={handleEditNotice}
                      onDelete={handleDeleteNotice}
                    />
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
                      : "Post your first notice, guidelines, schedule announcement, or audio voice note for this course."}
                  </p>
                  {!noticeSearch && (
                    <button
                      type="button"
                      onClick={handleCreateNotice}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Give First Course Notice</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 1: COURSE ATTENDANCE HUB
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Target Classes Quick Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Target Classes:</span>
                {courseStats.targetClasses ? (
                  <span className="font-bold text-slate-900 dark:text-white">
                    {courseStats.targetClasses} classes
                  </span>
                ) : (
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    Not set
                  </span>
                )}
                {courseStats.targetClasses ? (
                  <span className="text-slate-400 dark:text-slate-500">
                    • {courseStats.totalHeld} held ({courseStats.remainingClasses} remaining)
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditClassesModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-xs font-bold transition cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{courseStats.targetClasses ? "Edit Target" : "Set Target"}</span>
            </button>
          </div>

          {/* Main Attendance Card */}
          <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Student Attendance Engine</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Student Roster & Exam Eligibility Monitor</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  {courseStats.targetClasses ? (
                    <>
                      Calculated for <strong>{courseCode}</strong> based on target <strong>{courseStats.targetClasses} classes</strong> ({courseStats.totalHeld} held).
                    </>
                  ) : (
                    <>
                      Calculated for <strong>{courseCode}</strong> across {courseStats.totalHeld} conducted class sessions.
                    </>
                  )}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowEditClassesModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition cursor-pointer"
                  title="Configure target class count for this course"
                >
                  <Target className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{courseStats.targetClasses ? `Target: ${courseStats.targetClasses}` : "Set Target"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenManualModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-white" />
                  <span>Take Attendance (Roll Call)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAttendanceCSV}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 text-xs font-bold transition-all hover:scale-102 active:scale-98 shadow-xs hover:shadow-emerald-500/10 cursor-pointer backdrop-blur-md"
                  title="Download complete attendance & eligibility sheet as CSV spreadsheet"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Export CSV</span>
                  <Download className="w-3.5 h-3.5 text-emerald-600/70 dark:text-emerald-400/70" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                {[
                  { id: "all", label: `All Students (${courseStats.totalStudents})` },
                  { id: "eligible", label: `Eligible ≥75% (${courseStats.eligibleCount})` },
                  { id: "warning", label: `Collegiate 60-74% (${courseStats.warningCount})` },
                  { id: "risk", label: `At Risk <60% (${courseStats.atRiskCount})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      statusFilter === f.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student ID, name, email..."
                  value={studentSearch ?? ""}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Roster Table with Isolated Scrolling and Sticky Header */}
            <div 
              data-lenis-prevent
              className="max-h-[580px] overflow-auto overscroll-contain rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs scrollbar-thin smart-scroll-container"
            >
              {isRosterLoading ? (
                <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
                  Calculating individual student attendance records for {courseCode}...
                </div>
              ) : rosterStudents.length === 0 ? (
                <div className="py-14 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                  <Users className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No enrolled students match your search or filter.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Students registered in {course?.semester || `Semester ${course?.semesterNum || 7}`} automatically appear here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                    <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-4">Student</th>
                      <th className="pb-3 px-4">Student ID</th>
                      <th className="pb-3 px-4 text-center">{courseStats.targetClasses ? "Attended / Target" : "Attended / Held"}</th>
                      <th className="pb-3 px-4 text-center">Course Attendance %</th>
                      <th className="pb-3 px-4 text-center">Exam Eligibility</th>
                      <th className="pb-3 px-4 text-right">Latest Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-medium text-slate-700 dark:text-slate-200">
                    {rosterStudents.map((stu) => {
                      const pct = stu.percentage;
                      const isEligible = pct >= 75;
                      const isWarning = pct >= 60 && pct < 75;
                      const latestSession = stu.history && stu.history.length > 0 ? stu.history[0] : null;

                      return (
                        <tr
                          key={stu.id || stu.studentId}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                {stu.name ? stu.name.charAt(0).toUpperCase() : "S"}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {stu.name}
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                                  {stu.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {stu.studentId}
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-800 dark:text-slate-100">
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-1">
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black">{stu.attendedCount}</span>
                                <span className="text-slate-400 font-mono text-xs">
                                  {courseStats.targetClasses
                                    ? ` / ${courseStats.targetClasses} Target`
                                    : ` / ${stu.totalSessions} Sessions`}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({stu.attendedCount} of {stu.totalSessions} held attended)
                              </span>
                              {courseStats.targetClasses && stu.remainingClasses > 0 && (
                                <span className={`text-[10px] mt-0.5 font-semibold ${
                                  stu.neededFromRemaining === 0
                                    ? "text-emerald-500 dark:text-emerald-400"
                                    : stu.canReach75
                                    ? "text-sky-600 dark:text-sky-400"
                                    : "text-rose-500 font-bold"
                                }`}>
                                  {stu.neededFromRemaining === 0
                                    ? "✓ Guaranteed ≥75%"
                                    : stu.canReach75
                                    ? `Needs ≥${stu.neededFromRemaining} of ${stu.remainingClasses} left`
                                    : "⚠ Cannot reach 75%"}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-20 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isEligible ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                              <span className={`font-mono font-extrabold text-xs ${
                                isEligible ? "text-emerald-600 dark:text-emerald-400" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                              }`}>
                                {pct}%
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                              isEligible
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                                : isWarning
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                            }`}>
                              {isEligible ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Eligible (≥75%)</span>
                                </>
                              ) : isWarning ? (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Collegiate (60-74%)</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Non-Collegiate (&lt;60%)</span>
                                </>
                              )}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            {latestSession ? (
                              <button
                                type="button"
                                onClick={() => handleToggleSingleStudent(stu, latestSession)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                  latestSession.status === "present"
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                }`}
                                title={`Toggle presence for latest session (${latestSession.date})`}
                              >
                                {latestSession.status === "present" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Present</span>
                                  </>
                                ) : (
                                  <>
                                    <X className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Absent</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleOpenManualModal}
                                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                              >
                                Take Roll Call
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Past Conducted Sessions History Cards */}
          {rosterData?.sessions && rosterData.sessions.length > 0 && (
            <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Conducted Sessions Log ({rosterData.sessions.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Click any session to view student attendance list or manage records.</p>
                </div>
              </div>

              <div 
                data-lenis-prevent
                className="max-h-[380px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {rosterData.sessions.map((ses, idx) => {
                    // Calculate present count for this session
                    const presentCount = (rosterData.roster || []).filter((s) => {
                      const rec = (s.history || []).find((h) => h.sessionKey === ses.sessionKey);
                      return rec?.status === "present";
                    }).length;
                    const total = rosterData.roster?.length || 0;
                    const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;

                    return (
                      <div
                        key={ses.sessionKey || idx}
                        onClick={() => setInspectedSession(ses)}
                        className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group shadow-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {ses.date}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                            {ses.timeSlot}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-bold truncate">
                            Class #{rosterData.sessions.length - idx} • {courseCode}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{presentCount} / {total} Present</span>
                            <span className={`font-mono font-bold ${pct >= 75 ? "text-emerald-600" : "text-amber-600"}`}>{pct}%</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-indigo-600 dark:text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
                          <span>View Session Roster</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2: STUDY MATERIALS & NOTES REPOSITORY
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "materials" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Course Academic Repository</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Published Study Materials, Slides & Code Decks</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Upload lecture slides, code demos, and lab manuals specifically accessible to <strong>{courseCode}</strong> students.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMaterialModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Material</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
              {[
                { id: "all", label: `All Materials (${materials.length})` },
                { id: "Lecture Slides (PDF)", label: "Slides" },
                { id: "Lab Manual & Code", label: "Lab Code" },
                { id: "Lecture Notes", label: "Lecture Notes" },
                { id: "Syllabus & Reading List", label: "Syllabus" },
                { id: "Reference Book / Paper", label: "Reference Books" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setMaterialCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    materialCategory === cat.id
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search material title or filename..."
                value={materialSearch ?? ""}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Materials Cards Grid */}
          {materialsLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading course study materials...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No materials match your current category or search
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload your lecture slide deck, lab code manual, or reading list for students enrolled in {courseCode}.
              </p>
              <button
                type="button"
                onClick={() => setShowMaterialModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Lecture Slides</span>
              </button>
            </div>
          ) : (
            <div data-lenis-prevent className="max-h-[600px] overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredMaterials.map((mat) => {
                const isPdf = mat.type?.includes("PDF") || mat.originalName?.endsWith(".pdf");
                const isCode = mat.type?.includes("Code") || mat.originalName?.endsWith(".zip") || mat.originalName?.endsWith(".cpp");

                return (
                  <div
                    key={mat._id || mat.id}
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-600/60 transition-all flex flex-col justify-between space-y-4 group shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isPdf
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : isCode
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                            : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        }`}>
                          {mat.type || "Lecture Notes"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {mat.date || (mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : "Recent")}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug">
                        {mat.title}
                      </h4>

                      {mat.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {mat.description}
                        </p>
                      )}

                      {mat.originalName && (
                        <p className="text-[11px] text-slate-400 truncate font-mono bg-white dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                          📎 {mat.originalName}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {mat.filePath ? (
                          <a
                            href={mat.filePath.startsWith("http") ? mat.filePath : `${SERVER_URL}${mat.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Note Resource</span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyMaterialLink(mat)}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition cursor-pointer"
                          title="Copy direct download link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(mat._id || mat.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3: CONTINUOUS TASKS & ASSIGNMENTS (COURSE WORKSPACE)
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "assignments" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-1">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                <span>Course Assessment & Grading Studio</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{courseCode} Coursework, Deliverables & Marks</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Publish continuous assessments specifically for <strong>{courseCode}</strong>, evaluate student submissions roll-wise, award marks with feedback, and export CSV grade sheets.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAssignmentModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Assignment</span>
            </button>
          </div>

          {/* Quick Course Assessment Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Course Tasks</span>
              <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{assignments.length} Published</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Total Submissions</span>
              <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
                {assignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0)} On Record
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Active Window</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {assignments.filter((a) => new Date() <= new Date(a.deadline)).length} Accepting Work
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/40">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">Enrolled Cohort</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {courseStats.totalStudents || 0} Students
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: "all", label: `All Coursework (${assignments.length})` },
              { id: "active", label: "Active (Accepting Submissions)" },
              { id: "closed", label: "Deadline Passed" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setAssignmentFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  assignmentFilter === f.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Assignments List */}
          {assignmentsLoading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading course assignments...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No assignments match your filter for {courseCode}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Set continuous homework, lab assignments, or project deliverables for enrolled students in this course.
              </p>
              <button
                type="button"
                onClick={() => setShowAssignmentModal(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Assignment</span>
              </button>
            </div>
          ) : (
            <div data-lenis-prevent className="max-h-[600px] overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAssignments.map((asg) => {
                const deadlineDate = new Date(asg.deadline);
                const isOverdue = new Date() > deadlineDate;
                const submissionRate = courseStats.totalStudents > 0
                  ? Math.round(((asg.submissionCount || 0) / courseStats.totalStudents) * 100)
                  : 0;

                return (
                  <div
                    key={asg._id || asg.id}
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-400 dark:hover:border-sky-600/60 transition-all flex flex-col justify-between space-y-4 group shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isOverdue
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800"
                        }`}>
                          {isOverdue ? "Deadline Passed" : "Accepting Submissions"}
                        </span>
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                          Max: {asg.totalMarks || 20} Marks
                        </span>
                      </div>

                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                        {asg.title}
                      </h4>

                      {asg.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                          {asg.description}
                        </p>
                      )}

                      {/* Instructor Problem Sheet / Starter Code Link */}
                      {asg.filePath && (
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {asg.originalName || "Problem Sheet Attachment"}
                            </span>
                          </div>
                          <a
                            href={asg.filePath.startsWith("http") ? asg.filePath : `${SERVER_URL}${asg.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            download={asg.originalName || true}
                            className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 text-sky-600 transition shrink-0"
                            title="Download problem sheet"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}

                      {/* Submission Progress bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                          <span>Submissions: {asg.submissionCount || 0} / {courseStats.totalStudents}</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{submissionRate}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                            style={{ width: `${Math.min(submissionRate, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Due: {deadlineDate.toLocaleDateString()} at {deadlineDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleOpenSubmissions(asg)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View & Grade Submissions ({asg.submissionCount || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(asg._id || asg.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                        title="Delete Assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ════════════════════════════════════════════════════════════════
          TAB 4.5: OFFLINE CLASS TESTS (CT) & ROLL-WISE MARKS
          ════════════════════════════════════════════════════════════════ */}
      {activeTab === "class-tests" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Offline Class Tests (CT) & Marks Management
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
                  {classTests.length} Tests Recorded
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Class Tests take place offline in the classroom. Input and update student CT marks roll-wise here. Scores synchronize automatically with student portals.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateCT}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Class Test (CT)</span>
            </button>
          </div>

          {/* Class Tests List */}
          {isClassTestsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">Loading course class tests...</p>
            </div>
          ) : classTests.length > 0 ? (
            <div className="grid grid-cols-1 gap-5">
              {classTests.map((ct) => {
                const total = ct.totalMarks || 20;
                const stats = ct.stats || {};
                const evaluatedCount = stats.evaluatedCount || 0;
                const totalRoster = stats.totalRoster || (rosterData?.roster?.length || 0);
                const avg = stats.averageMarks;
                const highest = stats.highestMarks;
                const lowest = stats.lowestMarks;
                const absentCount = stats.absentCount || 0;

                return (
                  <div
                    key={ct.id || ct._id}
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-5 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Max {total} Marks
                          </span>
                          {ct.date && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Exam Date: {new Date(ct.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            </span>
                          )}
                          {ct.room && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{ct.room}</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                          {ct.title}
                        </h3>

                        {ct.topic && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-500">Syllabus / Topics:</span> {ct.topic}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleOpenGradingModal(ct)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Input / Edit Marks</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportCTCSV(ct)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer border border-slate-200/80 dark:border-slate-600"
                          title="Export roll-wise marksheet to CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditCT(ct)}
                          className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          title="Edit CT details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCT(ct)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                          title="Delete Class Test"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Class Test Statistics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Evaluated</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {evaluatedCount} of {totalRoster} Students
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Class Average</span>
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                          {avg !== null ? `${avg} / ${total} (${Math.round((avg / total) * 100)}%)` : "—"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Highest Mark</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {highest !== null ? `${highest} / ${total}` : "—"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Lowest Mark</span>
                        <span className="font-extrabold text-slate-600 dark:text-slate-300">
                          {lowest !== null ? `${lowest} / ${total}` : "—"}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Absent Count</span>
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">
                          {absentCount} Absent
                        </span>
                      </div>
                    </div>
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
                No offline Class Tests recorded for {courseCode} yet
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Class Tests take place offline in the classroom. Create a test entry to record roll-wise student marks, calculate grades, and share performance insights with students.
              </p>
              <button
                type="button"
                onClick={handleOpenCreateCT}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Class Test</span>
              </button>
            </div>
          )}
        </div>
      )}
      {activeTab === "schedule" && (
        <div className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 transition-colors">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Departmental Master Routine Slots for {courseCode}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Scheduled weekly lecture and sessional slots managed by the department administration.
            </p>
          </div>

          {routineSlots.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                No routine timetable slots registered for {courseCode} yet.
              </p>
            </div>
          ) : (
            <div data-lenis-prevent className="max-h-[520px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {routineSlots.map((slot, idx) => (
                <div
                  key={slot._id || idx}
                  className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3.5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                      {slot.day}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded">
                      {slot.timeSlot}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {slot.courseTitle || course?.title || courseCode}
                    </h4>
                    <span className="text-xs text-slate-400">Semester {slot.semester} • Lecture Class</span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{slot.room || "Room 407"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualTimeSlot(slot.timeSlot);
                        handleOpenManualModal();
                      }}
                      className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Take Roll Call
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 1: RECORD ATTENDANCE (ENHANCED ROLL CALL)
          ════════════════════════════════════════════════════════════════ */}
      {showManualModal && (
        <div 
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div 
            data-lenis-prevent
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Class Attendance Roll Call • {courseCode}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cohort session for {course?.semester || `Semester ${course?.semesterNum || 7}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualSession} className="space-y-5">
              {/* Session Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Session Date</label>
                  <input
                    type="date"
                    required
                    value={manualDate ?? ""}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Class Time Slot</label>
                  <select
                    value={manualTimeSlot}
                    onChange={(e) => setManualTimeSlot(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    {[
                      "09:00 - 10:00",
                      "10:00 - 11:00",
                      "11:00 - 12:00",
                      "12:00 - 01:00",
                      "02:00 - 03:00",
                      "03:00 - 04:00",
                      "04:00 - 05:00",
                    ].map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lecture Topic / Chapter (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Adversarial Search & Minimax Alpha-Beta Pruning"
                  value={manualTopic ?? ""}
                  onChange={(e) => setManualTopic(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              {/* Student Roll-Call Checklist */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Roster Roll Call:
                    </span>
                    <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                      {Object.values(manualAttendanceMap).filter(Boolean).length} Present / {rosterData?.roster?.length || 0} Total
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleMarkAllManual(true)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold cursor-pointer hover:bg-emerald-100"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAllManual(false)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer hover:bg-rose-100"
                    >
                      All Absent
                    </button>
                    <button
                      type="button"
                      onClick={handleInvertManual}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold cursor-pointer hover:bg-slate-200"
                    >
                      Invert
                    </button>
                  </div>
                </div>

                {/* In-modal Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter students in roll call checklist..."
                    value={manualSearch ?? ""}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                  />
                </div>

                {/* Scrollable list with isolated containment */}
                <div 
                  data-lenis-prevent
                  className="max-h-64 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-800/40 scrollbar-thin"
                >
                  {filteredManualStudents.map((stu) => {
                    const isChecked = Boolean(manualAttendanceMap[stu.email]);
                    return (
                      <div
                        key={stu.email}
                        onClick={() => handleToggleManualStudent(stu.email)}
                        className={`p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked ? "bg-emerald-50/70 dark:bg-emerald-950/40" : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-white block">
                              {stu.name}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                              {stu.studentId}
                            </span>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isChecked
                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                        }`}>
                          {isChecked ? "Present" : "Absent"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingManual ? "Saving Session..." : "Save Session Attendance"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 2: INSPECT CONDUCTED SESSION
          ════════════════════════════════════════════════════════════════ */}
      {inspectedSession && (
        <div 
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div 
            data-lenis-prevent
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Session Roster: {inspectedSession.date}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {inspectedSession.timeSlot} • {courseCode}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSession(inspectedSession.sessionKey)}
                  disabled={isDeletingSession}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer"
                  title="Delete this entire session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeletingSession ? "Deleting..." : "Delete Session"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectedSession(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search inside session */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student in this session..."
                value={sessionSearch ?? ""}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none"
              />
            </div>

            {/* Students list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
              {(rosterData?.roster || [])
                .filter(
                  (s) =>
                    !sessionSearch ||
                    s.name?.toLowerCase().includes(sessionSearch.toLowerCase()) ||
                    s.studentId?.toLowerCase().includes(sessionSearch.toLowerCase())
                )
                .map((stu) => {
                  const rec = (stu.history || []).find((h) => h.sessionKey === inspectedSession.sessionKey);
                  const isPresent = rec?.status === "present";

                  return (
                    <div
                      key={stu.email}
                      className="p-3 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {stu.name}
                        </span>
                        <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                          {stu.studentId} • {stu.email}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSingleStudent(stu, {
                          sessionKey: inspectedSession.sessionKey,
                          date: inspectedSession.date,
                          timeSlot: inspectedSession.timeSlot,
                          status: isPresent ? "present" : "absent"
                        })}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isPresent
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200"
                            : "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 hover:bg-rose-200"
                        }`}
                      >
                        {isPresent ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        <span>{isPresent ? "Present" : "Absent"}</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 3: UPLOAD STUDY MATERIAL
          ════════════════════════════════════════════════════════════════ */}
      {showMaterialModal && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Upload Material for {courseCode}
                  </h3>
                  <p className="text-xs text-slate-400">Available instantly for enrolled students</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMaterialModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Material Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Adversarial Search & Game Playing"
                  value={materialForm.title ?? ""}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Resource Category</label>
                <select
                  value={materialForm.type}
                  onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                >
                  <option value="Lecture Slides (PDF)">Lecture Slides (PDF)</option>
                  <option value="Lab Manual & Code">Lab Manual & Code</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Syllabus & Reading List">Syllabus & Reading List</option>
                  <option value="Reference Book / Paper">Reference Book / Paper</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Chapter / Description Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context, reading instructions, or lab exercises..."
                  value={materialForm.description ?? ""}
                  onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">File Attachment (PDF, PPT, ZIP, DOCX up to 100MB)</label>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMaterialModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingMaterial}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {uploadingMaterial ? "Uploading..." : "Upload Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 4: CREATE ASSIGNMENT
          ════════════════════════════════════════════════════════════════ */}
      {showAssignmentModal && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    New Assignment for {courseCode}
                  </h3>
                  <p className="text-xs text-slate-400">Continuous Assessment Deliverable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignmentModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Task 2: Implement A* Search Algorithm in Python"
                  value={assignmentForm.title ?? ""}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Submission Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={assignmentForm.deadline ?? ""}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={assignmentForm.totalMarks ?? 20}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, totalMarks: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Instructions & Description</label>
                <textarea
                  rows={3}
                  placeholder="Detail instructions, test cases, or submission format (ZIP, PDF, GitHub link)..."
                  value={assignmentForm.description ?? ""}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Attachment File / Starter Code (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-600 hover:file:bg-sky-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAssignment}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {creatingAssignment ? "Creating..." : "Publish Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 5: ROLL-WISE CLASS ROSTER & CONTINUOUS GRADING STUDIO
          ════════════════════════════════════════════════════════════════ */}
      {selectedAssignment && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin">
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold mb-1">
                  {courseCode} • Max: {selectedAssignment.totalMarks || 20} Marks
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Roll-Wise Submissions & Grading: {selectedAssignment.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Evaluate class roster submissions roll-wise or award continuous assessment marks directly.
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleExportGradesCSV}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Export complete roll-wise roster with marks to CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Roll-Wise CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Assessment Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Roster</span>
                <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">
                  {assignmentRosterStats.total} Students
                </span>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">Submitted</span>
                <span className="text-base font-black text-sky-600 dark:text-sky-400 mt-0.5 block">
                  {assignmentRosterStats.submitted} Delivered
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Graded</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {assignmentRosterStats.graded} Evaluated
                </span>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending Evaluation</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                  {assignmentRosterStats.pendingGrade} To Grade
                </span>
              </div>
            </div>

            {/* Filter Pills & Roll Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: "all", label: `All Roster (${assignmentRosterStats.total})` },
                  { id: "submitted", label: `Submitted (${assignmentRosterStats.submitted})` },
                  { id: "pending-submission", label: `Awaiting File (${assignmentRosterStats.pendingSubmission})` },
                  { id: "graded", label: `Graded (${assignmentRosterStats.graded})` },
                  { id: "pending-grade", label: `To Grade (${assignmentRosterStats.pendingGrade})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSubmissionFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                      submissionFilter === f.id
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Roll or Name..."
                  value={submissionSearch ?? ""}
                  onChange={(e) => setSubmissionSearch(e.target.value)}
                  className="w-full h-8.5 pl-8.5 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Roster & Submissions List */}
            {submissionsLoading ? (
              <div className="py-16 text-center text-xs text-slate-400 animate-pulse space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                <p>Loading complete roll-wise student roster...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-14 text-center text-xs text-slate-400 space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <FileCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">No students match your filter.</p>
                <p className="text-[11px] text-slate-400">Try changing the filter chips or search keyword above.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[55vh] overflow-y-auto overscroll-contain pr-1.5 scrollbar-thin">
                {filteredSubmissions.map((sub, sIdx) => {
                  const studentKey = sub.studentId || sub.submissionId || sub._id || `stu-${sIdx}`;
                  const isEditingThis = gradingStudentKey === studentKey;
                  const isGraded = sub.marks !== null && sub.marks !== undefined;
                  const maxMarks = selectedAssignment.totalMarks || 20;
                  const pct = isGraded ? Math.round((Number(sub.marks) / maxMarks) * 100) : 0;

                  const getGradeLetter = (score, max) => {
                    if (score === null || score === undefined || !max) return "Ungraded";
                    const p = (score / max) * 100;
                    if (p >= 80) return "A+";
                    if (p >= 75) return "A";
                    if (p >= 70) return "A-";
                    if (p >= 65) return "B+";
                    if (p >= 60) return "B";
                    if (p >= 55) return "B-";
                    if (p >= 50) return "C+";
                    if (p >= 40) return "D";
                    return "F";
                  };

                  return (
                    <div
                      key={studentKey}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-600/60 transition shadow-2xs"
                    >
                      {/* Top Student Identification & Marks */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                              Roll: {sub.studentId || "N/A"}
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {sub.studentName || "Student"}
                            </span>
                            {sub.batch && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                Batch {sub.batch}
                              </span>
                            )}
                          </div>
                          {sub.studentEmail && (
                            <p className="text-[11px] text-slate-400">{sub.studentEmail}</p>
                          )}
                        </div>

                        {/* Marks Badge */}
                        <div className="text-right shrink-0">
                          {isGraded ? (
                            <div className="inline-flex items-baseline gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/70">
                              <span className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                                {sub.marks} / {maxMarks}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ({pct}% • {getGradeLetter(sub.marks, maxMarks)})
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                              <Clock className="w-3 h-3" />
                              <span>Pending Grade</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Deliverable Status / Notes */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        {sub.hasSubmitted ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                sub.isLate
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              }`}
                            >
                              {sub.isLate ? "Submitted Late" : "Submitted On Time"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : ""}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            <span>No digital file submitted • In-person / Viva evaluation</span>
                          </div>
                        )}

                        {/* File Download Button */}
                        {sub.filePath && (
                          <a
                            href={sub.filePath.startsWith("http") ? sub.filePath : `${SERVER_URL}${sub.filePath}`}
                            target="_blank"
                            rel="noreferrer"
                            download={sub.originalName || true}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shrink-0"
                            title="Download student solution file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="truncate max-w-44">{sub.originalName || "Download Solution"}</span>
                          </a>
                        )}
                      </div>

                      {/* Student Submission Notes */}
                      {sub.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                          {sub.notes}
                        </p>
                      )}

                      {/* Existing Instructor Feedback */}
                      {sub.feedback && !isEditingThis && (
                        <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300 flex items-start gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Faculty Feedback:</strong> &ldquo;{sub.feedback}&rdquo;
                          </div>
                        </div>
                      )}

                      {/* Inline Grading Form or Trigger Button */}
                      <div className="pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50">
                        {isEditingThis ? (
                          <div className="space-y-2.5">
                            {/* Quick Feedback Chips */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[
                                "🌟 Excellent work!",
                                "👍 Well structured.",
                                "⚠️ Incomplete solution.",
                                "⏱️ Late penalty applied.",
                                "💯 Outstanding implementation.",
                              ].map((chip) => (
                                <button
                                  key={chip}
                                  type="button"
                                  onClick={() => setFeedbackInput(chip)}
                                  className="text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-200 transition cursor-pointer"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxMarks}
                                  placeholder="Marks"
                                  value={gradeInput ?? ""}
                                  onChange={(e) => setGradeInput(e.target.value)}
                                  className="w-24 h-9 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-black outline-none focus:border-indigo-500"
                                />
                                <span className="text-xs text-slate-400 font-bold">/ {maxMarks}</span>
                              </div>

                              <input
                                type="text"
                                placeholder="Faculty remarks / feedback..."
                                value={feedbackInput ?? ""}
                                onChange={(e) => setFeedbackInput(e.target.value)}
                                className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-xs font-medium outline-none focus:border-indigo-500"
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isSavingGrade}
                                  onClick={() => handleSaveGrade(sub)}
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingGrade ? "Saving..." : "Save Grade"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setGradingStudentKey(null)}
                                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition cursor-pointer"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              {isGraded ? "Evaluated • Ready to update" : "Awaiting continuous assessment grading"}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setGradingStudentKey(studentKey);
                                setGradeInput(sub.marks !== undefined && sub.marks !== null ? String(sub.marks) : "");
                                setFeedbackInput(sub.feedback || "");
                              }}
                              className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 dark:bg-slate-700 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 text-xs font-bold transition cursor-pointer border border-slate-200/80 dark:border-slate-600"
                            >
                              {isGraded ? "Edit Grade" : "Grade Student"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 6: BROADCAST COURSE NOTICE / ANNOUNCEMENT
          ════════════════════════════════════════════════════════════════ */}
      <CourseNoticeModal
        isOpen={showNoticeModal}
        onClose={() => {
          setShowNoticeModal(false);
          setEditingNotice(null);
        }}
        editingNotice={editingNotice}
        onNoticeSaved={() => {
          fetchCourseNotices();
          window.dispatchEvent(new CustomEvent("refresh-notices"));
        }}
        teacherCourses={[{
          code: courseCode,
          title: course?.title || `${courseCode} Module`,
          semester: course?.semester || "7",
        }]}
        currentTeacher={{
          name: user?.name,
          email: user?.email,
          designation: user?.designation || "Course Faculty",
        }}
        defaultCourseCode={courseCode}
      />

      {/* ════════════════════════════════════════════════════════════════
          MODAL 7: EDIT TARGET TOTAL CLASSES
          ════════════════════════════════════════════════════════════════ */}
      {showEditClassesModal && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Target Classes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditClassesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdatePlannedClasses();
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                  How many classes should be taken?
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    placeholder="e.g. 30"
                    value={plannedClassesInput}
                    onChange={(e) => setPlannedClassesInput(e.target.value)}
                    className="w-full h-11 px-3.5 pr-20 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                    Classes
                  </span>
                </div>
              </div>

              {/* Quick Presets & Clear */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[20, 25, 30, 40].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPlannedClassesInput(String(preset))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      String(plannedClassesInput) === String(preset)
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                {plannedClassesInput && (
                  <button
                    type="button"
                    onClick={() => setPlannedClassesInput("")}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer ml-auto"
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Attendance % will be calculated as (Attended ÷ Target) × 100%.
              </p>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditClassesModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlannedClasses}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingPlannedClasses ? "Saving..." : "Save Target"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          MODAL 9: COURSE SESSIONS & HELD HISTORY INSPECTOR
          ════════════════════════════════════════════════════════════════ */}
      {showSessionsModal && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Class Sessions Hub • {courseCode}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {rosterData?.sessions?.length || 0} class session(s) conducted
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionsModal(false);
                    handleOpenManualModal();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>+ Record Roll Call</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSessionsModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sessions List */}
            {(!rosterData?.sessions || rosterData.sessions.length === 0) ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
                  <CalendarCheck className="w-8 h-8 opacity-60" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    No Class Sessions Held Yet
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    This course has no conducted class sessions yet. When you take roll call or launch an attendance session, it will appear here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionsModal(false);
                    handleOpenManualModal();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Record First Roll Call</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rosterData.sessions.map((sess, idx) => {
                  const isLive = sess.status === "active";
                  const isAnnounced = sess.status === "announced";
                  return (
                    <div
                      key={sess.sessionKey || idx}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-indigo-400/50"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                            {sess.date}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">
                            {sess.timeSlot}
                          </span>
                          {sess.room && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                              {sess.room}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              isLive
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40 animate-pulse"
                                : isAnnounced
                                ? "bg-sky-500/20 text-sky-300 border-sky-400/40"
                                : "bg-indigo-500/20 text-indigo-300 border-indigo-400/40"
                            }`}
                          >
                            {isLive ? "Live Check-In Active" : isAnnounced ? "Announced" : "Roll Call Saved"}
                          </span>
                        </div>

                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">
                          {sess.topic || "Class Lecture Session"}
                        </p>

                        {sess.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            Notes: {sess.notes}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            Turnout: <strong>{sess.attendedCount || 0} / {sess.totalStudents || rosterData?.studentCount || 0}</strong> ({sess.turnoutPct || 0}%)
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setManualDate(sess.date || new Date().toISOString().split("T")[0]);
                            setManualTimeSlot(sess.timeSlot || "09:00 - 10:00");
                            setManualTopic(sess.topic || "");
                            setShowSessionsModal(false);
                            handleOpenManualModal();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition cursor-pointer"
                          title="Review or edit student attendance roll call for this session"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Roll Call</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess.sessionKey)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Delete this session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <span>
                Total Sessions Held: <strong>{courseStats.totalHeld}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowSessionsModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 10: CREATE / EDIT CLASS TEST (OFFLINE) ──────────────── */}
      {showCTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {editingCT ? "Edit Class Test" : "Create Class Test (Offline)"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Offline assessment for {courseCode} • Roster auto-linked
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCTModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCT} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Class Test Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class Test 01 - Theory"
                  value={ctForm.title}
                  onChange={(e) => setCTForm({ ...ctForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Total Marks <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={ctForm.totalMarks}
                    onChange={(e) => setCTForm({ ...ctForm, totalMarks: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Exam Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={ctForm.date}
                    onChange={(e) => setCTForm({ ...ctForm, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Exam Classroom / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Room 407, CSE Academic Building"
                  value={ctForm.room}
                  onChange={(e) => setCTForm({ ...ctForm, room: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Syllabus / Topics Covered
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Lexical Analysis, Syntax Directed Translation, Parsing Algorithms..."
                  value={ctForm.topic}
                  onChange={(e) => setCTForm({ ...ctForm, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCTModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCT}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingCT ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : editingCT ? (
                    "Update Class Test"
                  ) : (
                    "Create Class Test"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 11: ROLL-WISE CLASS TEST MARKS ENTRY & GRADING SHEET ── */}
      {activeCTForGrading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                    Offline Assessment Marksheet
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Max Marks: {activeCTForGrading.totalMarks}
                  </span>
                  {activeCTForGrading.room && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {activeCTForGrading.room}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {activeCTForGrading.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Course: <span className="font-semibold text-slate-700 dark:text-slate-300">{courseCode}</span> • Exam Date:{" "}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{activeCTForGrading.date || "N/A"}</span>
                  {activeCTForGrading.topic && ` • Topics: ${activeCTForGrading.topic}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveCTForGrading(null)}
                className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Benchmarks & Stats Bar */}
            {(() => {
              const totalEnrolled = gradingMarksMap.length;
              const evaluatedStudents = gradingMarksMap.filter(
                (e) => !e.isAbsent && e.marks !== "" && !isNaN(Number(e.marks))
              );
              const absentStudents = gradingMarksMap.filter((e) => e.isAbsent);
              const validMarks = evaluatedStudents.map((e) => Number(e.marks));
              const liveAvg =
                validMarks.length > 0
                  ? (validMarks.reduce((a, b) => a + b, 0) / validMarks.length).toFixed(1)
                  : "—";
              const liveHighest =
                validMarks.length > 0 ? Math.max(...validMarks).toFixed(1) : "—";
              const liveLowest =
                validMarks.length > 0 ? Math.min(...validMarks).toFixed(1) : "—";

              return (
                <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Enrolled</p>
                    <p className="text-base font-extrabold text-slate-800 dark:text-slate-100">{totalEnrolled}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Evaluated</p>
                    <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {evaluatedStudents.length} <span className="text-xs font-normal text-slate-400">/ {totalEnrolled}</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <p className="text-[11px] font-semibold text-rose-500 uppercase">Absent</p>
                    <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">{absentStudents.length}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase">Class Avg</p>
                    <p className="text-base font-extrabold text-indigo-700 dark:text-indigo-300">
                      {liveAvg} <span className="text-xs font-normal text-slate-400">/ {activeCTForGrading.totalMarks}</span>
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Highest</p>
                    <p className="text-base font-extrabold text-amber-700 dark:text-amber-300">
                      {liveHighest} <span className="text-xs font-normal text-slate-400">/ {activeCTForGrading.totalMarks}</span>
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Filter and Action Toolbar */}
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student roll or name..."
                  value={gradingSearch}
                  onChange={(e) => setGradingSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportCTCSV(activeCTForGrading)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Export student marks to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllCTMarks}
                  disabled={isSavingCTMarks}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingCTMarks ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save All Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Students Marks Table */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {(() => {
                const filtered = gradingMarksMap.filter((entry) => {
                  if (!gradingSearch.trim()) return true;
                  const q = gradingSearch.toLowerCase();
                  return (
                    entry.studentId?.toLowerCase().includes(q) ||
                    entry.studentName?.toLowerCase().includes(q) ||
                    entry.studentEmail?.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                        {gradingMarksMap.length === 0
                          ? "No enrolled students found in roster for this semester."
                          : "No students matching your search."}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Students enrolled in semester {course?.semesterNum || 7} will automatically show up here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
                          <th className="py-3 px-3.5 w-14">#</th>
                          <th className="py-3 px-3.5">Roll No</th>
                          <th className="py-3 px-3.5">Student Name</th>
                          <th className="py-3 px-3.5 w-32 text-center">Marks (Max {activeCTForGrading.totalMarks})</th>
                          <th className="py-3 px-3.5 w-24 text-center">Absent?</th>
                          <th className="py-3 px-3.5 w-28 text-center">Grade</th>
                          <th className="py-3 px-3.5">Remarks / Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((entry, idx) => {
                          const maxMarks = Number(activeCTForGrading.totalMarks) || 20;
                          const hasScore = !entry.isAbsent && entry.marks !== "" && !isNaN(Number(entry.marks));
                          const numericScore = hasScore ? Number(entry.marks) : null;
                          const gradeInfo = hasScore ? getCTGradeDetails(numericScore, maxMarks) : null;

                          return (
                            <tr
                              key={entry.studentId || idx}
                              className={`transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                                entry.isAbsent ? "bg-rose-50/20 dark:bg-rose-950/10" : ""
                              }`}
                            >
                              <td className="py-2.5 px-3.5 text-slate-400 font-mono font-medium">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3.5">
                                <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded-md">
                                  {entry.studentId || "—"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5">
                                <div className="font-semibold text-slate-800 dark:text-slate-100">
                                  {entry.studentName || "Student"}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-xs font-mono">
                                  {entry.studentEmail || "—"}
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxMarks}
                                  step="0.5"
                                  disabled={entry.isAbsent}
                                  placeholder={entry.isAbsent ? "ABS" : "0"}
                                  value={entry.isAbsent ? "" : entry.marks}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateGradingEntry(entry.studentId, "marks", val);
                                  }}
                                  className={`w-20 px-2.5 py-1.5 text-center font-bold text-xs rounded-xl border outline-none transition ${
                                    entry.isAbsent
                                      ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                  }`}
                                />
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs select-none">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(entry.isAbsent)}
                                    onChange={(e) =>
                                      handleUpdateGradingEntry(entry.studentId, "isAbsent", e.target.checked)
                                    }
                                    className="w-4 h-4 text-rose-600 rounded border-slate-300 dark:border-slate-700 focus:ring-rose-500"
                                  />
                                  <span
                                    className={`text-[11px] font-bold ${
                                      entry.isAbsent
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {entry.isAbsent ? "Absent" : "Present"}
                                  </span>
                                </label>
                              </td>
                              <td className="py-2.5 px-3.5 text-center">
                                {entry.isAbsent ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                    Absent
                                  </span>
                                ) : gradeInfo ? (
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${gradeInfo.color}`}
                                  >
                                    <span>{gradeInfo.letter}</span>
                                    <span className="opacity-75 font-mono text-[10px]">
                                      ({Math.round((numericScore / maxMarks) * 100)}%)
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    Unmarked
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5">
                                <input
                                  type="text"
                                  placeholder="e.g. Well prepared, clear answers"
                                  value={entry.remarks || ""}
                                  onChange={(e) =>
                                    handleUpdateGradingEntry(entry.studentId, "remarks", e.target.value)
                                  }
                                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs text-slate-500">
              <span>
                Changes saved here will be immediately published to student course workspaces.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveCTForGrading(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveAllCTMarks}
                  disabled={isSavingCTMarks}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingCTMarks ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save All Student Marks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
