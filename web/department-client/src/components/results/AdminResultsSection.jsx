"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  RefreshCw, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Save, 
  X, 
  Check, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  FileText,
  Calendar,
  Users
} from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";
import { SEMESTER_LABELS, SEMESTER_KEYS } from "@/data/courses";

// Official PUST grading helper (Section 20.8 f)
function calcGradeFromMarks(marks) {
  const m = Number(marks);
  if (isNaN(m) || marks === "" || marks === null || marks === undefined) return { grade: "—", gp: 0.00 };
  if (m >= 80) return { grade: "A+", gp: 4.00 };
  if (m >= 75) return { grade: "A",  gp: 3.75 };
  if (m >= 70) return { grade: "A-", gp: 3.50 };
  if (m >= 65) return { grade: "B+", gp: 3.25 };
  if (m >= 60) return { grade: "B",  gp: 3.00 };
  if (m >= 55) return { grade: "B-", gp: 2.75 };
  if (m >= 50) return { grade: "C+", gp: 2.50 };
  if (m >= 45) return { grade: "C",  gp: 2.25 };
  if (m >= 40) return { grade: "D",  gp: 2.00 };
  return { grade: "F", gp: 0.00 };
}

// Attendance marks based on percentage (PUST Ordinance Sec 20.8 iv)
// 90% and above -> 10, 85% to <90% -> 9, 80% to <85% -> 8, 75% to <80% -> 7, 70% to <75% -> 6, 60% to <70% -> 5, <60% -> 0
function calcAttendanceMarks(percentage) {
  const p = Number(percentage);
  if (isNaN(p) || p < 0) return 0;
  if (p >= 90) return 10;
  if (p >= 85) return 9;
  if (p >= 80) return 8;
  if (p >= 75) return 7;
  if (p >= 70) return 6;
  if (p >= 60) return 5;
  return 0;
}

function getCourseType(courseCode, courseTitle) {
  const normTitle = String(courseTitle || '').toLowerCase();
  if (
    normTitle.includes('sessional') ||
    normTitle.includes('lab') ||
    normTitle.includes('project') ||
    normTitle.includes('drawing') ||
    normTitle.includes('thesis') ||
    normTitle.includes('viva')
  ) {
    return 'sessional';
  }
  return 'theory';
}

function getGradeBadgeClass(grade) {
  const g = String(grade || "").toUpperCase();
  if (g === "A+") return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700";
  if (g === "A")  return "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-700";
  if (g === "A-") return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-700";
  if (g === "B+" || g === "B") return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700";
  if (g === "B-" || g === "C+" || g === "C") return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700";
  if (g === "D")  return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/70 dark:text-orange-300 dark:border-orange-700";
  if (g === "F")  return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
}

export default function AdminResultsSection() {
  const [resultsList, setResultsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Session-first selection: Default to Session 2021-2022
  const [selectedSession, setSelectedSession] = useState("2021-2022");
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingTemplate, setFetchingTemplate] = useState(false);
  const [fetchingCA, setFetchingCA] = useState(false);
  const [entryMode, setEntryMode] = useState("criteria"); // "criteria" (Att + CA + Final) | "total" (Total Marks 100)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State for Fill/Edit
  const [formState, setFormState] = useState({
    id: null,
    studentId: "",
    studentName: "",
    studentEmail: "",
    semester: 1,
    session: "2021-2022",
    examYear: new Date().getFullYear(),
    status: "published",
    remarks: "",
    courses: [],
  });

  const loadData = async (showToast = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSession && selectedSession !== "all") {
        params.append("session", selectedSession);
      }
      if (selectedSemesterFilter !== "all") {
        params.append("semester", selectedSemesterFilter);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await apiFetch(`/api/results/admin/list?${params.toString()}`);
      if (!res.ok) throw new Error(res.data?.error || "Failed to fetch results");
      const data = res.data;

      setResultsList(data.results || []);
      if (data.students) {
        setStudentsList(data.students);
      }
      if (data.sessions && Array.isArray(data.sessions)) {
        setSessionsList(data.sessions);
        // If current selectedSession is not in the list, set to first available session
        if (selectedSession !== "all" && !data.sessions.some(s => s.session === selectedSession) && data.sessions.length > 0) {
          setSelectedSession(data.sessions[0].session);
        }
      }
      if (showToast) {
        toast.success("Semester results refreshed!");
      }
    } catch (err) {
      console.error("Error loading results for admin:", err);
      if (showToast) {
        toast.error(err.message || "Could not fetch results");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [selectedSession, selectedSemesterFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(false);
  };

  // Find metadata of current selected session
  const activeSessionMeta = useMemo(() => {
    if (!selectedSession || selectedSession === "all") return null;
    return sessionsList.find((s) => s.session === selectedSession) || null;
  }, [sessionsList, selectedSession]);

  // Determine what semesters should be shown for this session
  // If students of this session are in Semester 7, show Semesters 1 to 7!
  const availableSemesters = useMemo(() => {
    if (!activeSessionMeta) {
      return [1, 2, 3, 4, 5, 6, 7, 8];
    }
    const maxSem = Math.min(8, Math.max(1, activeSessionMeta.currentSemester || 7));
    const list = [];
    for (let i = 1; i <= maxSem; i++) {
      list.push(i);
    }
    return list;
  }, [activeSessionMeta]);

  // Filter students belonging to the active session for the modal
  const studentsInActiveSession = useMemo(() => {
    if (!selectedSession || selectedSession === "all") {
      return studentsList;
    }
    return studentsList.filter((s) => s.session === selectedSession);
  }, [studentsList, selectedSession]);

  // Open modal to add a brand new semester result for a student in this session
  const openAddModal = async (targetStudent = null, targetSemester = null) => {
    setIsEditing(false);
    const initialSem = targetSemester || (selectedSemesterFilter !== "all" ? Number(selectedSemesterFilter) : 1);
    const sessionToUse = selectedSession !== "all" ? selectedSession : (targetStudent?.session || "2021-2022");
    
    const candidateStudents = selectedSession !== "all" ? studentsInActiveSession : studentsList;
    const initialStudent = targetStudent || (candidateStudents.length > 0 ? candidateStudents[0] : null);

    setFormState({
      id: null,
      studentId: initialStudent?.studentId || "",
      studentName: initialStudent?.name || "",
      studentEmail: initialStudent?.email || "",
      semester: initialSem,
      session: sessionToUse,
      examYear: new Date().getFullYear(),
      status: "published",
      remarks: "Official Semester Examination Result",
      courses: [],
    });
    setIsModalOpen(true);

    if (initialStudent?.studentId) {
      await autoFetchCAMetrics(initialStudent.studentId, initialSem);
    } else {
      await autoFetchCurriculum(initialSem);
    }
  };

  // Open modal to edit existing result
  const openEditModal = async (resultSummary) => {
    setIsEditing(true);
    try {
      setLoading(true);
      const res = await apiFetch(`/api/results/admin/student/${resultSummary.studentId}`);
      if (!res.ok) throw new Error(res.data?.error || "Failed to load student result");
      const data = res.data;
      const existing = (data.results || []).find((r) => r.semester === resultSummary.semester);

      if (existing) {
        setFormState({
          id: existing._id,
          studentId: existing.studentId,
          studentName: existing.studentName,
          studentEmail: existing.studentEmail,
          semester: existing.semester,
          session: existing.session || selectedSession || "2021-2022",
          examYear: existing.examYear || new Date().getFullYear(),
          status: existing.status || "published",
          remarks: existing.remarks || "",
          courses: (existing.courses || []).map((c) => {
            const courseType = c.courseType || getCourseType(c.courseCode, c.courseTitle);
            const totalM = c.marks ?? "";
            const { grade, gp } = calcGradeFromMarks(totalM !== "" ? totalM : null);
            return {
              courseCode: c.courseCode,
              courseTitle: c.courseTitle,
              courseType,
              credits: c.credits,
              attendancePercentage: c.attendancePercentage ?? "",
              attendanceMarks: c.attendanceMarks ?? "",
              caMarks: c.caMarks ?? c.continuousMarks ?? "",
              finalMarks: c.finalMarks ?? "",
              marks: totalM,
              grade: totalM !== "" ? grade : (c.grade || "—"),
              gradePoint: totalM !== "" ? gp : (c.gradePoint ?? 0.00),
            };
          }),
        });
        setIsModalOpen(true);
      } else {
        toast.error("Could not find full record for editing.");
      }
    } catch (err) {
      console.error("Error opening edit modal:", err);
      toast.error("Failed to load result for editing");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill official curriculum courses from SEMESTER_COURSES
  const autoFetchCurriculum = async (semNum) => {
    try {
      setFetchingTemplate(true);
      const res = await apiFetch(`/api/results/admin/courses-template?semester=${semNum}`);
      if (!res.ok) throw new Error(res.data?.error || "Failed to fetch template");
      const data = res.data;

      setFormState((prev) => ({
        ...prev,
        semester: semNum,
        courses: (data.courses || []).map((c) => {
          const courseType = getCourseType(c.courseCode, c.courseTitle);
          return {
            courseCode: c.courseCode,
            courseTitle: c.courseTitle,
            courseType,
            credits: c.credits,
            attendancePercentage: 100,
            attendanceMarks: 10,
            caMarks: courseType === "sessional" ? 25 : 18,
            finalMarks: "",
            marks: "",
            grade: "—",
            gradePoint: 0.00,
          };
        }),
      }));
      toast.success(`Loaded official curriculum for Semester ${semNum}!`);
    } catch (err) {
      console.error("Error auto-fetching curriculum:", err);
      toast.error("Failed to load semester curriculum");
    } finally {
      setFetchingTemplate(false);
    }
  };

  // Auto-fetch continuous assessment (CA) marks and attendance percentage directly from database
  const autoFetchCAMetrics = async (targetStudentId = null, targetSem = null) => {
    const sId = targetStudentId || formState.studentId;
    const sem = targetSem || formState.semester;
    if (!sId) {
      toast.error("Please select a student first.");
      return;
    }
    try {
      setFetchingCA(true);
      const res = await apiFetch(`/api/results/admin/student-ca-metrics?studentId=${encodeURIComponent(sId)}&semester=${sem}`);
      if (!res.ok) throw new Error(res.data?.error || "Failed to fetch student CA & attendance records");
      const data = res.data;

      setFormState((prev) => {
        const mergedCourses = (data.courses || []).map((fresh) => {
          const existing = (prev.courses || []).find((x) => x.courseCode === fresh.courseCode);
          const finalM = existing?.finalMarks !== undefined && existing?.finalMarks !== null && existing?.finalMarks !== ""
            ? existing.finalMarks
            : "";
          const attM = fresh.attendanceMarks !== null && fresh.attendanceMarks !== undefined ? fresh.attendanceMarks : 10;
          const caM = fresh.caMarks !== null && fresh.caMarks !== undefined ? fresh.caMarks : (fresh.courseType === "sessional" ? 25 : 18);

          let totalM = "";
          if (finalM !== "") {
            totalM = Number((Number(attM || 0) + Number(caM || 0) + Number(finalM || 0)).toFixed(1));
          } else if (existing?.marks) {
            totalM = existing.marks;
          }

          const { grade, gp } = calcGradeFromMarks(totalM !== "" ? totalM : null);

          return {
            courseCode: fresh.courseCode,
            courseTitle: fresh.courseTitle,
            courseType: fresh.courseType,
            credits: fresh.credits,
            attendanceSessionsHeld: fresh.attendanceSessionsHeld,
            attendanceSessionsPresent: fresh.attendanceSessionsPresent,
            attendancePercentage: fresh.attendancePercentage,
            attendanceMarks: attM,
            caMarks: caM,
            maxCaMarks: fresh.maxCaMarks,
            maxFinalMarks: fresh.maxFinalMarks,
            finalMarks: finalM,
            marks: totalM,
            grade: totalM !== "" ? grade : "—",
            gradePoint: totalM !== "" ? gp : 0.00,
          };
        });

        return {
          ...prev,
          courses: mergedCourses,
        };
      });

      toast.success(`Loaded teacher continuous assessments & attendance for ${data.studentName || sId}!`);
    } catch (err) {
      console.error("Error fetching student CA metrics:", err);
      toast.error(err.message || "Failed to fetch continuous assessment & attendance records.");
    } finally {
      setFetchingCA(false);
    }
  };

  // When student selection changes
  const handleStudentSelect = async (studentId) => {
    const student = studentsList.find((s) => String(s.studentId) === String(studentId));
    if (student) {
      setFormState((prev) => ({
        ...prev,
        studentId: student.studentId,
        studentName: student.name,
        studentEmail: student.email,
        session: student.session || prev.session,
      }));
      await autoFetchCAMetrics(student.studentId, formState.semester);
    }
  };

  // Handle course input changes with AUTO-FIXED Grade & GradePoint
  const handleCourseChange = (index, field, value) => {
    setFormState((prev) => {
      const updated = [...prev.courses];
      const target = { ...updated[index], [field]: value };

      // Attendance percentage changed -> recalculate attendance marks (0-10) using Section 20.8 iv
      if (field === "attendancePercentage") {
        target.attendanceMarks = calcAttendanceMarks(value);
      }

      // If criteria marks changed, auto-sum total marks = Attendance + CA + Final Exam
      if (
        field === "attendancePercentage" ||
        field === "attendanceMarks" ||
        field === "caMarks" ||
        field === "finalMarks"
      ) {
        const att = Number(target.attendanceMarks || 0);
        const ca = Number(target.caMarks || 0);
        const fin = target.finalMarks !== "" && target.finalMarks !== null && target.finalMarks !== undefined
          ? Number(target.finalMarks)
          : null;

        if (fin !== null) {
          target.marks = Number((att + ca + fin).toFixed(1));
        } else if (target.attendanceMarks !== "" || target.caMarks !== "") {
          target.marks = Number((att + ca).toFixed(1));
        }
      }

      // If direct total marks was entered
      if (field === "marks") {
        target.marks = value;
      }

      // AUTO-FIXED GRADE & GRADE POINT: Strictly calculated from target.marks
      const { grade, gp } = calcGradeFromMarks(target.marks);
      target.grade = target.marks !== "" && target.marks !== null && target.marks !== undefined ? grade : "—";
      target.gradePoint = target.marks !== "" && target.marks !== null && target.marks !== undefined ? gp : 0.00;

      updated[index] = target;
      return { ...prev, courses: updated };
    });
  };

  const addCourseRow = () => {
    setFormState((prev) => ({
      ...prev,
      courses: [
        ...prev.courses,
        {
          courseCode: `CSE ${prev.semester}100`,
          courseTitle: "New Course",
          credits: 3.0,
          marks: "",
          grade: "A",
          gradePoint: 3.75,
        },
      ],
    }));
  };

  const removeCourseRow = (index) => {
    setFormState((prev) => {
      const updated = [...prev.courses];
      updated.splice(index, 1);
      return { ...prev, courses: updated };
    });
  };

  // Computed modal metrics preview according to Official PUST Ordinance Equations (I), (II), (III)
  const modalMetrics = useMemo(() => {
    let totCredits = 0;
    let earned = 0;
    let points = 0;
    for (const c of formState.courses) {
      const cr = Number(c.credits) || 0;
      const gp = Number(c.gradePoint) || 0;
      totCredits += cr;
      if (c.grade !== "F" && gp > 0) {
        earned += cr;
      }
      points += cr * gp;
    }
    const sgpa = totCredits > 0 ? Number((points / totCredits).toFixed(2)) : 0.00;
    const sgpaExact = totCredits > 0 ? (points / totCredits).toFixed(3) : "0.000";
    return {
      totCredits: Number(totCredits.toFixed(2)),
      earned: Number(earned.toFixed(2)),
      points: Number(points.toFixed(2)),
      sgpa,
      sgpaExact,
      isDeansList: sgpa >= 3.80,
    };
  }, [formState.courses]);

  // Save / Publish Result
  const handleSaveResult = async (e) => {
    e.preventDefault();
    if (!formState.studentId) {
      toast.error("Please select a student.");
      return;
    }
    if (!formState.courses || formState.courses.length === 0) {
      toast.error("Please add at least one course.");
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch("/api/results/admin/save", {
        method: "POST",
        body: {
          studentId: formState.studentId,
          studentName: formState.studentName,
          studentEmail: formState.studentEmail,
          semester: Number(formState.semester),
          session: formState.session,
          examYear: Number(formState.examYear),
          remarks: formState.remarks,
          status: formState.status,
          courses: formState.courses,
        },
      });

      if (!res.ok) throw new Error(res.data?.error || "Failed to save semester result");
      const data = res.data;

      toast.success(data?.message || "Result saved successfully!");
      setIsModalOpen(false);
      await loadData(false);
    } catch (err) {
      console.error("Error saving result:", err);
      toast.error(err.message || "Failed to save semester result.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Result
  const handleDeleteResult = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await apiFetch(`/api/results/admin/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(res.data?.error || "Failed to delete result");

      toast.success("Result deleted successfully");
      setDeleteTarget(null);
      await loadData(false);
    } catch (err) {
      console.error("Error deleting result:", err);
      toast.error(err.message || "Failed to delete result");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ───────────────────────────────────── */}
      <div className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold mb-2 border border-purple-200 dark:border-purple-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Academic Session Examination Controller</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <Award className="w-7 h-7 text-purple-600" />
              <span>Semester Results Management by Session</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select an academic session to manage semester results (Sem 1, Sem 2, etc.) for students currently enrolled in that session.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
              title="Refresh results list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => openAddModal()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Fill / Publish Semester Result</span>
            </button>
          </div>
        </div>

        {/* ── 1. PRIMARY SELECTION: ACADEMIC SESSIONS ──────────────── */}
        <div className="space-y-2 p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
          <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider px-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Step 1: Select Academic Session (Batch)</span>
            </div>
            <span className="text-[11px] font-normal normal-case text-purple-700 dark:text-purple-300">
              Students and semesters will dynamically adapt to the selected session
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {sessionsList.map((sess) => {
              const isSelected = selectedSession === sess.session;
              return (
                <button
                  key={sess.session}
                  onClick={() => {
                    setSelectedSession(sess.session);
                    setSelectedSemesterFilter("all");
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                    isSelected
                      ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25 scale-[1.02]"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-purple-50/50 dark:hover:bg-slate-700"
                  }`}
                >
                  <Calendar className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-purple-500"}`} />
                  <div className="text-left">
                    <div className="leading-tight font-extrabold flex items-center gap-1.5">
                      <span>Session {sess.session}</span>
                      {sess.batch && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"}`}>
                          Batch {sess.batch}
                        </span>
                      )}
                    </div>
                    <div className={`text-[10px] font-medium leading-none mt-1 ${isSelected ? "text-purple-200" : "text-slate-500 dark:text-slate-400"}`}>
                      Current: <strong>Semester {sess.currentSemester}</strong> • {sess.studentsCount} Students
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => {
                setSelectedSession("all");
                setSelectedSemesterFilter("all");
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                selectedSession === "all"
                  ? "bg-purple-600 text-white border-purple-600 shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-100"
              }`}
            >
              All Sessions
            </button>
          </div>
        </div>

        {/* ── 2. SECONDARY SELECTION: SEMESTERS FOR THIS SESSION ──── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300 shrink-0 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>Step 2: Semesters for this Session:</span>
            </span>

            <button
              onClick={() => setSelectedSemesterFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedSemesterFilter === "all"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Semesters
            </button>

            {availableSemesters.map((s) => {
              const isSelected = selectedSemesterFilter === String(s);
              const isCurrent = activeSessionMeta?.currentSemester === s;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSemesterFilter(String(s))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? "bg-purple-600 text-white shadow-sm"
                      : isCurrent
                      ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Sem {s}</span>
                  {isCurrent && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Student ID, Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </form>
        </div>

        {/* ── Active Session & Count Pill ──────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Session:</span>
            <strong className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 font-extrabold">
              {selectedSession === "all" ? "All Sessions" : `Session ${selectedSession}`}
            </strong>
            {activeSessionMeta && (
              <span className="text-slate-500">
                (Students are in <strong>Semester {activeSessionMeta.currentSemester}</strong>)
              </span>
            )}
            <span>•</span>
            <span>Showing <strong className="text-purple-600 dark:text-purple-400">{resultsList.length}</strong> {resultsList.length === 1 ? "student record" : "student records"} {selectedSemesterFilter !== "all" ? `in Semester ${selectedSemesterFilter}` : ""}</span>
          </div>

          {selectedSemesterFilter !== "all" && resultsList.length > 1 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multiple students enrolled in this session</span>
            </span>
          )}
        </div>

        {/* ── Results Table ────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 uppercase tracking-wider text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-3 text-center">Batch Session</th>
                <th className="py-3 px-3 text-center">Semester</th>
                <th className="py-3 px-3 text-center">Credits (Σ Ci)</th>
                <th className="py-3 px-3 text-center">Points (Σ Ci*Gi)</th>
                <th className="py-3 px-3 text-center">Term GPA (I)</th>
                <th className="py-3 px-3 text-center">Yearly YGPA (II)</th>
                <th className="py-3 px-3 text-center">Cumulative CGPA (III)</th>
                <th className="py-3 px-3 text-center">Honors / Standing</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading && resultsList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-purple-600" />
                    Loading semester results...
                  </td>
                </tr>
              ) : resultsList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <GraduationCap className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No results found for {selectedSession === "all" ? "this filter" : `Session ${selectedSession}`} {selectedSemesterFilter !== "all" ? `Semester ${selectedSemesterFilter}` : ""}.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "+ Fill / Publish Semester Result" above to create or publish results for this session.
                    </p>
                  </td>
                </tr>
              ) : (
                resultsList.map((r) => {
                  const isDeans = r.isDeansList || Number(r.cgpa || 0) >= 3.80;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{r.studentName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">{r.studentId}</span>
                          <span>•</span>
                          <span>{r.studentEmail}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {r.session}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
                          Semester {r.semester}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-bold">
                        {Number(r.totalCredits || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300">
                        {r.totalGradePoints !== undefined && r.totalGradePoints !== null
                          ? Number(r.totalGradePoints).toFixed(2)
                          : "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          {Number(r.sgpa || 0).toFixed(2)}
                        </div>
                        {r.sgpaExact && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {Number(r.sgpaExact).toFixed(3)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-bold text-sky-700 dark:text-sky-300 text-xs">
                          {r.ygpa !== undefined && r.ygpa !== null ? Number(r.ygpa).toFixed(2) : "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">
                          Yr {Math.ceil(r.semester / 2)}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-black text-amber-600 dark:text-amber-400 text-sm">
                          {Number(r.cgpa || 0).toFixed(2)}
                        </div>
                        {r.cgpaExact && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {Number(r.cgpaExact).toFixed(3)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDeans ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 shadow-sm" title="Section 20.9 Dean's List (CGPA ≥ 3.80)">
                            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>★ Dean's List</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Good Standing
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(r)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-[11px] font-bold transition-colors"
                            title="Edit Semester Result"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors"
                            title="Delete Semester Result"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fill / Edit Modal ───────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 my-8 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {isEditing ? `Edit Semester ${formState.semester} Result for Session ${formState.session}` : `Fill & Publish Result for Session ${formState.session}`}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Official grading sheet for departmental records. Managed strictly by session & semester.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveResult} className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Session, Student & Semester Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Academic Session */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Academic Session
                  </label>
                  <select
                    value={formState.session}
                    onChange={(e) => {
                      const newSess = e.target.value;
                      setFormState((prev) => ({ ...prev, session: newSess }));
                    }}
                    disabled={isEditing}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500 font-bold"
                  >
                    {sessionsList.map((s) => (
                      <option key={s.session} value={s.session}>
                        Session {s.session} (Sem {s.currentSemester})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student (Session {formState.session})
                  </label>
                  <select
                    value={formState.studentId}
                    onChange={(e) => handleStudentSelect(e.target.value)}
                    disabled={isEditing}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select Student...</option>
                    {studentsList
                      .filter((s) => !formState.session || s.session === formState.session)
                      .map((s) => (
                        <option key={s.studentId} value={s.studentId}>
                          {s.name} ({s.studentId}) — Sem {s.semester || "N/A"}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Semester Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={formState.semester}
                    onChange={(e) => {
                      const semNum = Number(e.target.value);
                      setFormState((prev) => ({ ...prev, semester: semNum }));
                    }}
                    disabled={isEditing}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s} ({SEMESTER_LABELS[s] || `${s}th Semester`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exam Year */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Year
                  </label>
                  <input
                    type="number"
                    value={formState.examYear}
                    onChange={(e) => setFormState((prev) => ({ ...prev, examYear: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* Course Action Toolbar */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 mr-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span>Courses ({formState.courses.length})</span>
                  </div>

                  {/* Entry Mode Toggle (Criteria Breakdown vs Total Marks) */}
                  <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold border border-slate-200 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setEntryMode("criteria")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        entryMode === "criteria"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Attendance 10% (Sec 20.8 iv) + Teacher CA 20/30% + Final Exam 70/60% = 100"
                    >
                      Criteria Breakdown (30/70 & 40/60)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryMode("total")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        entryMode === "total"
                          ? "bg-purple-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                      title="Direct Total Marks Entry (100 Marks)"
                    >
                      Direct Total Marks (100)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Button to Auto-Fetch Teacher Continuous Assessment & Attendance */}
                  <button
                    type="button"
                    onClick={() => autoFetchCAMetrics()}
                    disabled={fetchingCA || !formState.studentId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-sm"
                    title="Auto-fetch present attendance percentage & teacher continuous assessment marks from database"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${fetchingCA ? "animate-spin text-emerald-500" : "text-emerald-600"}`} />
                    <span>{fetchingCA ? "Fetching..." : "Auto-Fetch Teacher CA & Attendance"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => autoFetchCurriculum(formState.semester)}
                    disabled={fetchingTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors"
                  >
                    <span>{fetchingTemplate ? "Loading..." : `Reset Curriculum Courses`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={addCourseRow}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Mode Guidance Alert */}
              <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-[11px] text-purple-900 dark:text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Auto-Fixed Grading Enabled:</strong> Grade (LG) and Grade Point (Gi) are automatically calculated from Total Marks (100). Manual selection is removed.
                  </span>
                </div>
                {entryMode === "criteria" ? (
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    Theory: Att (10) + CA (20) + Final (70) | Sessional: Att (10) + CA (30) + Final (60)
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                    Enter Total Marks directly (0–100)
                  </span>
                )}
              </div>

              {/* Courses Grid / Table matching Ordinance Section 20.8.1.1 */}
              <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 uppercase tracking-wider text-[10px] font-extrabold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                      <th className="py-2.5 px-3 min-w-[100px]">Course Code</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Course Title</th>
                      <th className="py-2.5 px-2 text-center w-16">Type</th>
                      <th className="py-2.5 px-2 text-center w-16">Credit (Ci)</th>

                      {entryMode === "criteria" ? (
                        <>
                          <th className="py-2.5 px-2 text-center w-20" title="Attendance Percentage (PUST Section 20.8 iv)">Att %</th>
                          <th className="py-2.5 px-2 text-center w-20" title="Attendance Marks (0-10, auto-calculated from attendance %)">Att (10)</th>
                          <th className="py-2.5 px-2 text-center w-24" title="Continuous Assessment / Class Tests & Assignments (Max 20 for theory, 30 for sessional)">CA (20/30)</th>
                          <th className="py-2.5 px-2 text-center w-24" title="Semester Final Examination Marks (Max 70 for theory, 60 for sessional)">Final (70/60)</th>
                          <th className="py-2.5 px-2 text-center w-24 font-bold text-purple-700 dark:text-purple-300">Total (100)</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-2 text-center w-24 font-bold text-purple-700 dark:text-purple-300">Total Marks (100)</th>
                      )}

                      <th className="py-2.5 px-2 text-center w-20">Grade (LG)</th>
                      <th className="py-2.5 px-2 text-center w-20">Grade Point (Gi)</th>
                      <th className="py-2.5 px-2 text-center w-24 font-mono">Points (Ci * Gi)</th>
                      <th className="py-2.5 px-2 text-center w-10">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {formState.courses.map((course, idx) => {
                      const cr = Number(course.credits || 0);
                      const gp = Number(course.gradePoint || 0);
                      const creditPoints = (cr * gp).toFixed(2);
                      const isSessional = course.courseType === "sessional" || getCourseType(course.courseCode, course.courseTitle) === "sessional";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={course.courseCode}
                              onChange={(e) => handleCourseChange(idx, "courseCode", e.target.value)}
                              className="w-full px-2 py-1 rounded-lg text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                              required
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={course.courseTitle}
                              onChange={(e) => handleCourseChange(idx, "courseTitle", e.target.value)}
                              className="w-full px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                              required
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isSessional
                                ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                                : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            }`}>
                              {isSessional ? "Lab" : "Theory"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              step="0.25"
                              value={course.credits}
                              onChange={(e) => handleCourseChange(idx, "credits", e.target.value)}
                              className="w-full px-1.5 py-1 rounded-lg text-xs text-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                              required
                            />
                          </td>

                          {/* Criteria Mode Breakdown Inputs */}
                          {entryMode === "criteria" ? (
                            <>
                              {/* Attendance Percentage */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={course.attendancePercentage ?? ""}
                                  onChange={(e) => handleCourseChange(idx, "attendancePercentage", e.target.value)}
                                  placeholder="e.g. 95"
                                  className="w-full px-1 py-1 rounded-lg text-xs text-center font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-purple-500"
                                  title="Attendance Percentage (>=90% gives 10 marks)"
                                />
                              </td>

                              {/* Attendance Marks (0-10) */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.5"
                                  value={course.attendanceMarks ?? ""}
                                  onChange={(e) => handleCourseChange(idx, "attendanceMarks", e.target.value)}
                                  placeholder="10"
                                  className="w-full px-1 py-1 rounded-lg text-xs text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 focus:ring-1 focus:ring-emerald-500"
                                  title="Attendance Marks (out of 10) - Auto-calculated from percentage or manual override"
                                />
                              </td>

                              {/* Continuous Assessment (CA) / CT Marks (20 for theory, 30 for sessional) */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={isSessional ? 30 : 20}
                                  step="0.5"
                                  value={course.caMarks ?? ""}
                                  onChange={(e) => handleCourseChange(idx, "caMarks", e.target.value)}
                                  placeholder={isSessional ? "Max 30" : "Max 20"}
                                  className="w-full px-1.5 py-1 rounded-lg text-xs text-center font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 focus:ring-1 focus:ring-indigo-500"
                                  title={`Continuous Assessment Marks (Max ${isSessional ? 30 : 20}) from teacher CTs & assignments`}
                                />
                              </td>

                              {/* Semester Final Exam Marks (70 for theory, 60 for sessional) */}
                              <td className="py-2 px-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={isSessional ? 60 : 70}
                                  step="0.5"
                                  value={course.finalMarks ?? ""}
                                  onChange={(e) => handleCourseChange(idx, "finalMarks", e.target.value)}
                                  placeholder={isSessional ? "Max 60" : "Max 70"}
                                  className="w-full px-1.5 py-1 rounded-lg text-xs text-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-purple-500"
                                  title={`Semester Final Exam Marks (Max ${isSessional ? 60 : 70})`}
                                />
                              </td>

                              {/* Total Marks (Auto-summed = Att + CA + Final) */}
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={course.marks ?? ""}
                                  onChange={(e) => handleCourseChange(idx, "marks", e.target.value)}
                                  placeholder="Auto"
                                  className="w-full px-1.5 py-1 rounded-lg text-xs text-center font-black text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 focus:ring-1 focus:ring-purple-500"
                                  title="Total Marks (100) = Attendance + CA + Final Exam"
                                />
                              </td>
                            </>
                          ) : (
                            /* Direct Total Marks Mode */
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={course.marks ?? ""}
                                onChange={(e) => handleCourseChange(idx, "marks", e.target.value)}
                                placeholder="e.g. 85"
                                className="w-full px-2 py-1 rounded-lg text-xs text-center font-black text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:ring-1 focus:ring-purple-500"
                                title="Enter Total Marks (0-100)"
                              />
                            </td>
                          )}

                          {/* AUTO-FIXED GRADE (LG) - NO SELECT DROPDOWN! */}
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-black border ${getGradeBadgeClass(course.grade)} shadow-sm`}>
                              {course.grade || "—"}
                            </span>
                          </td>

                          {/* AUTO-FIXED GRADE POINT (Gi) */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                            {gp.toFixed(2)}
                          </td>

                          {/* Points (Ci * Gi) */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {creditPoints}
                          </td>

                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeCourseRow(idx)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/90 font-bold border-t border-slate-200 dark:border-white/10 text-[11px]">
                      <td colSpan={3} className="py-2 px-3 text-right uppercase tracking-wider text-slate-500">
                        Total Σ:
                      </td>
                      <td className="py-2 px-2 text-center font-black text-purple-700 dark:text-purple-300">
                        {modalMetrics.totCredits} Credits
                      </td>
                      {entryMode === "criteria" ? (
                        <>
                          <td className="py-2 px-1 text-center text-slate-400">—</td>
                          <td className="py-2 px-1 text-center text-slate-400">—</td>
                          <td className="py-2 px-1 text-center text-slate-400">—</td>
                          <td className="py-2 px-1 text-center text-slate-400">—</td>
                          <td className="py-2 px-2 text-center text-slate-400">—</td>
                        </>
                      ) : (
                        <td className="py-2 px-2 text-center text-slate-400">—</td>
                      )}
                      <td className="py-2 px-2 text-center text-slate-400">—</td>
                      <td className="py-2 px-2 text-center text-slate-400">—</td>
                      <td className="py-2 px-2 text-center font-black text-indigo-700 dark:text-indigo-300">
                        {modalMetrics.points} Points
                      </td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Real-time Computed Summary matching Equations (I) & (II) */}
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Registered Credits (Σ Ci)</span>
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {modalMetrics.totCredits}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Earned Credits</span>
                      <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {modalMetrics.earned}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Earned Points (Σ Ci*Gi)</span>
                      <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                        {modalMetrics.points}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Semester GPA (Formula I)</span>
                      <div className="text-xl font-black text-purple-700 dark:text-purple-300 flex items-baseline gap-1.5">
                        <span>{modalMetrics.sgpa.toFixed(2)}</span>
                        <span className="text-xs text-slate-400 font-normal">({modalMetrics.sgpaExact})</span>
                      </div>
                    </div>
                  </div>

                  {modalMetrics.isDeansList && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 shadow-sm animate-pulse">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Dean's List Eligible (GPA ≥ 3.80, Sec 20.9)</span>
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/60 text-[11px] text-purple-700 dark:text-purple-300 flex items-center justify-between">
                  <span className="font-mono">
                    GPA = (Σ Ci * Gi) / (Σ Ci) = {modalMetrics.points} / {modalMetrics.totCredits} = {modalMetrics.sgpaExact} ≈ {modalMetrics.sgpa.toFixed(2)}
                  </span>
                  <span>
                    Yearly YGPA (Equation II) and CGPA (Equation III) update automatically on save.
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Controller Remarks
                </label>
                <input
                  type="text"
                  value={formState.remarks}
                  onChange={(e) => setFormState((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="e.g. Official Semester Examination Result Published"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving & Publishing..." : "Save & Publish Result"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Semester Result?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete the <strong>Semester {deleteTarget.semester}</strong> result for <strong>{deleteTarget.studentName}</strong> ({deleteTarget.studentId}) in <strong>Session {deleteTarget.session}</strong>?
              This will automatically recalculate the student's cumulative CGPA.
            </p>
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/10">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteResult}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
