"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  Users, 
  UserCheck, 
  UserX, 
  GraduationCap, 
  Presentation, 
  Briefcase, 
  ShieldCheck, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Mail, 
  Phone, 
  Hash, 
  Calendar,
  BookOpen,
  Bell,
  PlusCircle,
  Trash2,
  Download,
  CheckCheck,
  Send,
  AlertCircle,
  Sparkles,
  FileText,
  Edit3,
  MapPin,
  Save,
  Coffee,
  X,
  User,
  Lock,
  ShieldAlert,
  Check,
  LifeBuoy,
  MessageSquareWarning,
  Eye
} from "lucide-react";
import toast from "react-hot-toast";
import { SEMESTER_COURSES, SEMESTER_LABELS, SEMESTER_KEYS } from "@/data/courses";
import Loading from "@/components/common/Loading";
import { AdminAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";
import { 
  SectionCollapseToggle, 
  CollapsibleBody, 
  DashboardCollapseControls 
} from "@/components/dashboard/CollapsibleSection";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

const ROUTINE_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
const ROUTINE_SEMESTERS = [
  { id: 1, label: "1-1", full: "1st Semester" },
  { id: 2, label: "1-2", full: "2nd Semester" },
  { id: 3, label: "2-1", full: "3rd Semester" },
  { id: 4, label: "2-2", full: "4th Semester" },
  { id: 5, label: "3-1", full: "5th Semester" },
  { id: 6, label: "3-2", full: "6th Semester" },
  { id: 7, label: "4-1", full: "7th Semester" },
  { id: 8, label: "4-2", full: "8th Semester" },
];
const ROUTINE_TIME_SLOTS = [
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
  "12:00 - 01:00",
  "01:00 - 02:00",
  "02:00 - 03:00",
  "03:00 - 04:00",
  "04:00 - 05:00",
];

export default function AdminDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const [initialLoading, setInitialLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingStudents: 0,
    approvedStudents: 0,
    totalTeachers: 0,
    pendingTeachers: 0,
    approvedTeachers: 0,
    totalEmployees: 0,
    pendingEmployees: 0,
    approvedEmployees: 0,
    totalUsers: 0,
  });
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [teacherTab, setTeacherTab] = useState("all");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [employeeTab, setEmployeeTab] = useState("all");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    kpi: false,
    analytics: false,
    students: false,
    faculty: false,
    routine: false,
    courses: false,
    notices: false,
    support: false,
    employees: false,
  });

  const toggleSection = (key) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const collapseAllSections = () => {
    setCollapsedSections({
      kpi: true,
      analytics: true,
      students: true,
      faculty: true,
      routine: true,
      courses: true,
      notices: true,
      support: true,
      employees: true,
    });
  };

  const expandAllSections = () => {
    setCollapsedSections({
      kpi: false,
      analytics: false,
      students: false,
      faculty: false,
      routine: false,
      courses: false,
      notices: false,
      support: false,
      employees: false,
    });
  };

  const allCollapsed = Object.values(collapsedSections).every(Boolean);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      if (hash === "analytics") setCollapsedSections((p) => ({ ...p, analytics: false }));
      if (hash === "pending" || hash === "students") setCollapsedSections((p) => ({ ...p, students: false }));
      if (hash === "faculty") setCollapsedSections((p) => ({ ...p, faculty: false }));
      if (hash === "routine") setCollapsedSections((p) => ({ ...p, routine: false }));
      if (hash === "courses") setCollapsedSections((p) => ({ ...p, courses: false }));
      if (hash === "notices") setCollapsedSections((p) => ({ ...p, notices: false }));
      if (hash === "support-complaints") setCollapsedSections((p) => ({ ...p, support: false }));
      if (hash === "directory" || hash === "employees") setCollapsedSections((p) => ({ ...p, employees: false }));
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Support & Complaints states
  const [supportRecords, setSupportRecords] = useState([]);
  const [supportFilter, setSupportFilter] = useState("all");
  const [supportSearch, setSupportSearch] = useState("");
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [adminResponseDraft, setAdminResponseDraft] = useState("");
  const [selectedNewStatus, setSelectedNewStatus] = useState("Resolved");
  const [updatingSupportId, setUpdatingSupportId] = useState(null);

  // Routine Studio states
  const [selectedRoutineSemester, setSelectedRoutineSemester] = useState("7");
  const [isSeedingRoutine, setIsSeedingRoutine] = useState(false);
  const [editingRoutineCell, setEditingRoutineCell] = useState(null); // { day, semester, timeSlot }
  const [routineFormData, setRoutineFormData] = useState({
    courseCode: "",
    teacherId: "",
    teacherName: "",
    room: "",
  });
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);

  // Modal / Inline Form states
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ code: "", title: "", credits: "3.0", semester: "1st Semester", faculty: "" });
  const [selectedCourseSemester, setSelectedCourseSemester] = useState("all");
  const [courseSearch, setCourseSearch] = useState("");
  const [isSyncingCurriculum, setIsSyncingCurriculum] = useState(false);

  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [newNotice, setNewNotice] = useState({ title: "", category: "Academic", audience: "All Members", content: "", priority: "Normal" });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch(`${SERVER_URL}/api/admin/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Students
      const studentsRes = await fetch(`${SERVER_URL}/api/students`);
      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students || []);
      }

      // 3. Fetch Teachers
      const teachersRes = await fetch(`${SERVER_URL}/api/teachers`);
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers || []);
      }

      // 4. Fetch Employees
      const employeesRes = await fetch(`${SERVER_URL}/api/employees`);
      if (employeesRes.ok) {
        const data = await employeesRes.json();
        setEmployees(data.employees || []);
      }

      // 5. Fetch Courses
      const coursesRes = await fetch(`${SERVER_URL}/api/courses`);
      if (coursesRes.ok) {
        const data = await coursesRes.json();
        setCourses(data.courses || []);
      }

      // 6. Fetch Notices
      const noticesRes = await fetch(`${SERVER_URL}/api/notices`);
      if (noticesRes.ok) {
        const data = await noticesRes.json();
        setNotices(data.notices || []);
      }

      // 7. Fetch Academic Routines
      const routineRes = await fetch(`${SERVER_URL}/api/routines`);
      if (routineRes.ok) {
        const rData = await routineRes.json();
        setRoutines(Array.isArray(rData) ? rData : (rData.routines || []));
      }

      // 8. Fetch Support & Complaints
      try {
        const supportRes = await fetch(`${SERVER_URL}/api/support/admin/all`);
        if (supportRes.ok) {
          const sData = await supportRes.json();
          setSupportRecords(sData.items || []);
        }
      } catch (e) {
        console.warn("Support records fetch error:", e);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to fetch department statistics");
    } finally {
      setIsLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Routine Management Handlers & Conflict Detection ────
  const isTimeSlotMatch = (slot1, slot2) => {
    if (!slot1 || !slot2) return false;
    const s1 = String(slot1).trim().replace(/^0/, "");
    const s2 = String(slot2).trim().replace(/^0/, "");
    return s1 === s2;
  };

  const getRoutineCell = (day, semester, timeSlot) => {
    const semNum = Number(semester);
    return routines.find((r) => {
      return r.day === day && Number(r.semester) === semNum && isTimeSlotMatch(r.timeSlot, timeSlot);
    });
  };

  // Find if a classroom/lab is booked by another semester at this day & time slot
  const getSlotRoomConflict = (day, timeSlot, semester, roomName) => {
    if (!roomName || !String(roomName).trim()) return null;
    const normalizedRoom = String(roomName).trim().toLowerCase();
    const semNum = Number(semester);
    return routines.find((r) => {
      if (Number(r.semester) === semNum) return false;
      if (r.day !== day) return false;
      if (!isTimeSlotMatch(r.timeSlot, timeSlot)) return false;
      if (!r.room) return false;
      return r.room.trim().toLowerCase() === normalizedRoom && Boolean(r.courseCode);
    });
  };

  // Find if an instructor is busy teaching another class at this day & time slot
  const getSlotTeacherConflict = (day, timeSlot, semester, teacherName) => {
    if (!teacherName || !String(teacherName).trim()) return null;
    const normalizedTeacher = String(teacherName).trim().toLowerCase();
    if (normalizedTeacher.includes("pool") || normalizedTeacher.includes("faculty")) return null;
    const semNum = Number(semester);
    return routines.find((r) => {
      if (Number(r.semester) === semNum) return false;
      if (r.day !== day) return false;
      if (!isTimeSlotMatch(r.timeSlot, timeSlot)) return false;
      if (!r.teacherName) return false;
      return r.teacherName.trim().toLowerCase() === normalizedTeacher && Boolean(r.courseCode);
    });
  };

  // List all occupied rooms at a specific day and time slot
  const getOccupiedRoomsAtSlot = (day, timeSlot, semester) => {
    const semNum = Number(semester);
    return routines.filter((r) => {
      if (Number(r.semester) === semNum) return false;
      if (r.day !== day) return false;
      if (!isTimeSlotMatch(r.timeSlot, timeSlot)) return false;
      return r.room && Boolean(r.courseCode);
    }).map(r => ({
      room: r.room,
      semester: r.semester,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle
    }));
  };

  // List all busy instructors at a specific day and time slot
  const getBusyTeachersAtSlot = (day, timeSlot, semester) => {
    const semNum = Number(semester);
    return routines.filter((r) => {
      if (Number(r.semester) === semNum) return false;
      if (r.day !== day) return false;
      if (!isTimeSlotMatch(r.timeSlot, timeSlot)) return false;
      return r.teacherName && !r.teacherName.toLowerCase().includes("pool") && Boolean(r.courseCode);
    }).map(r => ({
      teacherName: r.teacherName,
      semester: r.semester,
      courseCode: r.courseCode
    }));
  };

  const handleOpenEditRoutine = (day, semester, timeSlot) => {
    const cell = getRoutineCell(day, semester, timeSlot);
    setEditingRoutineCell({ day, semester: Number(semester), timeSlot });
    if (cell) {
      const isAllowed = cell.teacherName && ["A", "B", "C"].includes(cell.teacherName.trim().toUpperCase());
      let matchTeacher = isAllowed 
        ? teachers.find(t => t.name?.trim().toUpperCase() === cell.teacherName.trim().toUpperCase() || t.teacherId === cell.teacherId)
        : null;

      // If this specific slot has no teacher assigned yet, check if the course already has a teacher assigned in courses or another slot of this semester
      if (!matchTeacher && cell.courseCode) {
        const cleanCourseCode = cell.courseCode.trim().toUpperCase();
        const matchedCourse = courses.find((c) => c.code?.trim().toUpperCase() === cleanCourseCode);
        if (matchedCourse?.faculty && ["A", "B", "C"].includes(matchedCourse.faculty.trim().toUpperCase())) {
          matchTeacher = teachers.find((t) => t.name?.trim().toUpperCase() === matchedCourse.faculty.trim().toUpperCase());
        }
        if (!matchTeacher) {
          const sisterSlot = routines.find((r) =>
            Number(r.semester) === Number(semester) &&
            r.courseCode?.trim().toUpperCase() === cleanCourseCode &&
            r.teacherName && ["A", "B", "C"].includes(r.teacherName.trim().toUpperCase())
          );
          if (sisterSlot) {
            matchTeacher = teachers.find((t) => t.name?.trim().toUpperCase() === sisterSlot.teacherName.trim().toUpperCase());
          }
        }
      }

      setRoutineFormData({
        courseCode: cell.courseCode || "",
        teacherId: matchTeacher?.teacherId || (matchTeacher?._id ? String(matchTeacher._id) : ""),
        teacherName: matchTeacher ? matchTeacher.name.trim().toUpperCase() : "",
        teacherEmail: matchTeacher?.email || "",
        room: cell.room || "",
      });
    } else {
      setRoutineFormData({
        courseCode: "",
        teacherId: "",
        teacherName: "",
        teacherEmail: "",
        room: `Room ${400 + Number(semester)}`,
      });
    }
  };

  const handleSaveRoutineSlot = async () => {
    if (!editingRoutineCell) return;

    // Strict validation: if courseCode is provided, teacherName must be strictly A, B, or C
    if (routineFormData.courseCode) {
      const allowed = ["A", "B", "C"];
      const selectedUpper = String(routineFormData.teacherName || "").trim().toUpperCase();
      if (!selectedUpper || !allowed.includes(selectedUpper)) {
        toast.error("Teacher assignment error: Only Teacher A, Teacher B, or Teacher C can be assigned to a course. All other selections are not allowed.", { duration: 6000 });
        return;
      }
    }

    // Check client-side Room conflict
    if (routineFormData.room && routineFormData.courseCode) {
      const roomConflict = getSlotRoomConflict(
        editingRoutineCell.day,
        editingRoutineCell.timeSlot,
        editingRoutineCell.semester,
        routineFormData.room
      );
      if (roomConflict) {
        toast.error(`Room Conflict: ${routineFormData.room} is already booked on ${editingRoutineCell.day} at ${editingRoutineCell.timeSlot} by Semester ${roomConflict.semester}! Please choose another room.`, { duration: 6000 });
        return;
      }
    }

    // Check client-side Teacher conflict
    if (routineFormData.teacherName && routineFormData.courseCode) {
      const teacherConflict = getSlotTeacherConflict(
        editingRoutineCell.day,
        editingRoutineCell.timeSlot,
        editingRoutineCell.semester,
        routineFormData.teacherName
      );
      if (teacherConflict) {
        toast.error(`Instructor Conflict: Teacher ${routineFormData.teacherName} is already scheduled with Semester ${teacherConflict.semester} on ${editingRoutineCell.day} at ${editingRoutineCell.timeSlot}!`, { duration: 6000 });
        return;
      }
    }

    setIsSavingRoutine(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: editingRoutineCell.day,
          semester: editingRoutineCell.semester,
          timeSlot: editingRoutineCell.timeSlot,
          courseCode: routineFormData.courseCode,
          teacherId: routineFormData.teacherId || null,
          teacherName: routineFormData.teacherName || "",
          teacherEmail: routineFormData.teacherEmail || null,
          room: routineFormData.room || "",
        }),
      });

      if (res.ok) {
        const respData = await res.json().catch(() => ({}));
        const countInfo = respData.autoFilledCount > 1 
          ? ` (Auto-filled all ${respData.autoFilledCount} weekly slots)`
          : "";
        toast.success(
          routineFormData.courseCode
            ? `Class saved! Teacher ${routineFormData.teacherName} assigned to all ${routineFormData.courseCode} slots${countInfo}.`
            : "Routine slot cleared!"
        );
        setEditingRoutineCell(null);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to update routine slot", { duration: 6000 });
      }
    } catch (err) {
      toast.error("Network error saving routine slot");
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleClearRoutineSlot = async () => {
    if (!editingRoutineCell) return;
    setIsSavingRoutine(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: editingRoutineCell.day,
          semester: editingRoutineCell.semester,
          timeSlot: editingRoutineCell.timeSlot,
          courseCode: "",
        }),
      });
      if (res.ok) {
        toast.success("Class removed from schedule!");
        setEditingRoutineCell(null);
        const updated = await fetch(`${SERVER_URL}/api/routines`);
        if (updated.ok) {
          const data = await updated.json();
          setRoutines(Array.isArray(data) ? data : (data.routines || []));
        }
      } else {
        toast.error("Failed to clear routine slot");
      }
    } catch (err) {
      toast.error("Error clearing routine slot");
    } finally {
      setIsSavingRoutine(false);
    }
  };

  const handleSeedSampleRoutine = async () => {
    if (!confirm("Populate departmental academic routine for all Semesters (1 to 8)? Classes will be strictly distributed among registered approved faculty with zero room or teacher conflicts.")) return;
    setIsSeedingRoutine(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/routines/seed-sample`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Academic routine successfully generated!");
        const updated = await fetch(`${SERVER_URL}/api/routines`);
        if (updated.ok) {
          const rData = await updated.json();
          setRoutines(Array.isArray(rData) ? rData : (rData.routines || []));
        }
      } else {
        toast.error("Failed to seed sample routines");
      }
    } catch (err) {
      toast.error("Network error seeding routine");
    } finally {
      setIsSeedingRoutine(false);
    }
  };

  // Update single student status
  const handleUpdateStatus = async (studentId, newStatus) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/students/status/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Student registration successfully ${newStatus}!`);
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update student status");
      }
    } catch (err) {
      toast.error("Network error while updating student status");
    }
  };

  // Bulk Approve all pending students
  const handleApproveAll = async () => {
    if (!confirm("Are you sure you want to approve ALL pending students?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/students/approve-all`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "All pending students approved!");
        fetchData();
      } else {
        toast.error("Failed to approve all students");
      }
    } catch (err) {
      toast.error("Network error during bulk approval");
    }
  };

  // Delete student record
  const handleDeleteStudent = async (studentId, studentName) => {
    if (!confirm(`Are you sure you want to delete student record for ${studentName || 'this student'}?`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/students/${studentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Student record deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete student");
      }
    } catch (err) {
      toast.error("Error deleting student record");
    }
  };

  // Update single teacher status
  const handleUpdateTeacherStatus = async (teacherId, newStatus) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/teachers/status/${teacherId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Faculty registration status set to ${newStatus}!`);
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update teacher status");
      }
    } catch (err) {
      toast.error("Network error while updating teacher status");
    }
  };

  // Bulk Approve all pending teachers
  const handleApproveAllTeachers = async () => {
    if (!confirm("Are you sure you want to approve ALL pending faculty registrations?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/teachers/approve-all`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "All pending faculty approved!");
        fetchData();
      } else {
        toast.error("Failed to approve all faculty");
      }
    } catch (err) {
      toast.error("Network error during bulk faculty approval");
    }
  };

  // Delete teacher record
  const handleDeleteTeacher = async (teacherId, teacherName) => {
    if (!confirm(`Are you sure you want to delete the record for ${teacherName || 'this faculty member'}?`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/teachers/${teacherId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Teacher record deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete teacher");
      }
    } catch (err) {
      toast.error("Error deleting teacher record");
    }
  };

  // Update single employee status
  const handleUpdateEmployeeStatus = async (employeeId, newStatus) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/status/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Staff member registration status set to ${newStatus}!`);
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update employee status");
      }
    } catch (err) {
      toast.error("Network error while updating employee status");
    }
  };

  // Bulk Approve all pending employees
  const handleApproveAllEmployees = async () => {
    if (!confirm("Are you sure you want to approve ALL pending staff registrations?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/employees/approve-all`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "All pending staff members approved!");
        fetchData();
      } else {
        toast.error("Failed to approve all employees");
      }
    } catch (err) {
      toast.error("Network error during bulk employee approval");
    }
  };

  // Delete employee record
  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!confirm(`Are you sure you want to delete the record for ${employeeName || 'this staff member'}?`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/${employeeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Staff record deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete staff member");
      }
    } catch (err) {
      toast.error("Error deleting staff record");
    }
  };

  // Export employees to CSV
  const handleExportEmployees = () => {
    if (employees.length === 0) {
      toast.error("No staff records to export");
      return;
    }
    const headers = ["Name", "Email", "Employee ID", "Designation", "Department", "Phone", "Status"];
    const rows = employees.map(emp => [
      `"${emp.name || ''}"`,
      `"${emp.email || ''}"`,
      `"${emp.employeeId || ''}"`,
      `"${emp.designation || ''}"`,
      `"${emp.department || ''}"`,
      `"${emp.phone || ''}"`,
      `"${emp.status || 'approved'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSE_Staff_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Staff directory exported as CSV!");
  };

  // Create course
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.title) {
      toast.error("Please enter course code and title");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCourse),
      });
      if (res.ok) {
        toast.success("Course added to department curriculum!");
        setNewCourse({ code: "", title: "", credits: "3.0", semester: "6th Semester", faculty: "" });
        setShowCourseForm(false);
        fetchData();
      } else {
        toast.error("Failed to add course");
      }
    } catch (err) {
      toast.error("Network error creating course");
    }
  };

  // Delete course
  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Remove this course from the curriculum?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/courses/${courseId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Course removed successfully");
        fetchData();
      } else {
        toast.error("Failed to remove course");
      }
    } catch (err) {
      toast.error("Error removing course");
    }
  };

  // Quick assign teacher (A, B, or C only) directly to a course
  const handleQuickAssignCourseFaculty = async (courseId, teacherName) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/courses/${courseId}/faculty`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty: teacherName }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to assign teacher to course");
      }
      toast.success(data.message || "Teacher assigned to course successfully!");
      await fetchData();
      const updatedRoutines = await fetch(`${SERVER_URL}/api/routines`);
      if (updatedRoutines.ok) {
        const rData = await updatedRoutines.json();
        setRoutines(Array.isArray(rData) ? rData : (rData.routines || []));
      }
    } catch (err) {
      toast.error(err.message || "Error assigning teacher to course");
    }
  };

  // Sync complete standard curriculum (Semesters 1-8)
  const handleSyncCurriculum = async () => {
    if (!confirm("Sync complete 8-semester CSE curriculum from syllabus into database?")) return;
    setIsSyncingCurriculum(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/courses/seed-all`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Curriculum for Semesters 1 to 8 synced successfully!");
        fetchData();
      } else {
        toast.error("Failed to sync curriculum");
      }
    } catch (err) {
      toast.error("Network error syncing curriculum");
    } finally {
      setIsSyncingCurriculum(false);
    }
  };

  // Create notice
  const handleCreateNotice = async (e) => {
    e.preventDefault();
    if (!newNotice.title || !newNotice.content) {
      toast.error("Notice title and content are required");
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNotice),
      });
      if (res.ok) {
        toast.success("Notice published to department board!");
        setNewNotice({ title: "", category: "Academic", audience: "All Members", content: "", priority: "Normal" });
        setShowNoticeForm(false);
        fetchData();
      } else {
        toast.error("Failed to dispatch notice");
      }
    } catch (err) {
      toast.error("Network error publishing notice");
    }
  };

  // Delete notice
  const handleDeleteNotice = async (noticeId) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/notices/${noticeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Notice deleted successfully");
        fetchData();
      } else {
        toast.error("Failed to delete notice");
      }
    } catch (err) {
      toast.error("Error deleting notice");
    }
  };

  // Export students to CSV
  const handleExportStudents = () => {
    if (students.length === 0) {
      toast.error("No student data available to export");
      return;
    }
    const headers = ["Name", "Email", "Student ID / Roll", "Batch", "Semester", "Session", "Phone", "Status"];
    const rows = students.map(s => [
      `"${s.name || ''}"`,
      `"${s.email || ''}"`,
      `"${s.studentId || ''}"`,
      `"${s.batch || ''}"`,
      `"${s.semester || ''}"`,
      `"${s.session || ''}"`,
      `"${s.phone || ''}"`,
      `"${s.status || ''}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSE_Students_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Students roster exported as CSV!");
  };

  // Export faculty to CSV
  const handleExportFaculty = () => {
    if (teachers.length === 0) {
      toast.error("No faculty records to export");
      return;
    }
    const headers = ["Name", "Email", "Teacher ID", "Designation", "Specialization", "Office Room", "Phone", "Status"];
    const rows = teachers.map(t => [
      `"${t.name || ''}"`,
      `"${t.email || ''}"`,
      `"${t.teacherId || ''}"`,
      `"${t.designation || ''}"`,
      `"${t.specialization || ''}"`,
      `"${t.officeRoom || ''}"`,
      `"${t.phone || ''}"`,
      `"${t.status || 'approved'}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CSE_Faculty_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Faculty directory exported as CSV!");
  };

  const filteredStudents = students.filter(s => {
    if (activeTab === "pending") return s.status === "pending";
    if (activeTab === "approved") return s.status === "approved";
    if (activeTab === "rejected") return s.status === "rejected";
    return true;
  }).filter(s => 
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.studentId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.batch || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.semester || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingTeachersCount = teachers.filter(t => t.status === "pending").length;
  const approvedTeachersCount = teachers.filter(t => t.status !== "pending" && t.status !== "rejected").length;

  const filteredTeachers = teachers.filter(t => {
    if (teacherTab === "pending") return t.status === "pending";
    if (teacherTab === "approved") return t.status !== "pending" && t.status !== "rejected";
    if (teacherTab === "rejected") return t.status === "rejected";
    return true;
  }).filter(t => 
    (t.name || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.teacherId || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.designation || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.specialization || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.officeRoom || "").toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const pendingEmployeesCount = employees.filter(e => e.status === "pending").length;
  const approvedEmployeesCount = employees.filter(e => e.status !== "pending" && e.status !== "rejected").length;

  const filteredEmployees = employees.filter(e => {
    if (employeeTab === "pending") return e.status === "pending";
    if (employeeTab === "approved") return e.status !== "pending" && e.status !== "rejected";
    if (employeeTab === "rejected") return e.status === "rejected";
    return true;
  }).filter(e => 
    (e.name || "").toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.email || "").toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.employeeId || "").toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.designation || "").toLowerCase().includes(employeeSearch.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const filteredCourses = courses.filter((c) => {
    if (selectedCourseSemester !== "all") {
      const semKey = String(selectedCourseSemester);
      const matchesNum = String(c.semesterNum) === semKey;
      const matchesLabel = c.semester && (
        c.semester.toLowerCase().startsWith(semKey) ||
        c.semester.toLowerCase().includes(`${semKey}st`) ||
        c.semester.toLowerCase().includes(`${semKey}nd`) ||
        c.semester.toLowerCase().includes(`${semKey}rd`) ||
        c.semester.toLowerCase().includes(`${semKey}th`)
      );
      if (!matchesNum && !matchesLabel) return false;
    }
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      const matchesCode = c.code?.toLowerCase().includes(q);
      const matchesTitle = c.title?.toLowerCase().includes(q);
      const matchesFaculty = c.faculty?.toLowerCase().includes(q);
      if (!matchesCode && !matchesTitle && !matchesFaculty) return false;
    }
    return true;
  });

  const totalFilteredCredits = filteredCourses.reduce((sum, c) => sum + (parseFloat(c.credits) || 0), 0);

  const pendingSupportCount = supportRecords.filter(r =>
    ["submitted", "open", "received", "under review", "in progress", "investigating"].includes(String(r.status || "").toLowerCase())
  ).length;
  const complaintsCount = supportRecords.filter(r => r.type === "complaint").length;
  const techCount = supportRecords.filter(r => r.type === "technical_support").length;
  const inquiriesCount = supportRecords.filter(r => r.type === "general_inquiry").length;
  const resolvedSupportCount = supportRecords.filter(r =>
    ["resolved", "closed"].includes(String(r.status || "").toLowerCase())
  ).length;

  const filteredSupportRecords = supportRecords.filter(record => {
    const statusLower = String(record.status || "").toLowerCase();
    if (supportFilter === "pending") {
      const isPending = ["submitted", "open", "received", "under review", "in progress", "investigating"].includes(statusLower);
      if (!isPending) return false;
    } else if (supportFilter === "resolved") {
      const isResolved = ["resolved", "closed"].includes(statusLower);
      if (!isResolved) return false;
    } else if (supportFilter === "complaint") {
      if (record.type !== "complaint") return false;
    } else if (supportFilter === "technical_support") {
      if (record.type !== "technical_support") return false;
    } else if (supportFilter === "general_inquiry") {
      if (record.type !== "general_inquiry") return false;
    }

    if (supportSearch.trim()) {
      const q = supportSearch.toLowerCase();
      const titleMatch = (record.title || "").toLowerCase().includes(q);
      const descMatch = (record.description || "").toLowerCase().includes(q);
      const trackMatch = (record.trackingId || "").toLowerCase().includes(q);
      const authorMatch = (record.authorName || "").toLowerCase().includes(q);
      const emailMatch = (record.authorEmail || "").toLowerCase().includes(q);
      const catMatch = (record.category || record.topic || "").toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !trackMatch && !authorMatch && !emailMatch && !catMatch) {
        return false;
      }
    }

    return true;
  });

  const handleUpdateSupportStatus = async (id, newStatus, responseNote = null) => {
    setUpdatingSupportId(id);
    try {
      const res = await fetch(`${SERVER_URL}/api/support/admin/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminResponse: responseNote || undefined,
          note: responseNote || `Status updated to "${newStatus}" by Administration.`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update record status");
      }
      toast.success(`Status updated to "${newStatus}"`);
      setSupportRecords(prev =>
        prev.map(item => {
          if (item._id === id || item.id === id) {
            const now = new Date().toISOString();
            return {
              ...item,
              status: newStatus,
              adminResponse: responseNote || item.adminResponse,
              updatedAt: now,
              timeline: [
                ...(item.timeline || []),
                {
                  status: newStatus,
                  note: responseNote || `Status updated to ${newStatus}`,
                  at: now,
                },
              ],
            };
          }
          return item;
        })
      );
      // Close the Review & Resolve modal automatically on successful save
      setSelectedSupport(null);
      setAdminResponseDraft("");
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingSupportId(null);
    }
  };

  const handleDeleteSupport = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete this record?\n\n"${title}"`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/support/admin/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete record");
      }
      toast.success("Record deleted successfully");
      setSupportRecords(prev => prev.filter(r => r._id !== id && r.id !== id));
      if (selectedSupport && (selectedSupport._id === id || selectedSupport.id === id)) {
        setSelectedSupport(null);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  if (initialLoading) {
    return (
      <Loading 
        text="Loading Administrator Hub..." 
        subtext="Synchronizing department rosters, verified students, and course matrix" 
        fullScreen 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-8 rounded-[2rem] bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-purple-500/20 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-purple-200 backdrop-blur-md mb-2">
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            <span>Department Admin Authority</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Administrator Dashboard
          </h1>
          <p className="text-sm text-slate-300 font-medium">
            Manage student verification, publish official circulars, configure courses, and monitor department records.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-3 relative z-10">
          <DashboardCollapseControls
            onCollapseAll={collapseAllSections}
            onExpandAll={expandAllSections}
            allCollapsed={allCollapsed}
          />
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-md shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Department Overview Metrics
          </span>
          <SectionCollapseToggle
            isCollapsed={collapsedSections.kpi}
            onToggle={() => toggleSection("kpi")}
            label="Overview Metrics"
            size="sm"
          />
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.kpi}
          onExpand={() => toggleSection("kpi")}
          sectionName="Department Overview Metrics"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Total Students */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Students</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Enrolled</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow relative overflow-hidden">
          {stats.pendingStudents > 0 && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Pending Approvals</span>
            <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{stats.pendingStudents}</span>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Requires Verification</span>
          </div>
        </div>

        {/* Faculty Teachers */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow relative overflow-hidden">
          {(stats.pendingTeachers > 0 || pendingTeachersCount > 0) && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Faculty Members</span>
            <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Presentation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalTeachers || teachers.length}</span>
            {(stats.pendingTeachers > 0 || pendingTeachersCount > 0) ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-bold">
                {stats.pendingTeachers || pendingTeachersCount} Requires Verification
              </span>
            ) : (
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Teaching Staff</span>
            )}
          </div>
        </div>

        {/* Staff Employees */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow relative overflow-hidden">
          {(stats.pendingEmployees > 0 || pendingEmployeesCount > 0) && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Department Staff</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalEmployees || employees.length}</span>
            {(stats.pendingEmployees > 0 || pendingEmployeesCount > 0) ? (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-bold">
                {stats.pendingEmployees || pendingEmployeesCount} Requires Verification
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Officers & Staff</span>
            )}
          </div>
        </div>

        {/* Support & Grievances */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow relative overflow-hidden">
          {pendingSupportCount > 0 && (
            <div className="absolute top-3 right-3 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Support & Grievances</span>
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{supportRecords.length}</span>
            {pendingSupportCount > 0 ? (
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-bold">
                {pendingSupportCount} Requires Review
              </span>
            ) : (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">All Addressed</span>
            )}
          </div>
        </div>
      </div>
      </CollapsibleBody>
    </div>

      {/* Institutional Analytics & Resource Studio */}
      <div id="analytics" className="scroll-mt-6">
        <AdminAnalyticsCharts 
          stats={stats} 
          students={students} 
          routines={routines} 
          courses={courses} 
          teachers={teachers} 
          isCollapsed={collapsedSections.analytics}
          onToggle={() => toggleSection("analytics")}
        />
      </div>

      {/* ── Student Admissions & Verification Hub ─────────────────── */}
      <div id="students" className="scroll-mt-6">
        <div id="pending" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Undergraduate Admissions & Student Verification</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Student Admissions & Verification Hub</span>
                {stats.pendingStudents > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold flex items-center gap-1 border border-amber-300 dark:border-amber-700 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>{stats.pendingStudents} Pending</span>
                  </span>
                )}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Review and approve pending student accounts, verify session credentials, manage enrolled students, or export student rosters.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {stats.pendingStudents > 0 && (
                <button
                  onClick={handleApproveAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve All Pending ({stats.pendingStudents})</span>
                </button>
              )}
              <button
                onClick={handleExportStudents}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <SectionCollapseToggle
                isCollapsed={collapsedSections.students}
                onToggle={() => toggleSection("students")}
                label="Student Admissions"
              />
            </div>
          </div>

          <CollapsibleBody
            isCollapsed={collapsedSections.students}
            onExpand={() => toggleSection("students")}
            sectionName="Student Admissions & Verification Hub"
          >
          {/* Tab & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start">
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "pending" 
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold" 
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({stats.pendingStudents})
              </button>
              <button
                onClick={() => setActiveTab("approved")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "approved" 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" 
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Approved ({stats.approvedStudents})
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "all" 
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold" 
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Students ({stats.totalStudents || students.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search students by name, roll, email, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Students Table */}
          <div
            data-lenis-prevent
            className="overflow-auto overscroll-contain max-h-[580px] scrollbar-thin rounded-2xl border border-slate-100 dark:border-white/5"
          >
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
                <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">No student registrations found for this filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Student Member</th>
                    <th className="pb-3 px-4">Academic & Roll</th>
                    <th className="pb-3 px-4">Batch & Session</th>
                    <th className="pb-3 px-4">Contact Info</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredStudents.map((student) => {
                    const isPending = student.status === "pending";
                    const isRejected = student.status === "rejected";
                    const isApproved = student.status === "approved" || (!isPending && !isRejected);
                    const studentIdentifier = student._id || student.userId || student.studentId || student.email;

                    return (
                      <tr key={student._id || student.userId || student.studentId || student.email} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Student Member Details */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm ring-1 ring-indigo-200 dark:ring-indigo-800/60">
                              {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {student.semester && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold">
                                    Sem {student.semester}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {student.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Academic & Roll */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Roll: {student.studentId || "N/A"}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              Undergraduate CSE
                            </span>
                          </div>
                        </td>

                        {/* Batch & Session */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              Batch {student.batch || "N/A"}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                              Session: {student.session || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {student.phone || "Not specified"}
                            </span>
                            <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {student.address || "Pabna"}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                            isApproved
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                              : isRejected
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                          }`}>
                            {isApproved ? <CheckCircle2 className="w-3 h-3" /> :
                             isRejected ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {isApproved ? "approved" : isRejected ? "rejected" : "pending"}
                          </span>
                        </td>

                        {/* Moderation Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(studentIdentifier, "approved")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(studentIdentifier, "rejected")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(studentIdentifier, isApproved ? "pending" : "approved")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Reset to {isApproved ? "Pending" : "Approved"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteStudent(studentIdentifier, student.name)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Student Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleBody>
        </div>
      </div>

      {/* ── Faculty Admissions & Verification Hub ─────────────────── */}
      <div id="faculty" className="scroll-mt-6">
        <div id="faculty-pending" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5">
                <Presentation className="w-3.5 h-3.5 text-sky-500" />
                <span>Academic Staff & Faculty Verification</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Faculty Admissions & Verification Hub</span>
                {pendingTeachersCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold flex items-center gap-1 border border-amber-300 dark:border-amber-700 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>{pendingTeachersCount} Pending</span>
                  </span>
                )}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Review and approve pending faculty accounts, verify academic credentials, manage verified professors, or export faculty roster.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {pendingTeachersCount > 0 && (
                <button
                  onClick={handleApproveAllTeachers}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve All Pending ({pendingTeachersCount})</span>
                </button>
              )}
              <button
                onClick={handleExportFaculty}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <SectionCollapseToggle
                isCollapsed={collapsedSections.faculty}
                onToggle={() => toggleSection("faculty")}
                label="Faculty Admissions"
              />
            </div>
          </div>

          <CollapsibleBody
            isCollapsed={collapsedSections.faculty}
            onExpand={() => toggleSection("faculty")}
            sectionName="Faculty Admissions & Verification Hub"
          >
          {/* Tab & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start">
              <button
                onClick={() => setTeacherTab("pending")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  teacherTab === "pending"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({pendingTeachersCount})
              </button>
              <button
                onClick={() => setTeacherTab("approved")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  teacherTab === "approved"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Approved ({approvedTeachersCount})
              </button>
              <button
                onClick={() => setTeacherTab("all")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  teacherTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Faculty ({teachers.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search faculty by name, email, designation, or ID..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-1 focus:ring-sky-500 transition-all"
              />
            </div>
          </div>

          {/* Faculty Table */}
          <div
            data-lenis-prevent
            className="overflow-auto overscroll-contain max-h-[580px] scrollbar-thin rounded-2xl border border-slate-100 dark:border-white/5"
          >
            {filteredTeachers.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
                <Presentation className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">No faculty records found for this filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="pb-3 px-4">Academic & Designation</th>
                    <th className="pb-3 px-4">Office & ID</th>
                    <th className="pb-3 px-4">Contact</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredTeachers.map((teacher) => {
                    const isPending = teacher.status === "pending";
                    const isRejected = teacher.status === "rejected";
                    const isApproved = teacher.status === "approved" || (!isPending && !isRejected);
                    const teacherIdentifier = teacher._id || teacher.userId || teacher.teacherId || teacher.email;

                    return (
                      <tr key={teacher._id || teacher.teacherId || teacher.email} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Faculty Member Details */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 font-bold flex items-center justify-center text-sm ring-1 ring-sky-200 dark:ring-sky-800/60">
                              {teacher.name ? teacher.name.charAt(0).toUpperCase() : "T"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{teacher.name}</span>
                                {teacher.designation?.toLowerCase().includes("head") && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold">
                                    Head
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {teacher.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Academic & Designation */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {teacher.designation || "Assistant Professor"}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              Dept. of {teacher.department || "CSE"}
                            </span>
                            {teacher.specialization && (
                              <span className="text-sky-600 dark:text-sky-400 text-[11px] font-medium">
                                {teacher.specialization}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Office & ID */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {teacher.officeRoom || "Faculty Lounge"}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                              ID: {teacher.teacherId || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {teacher.phone || "Not specified"}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                            isApproved
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                              : isRejected
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                          }`}>
                            {isApproved ? <CheckCircle2 className="w-3 h-3" /> :
                             isRejected ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {isApproved ? "approved" : isRejected ? "rejected" : "pending"}
                          </span>
                        </td>

                        {/* Moderation Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleUpdateTeacherStatus(teacherIdentifier, "approved")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateTeacherStatus(teacherIdentifier, "rejected")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateTeacherStatus(teacherIdentifier, isApproved ? "pending" : "approved")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Reset to {isApproved ? "Pending" : "Approved"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTeacher(teacherIdentifier, teacher.name)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Faculty Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleBody>
        </div>
      </div>

      {/* ── Routine Management Studio ───────────────────────── */}
      <div id="routine" className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Academic Schedule Controller</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Class Routine & Master Timetable Studio
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Admin control for weekly departmental class routines. Active schedules for Semesters 1 to 8 distributed among registered faculty. Click any slot to assign course, teacher, and room.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSeedSampleRoutine}
              disabled={isSeedingRoutine}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm disabled:opacity-60"
              title="Populate routine across all Semesters (1 to 8) distributed among registered faculty"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeedingRoutine ? "animate-spin text-indigo-500" : ""}`} />
              <span>{isSeedingRoutine ? "Generating Schedule..." : "Populate All Semesters (1-8) Routine (Registered Faculty)"}</span>
            </button>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200/50 dark:shadow-none transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Live</span>
            </button>
            <SectionCollapseToggle
              isCollapsed={collapsedSections.routine}
              onToggle={() => toggleSection("routine")}
              label="Routine Studio"
            />
          </div>
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.routine}
          onExpand={() => toggleSection("routine")}
          sectionName="Class Routine & Master Timetable Studio"
        >
        {/* Semester Filter Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select Semester View:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Classes: <strong className="text-indigo-600 dark:text-indigo-400">{routines.length}</strong>
              </span>
              {(() => {
                const roomMap = {};
                let conflictCount = 0;
                for (const r of routines) {
                  if (!r.room || !r.courseCode) continue;
                  const key = `${r.day}__${r.timeSlot?.trim().replace(/^0/, "")}__${r.room?.trim()}`.toLowerCase();
                  if (roomMap[key]) conflictCount++;
                  else roomMap[key] = true;
                }
                if (conflictCount === 0) {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Zero Room Conflicts (All Rooms Clear)</span>
                    </span>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-700 dark:text-rose-400 animate-pulse">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>{conflictCount} Room Conflict{conflictCount > 1 ? "s" : ""} Detected</span>
                    </span>
                  );
                }
              })()}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedRoutineSemester("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedRoutineSemester === "all"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>All Semesters (Master Stack)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedRoutineSemester === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {routines.length}
              </span>
            </button>

            {ROUTINE_SEMESTERS.map((sem) => {
              const semSlotsCount = routines.filter((r) => Number(r.semester) === sem.id).length;
              const isSelected = selectedRoutineSemester === String(sem.id);
              return (
                <button
                  key={sem.id}
                  onClick={() => setSelectedRoutineSemester(String(sem.id))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{sem.full} ({sem.label})</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    {semSlotsCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Timetable Schedule Grid */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs">
          <div
            data-lenis-prevent
            data-smart-scroll="horizontal"
            className="overflow-auto overscroll-contain max-h-[640px] scrollbar-thin"
          >
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md">
                  <th className="sticky left-0 top-0 z-30 w-20 border-r border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 py-4 px-3 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    Day
                  </th>
                  {selectedRoutineSemester === "all" && (
                    <th className="w-16 border-r border-slate-200 dark:border-white/10 py-4 px-2 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      Sem
                    </th>
                  )}
                  {ROUTINE_TIME_SLOTS.map((slot) => {
                    const isBreak = slot === "01:00 - 02:00";
                    return (
                      <th
                        key={slot}
                        className={`${isBreak ? "w-14 px-1" : "min-w-[170px] px-3"} border-r border-slate-200 dark:border-white/10 py-3.5 text-center font-bold whitespace-nowrap last:border-0`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <Clock className={`w-3.5 h-3.5 ${isBreak ? "text-amber-500/50" : "text-indigo-500"}`} />
                          <span className={`text-xs font-black tracking-wider uppercase ${isBreak ? "text-amber-600 dark:text-amber-400 text-[10px]" : "text-slate-700 dark:text-slate-200"}`}>
                            {isBreak ? "Lunch Break" : slot}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {selectedRoutineSemester === "all" ? (
                  // All Semesters Mode: Vertical Day column spanning all 8 semesters
                  ROUTINE_DAYS.map((day, dIdx) => (
                    <React.Fragment key={day}>
                      {ROUTINE_SEMESTERS.map((sem, sIdx) => {
                        const isFirstSemOfDay = sIdx === 0;
                        return (
                          <tr
                            key={`${day}-${sem.id}`}
                            className={`group transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 ${
                              isFirstSemOfDay && dIdx !== 0 ? "border-t-4 border-slate-200 dark:border-slate-700" : ""
                            }`}
                          >
                            {isFirstSemOfDay && (
                              <td
                                rowSpan={ROUTINE_SEMESTERS.length}
                                className="sticky left-0 z-10 w-20 border-r border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm p-2 text-center align-middle"
                              >
                                <div className="flex h-full items-center justify-center">
                                  <span
                                    className="text-xs font-black tracking-widest text-slate-800 dark:text-slate-200 uppercase"
                                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                                  >
                                    {day}
                                  </span>
                                </div>
                              </td>
                            )}
                            <td className="w-16 border-r border-slate-200 dark:border-white/10 bg-slate-50/20 dark:bg-slate-800/10 p-2 text-center align-middle">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                {sem.label}
                              </span>
                            </td>

                            {ROUTINE_TIME_SLOTS.map((slot) => {
                              const isBreak = slot === "01:00 - 02:00";
                              if (isBreak) {
                                if (isFirstSemOfDay) {
                                  return (
                                    <td
                                      key={slot}
                                      rowSpan={ROUTINE_SEMESTERS.length}
                                      className="w-14 border-r border-slate-200 dark:border-white/10 bg-amber-50/20 dark:bg-amber-950/10 p-1 text-center align-middle"
                                    >
                                      <div className="flex h-full flex-col items-center justify-center text-amber-500/40">
                                        <Coffee className="w-4 h-4 mb-1" />
                                        <span
                                          className="text-[9px] font-black tracking-[0.4em] text-amber-600/60 dark:text-amber-400/60 uppercase"
                                          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                                        >
                                          BREAK
                                        </span>
                                      </div>
                                    </td>
                                  );
                                }
                                return null;
                              }

                              const cell = getRoutineCell(day, sem.id, slot);
                              return (
                                <td
                                  key={slot}
                                  onClick={() => handleOpenEditRoutine(day, sem.id, slot)}
                                  className="border-r border-slate-200 dark:border-white/10 p-2 cursor-pointer transition-all hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
                                >
                                  {cell && (cell.courseCode || cell.room) ? (() => {
                                    const cellRoomConflict = cell.room && cell.courseCode ? getSlotRoomConflict(day, slot, sem.id, cell.room) : null;
                                    return (
                                      <div className={`relative group/cell p-3 rounded-xl bg-white dark:bg-slate-800/90 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[92px] ${
                                        cellRoomConflict
                                          ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                                          : "border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500"
                                      }`}>
                                        <div>
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                                              {cell.courseCode}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              cellRoomConflict
                                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                            }`}>
                                              <MapPin className={`w-2.5 h-2.5 ${cellRoomConflict ? "text-rose-500" : "text-indigo-500"}`} />
                                              <span>{cell.room || "Room"}</span>
                                            </span>
                                          </div>
                                          {cell.courseTitle && (
                                            <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-1.5">
                                              {cell.courseTitle}
                                            </p>
                                          )}
                                          {cellRoomConflict && (
                                            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                                              <AlertCircle className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />
                                              <span className="truncate">Conflict: Sem {cellRoomConflict.semester}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                          <span className="truncate">{cell.teacherName || "Instructor"}</span>
                                          <Edit3 className="w-3 h-3 text-indigo-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <div className="h-full min-h-[92px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all p-2 group/empty">
                                      <PlusCircle className="w-4 h-4 group-hover/empty:scale-110 transition-transform" />
                                      <span className="text-[10px] font-bold mt-1 opacity-0 group-hover/empty:opacity-100 transition-opacity">
                                        Assign
                                      </span>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  // Single Semester Mode: Row per Day
                  ROUTINE_DAYS.map((day) => {
                    const currentSemId = Number(selectedRoutineSemester);
                    return (
                      <tr
                        key={day}
                        className="group transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
                      >
                        <td className="sticky left-0 z-10 w-24 border-r border-slate-200 dark:border-white/10 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 text-center align-middle font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                          {day}
                        </td>

                        {ROUTINE_TIME_SLOTS.map((slot) => {
                          const isBreak = slot === "01:00 - 02:00";
                          if (isBreak) {
                            return (
                              <td
                                key={slot}
                                className="w-16 border-r border-slate-200 dark:border-white/10 bg-amber-50/30 dark:bg-amber-950/20 p-2 text-center align-middle"
                              >
                                <div className="flex flex-col items-center justify-center text-amber-500">
                                  <Coffee className="w-4 h-4 mb-1 opacity-60" />
                                  <span className="text-[9px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                                    Break
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          const cell = getRoutineCell(day, currentSemId, slot);
                          return (
                            <td
                              key={slot}
                              onClick={() => handleOpenEditRoutine(day, currentSemId, slot)}
                              className="border-r border-slate-200 dark:border-white/10 p-2.5 cursor-pointer transition-all hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30"
                            >
                              {cell && (cell.courseCode || cell.room) ? (() => {
                                const cellRoomConflict = cell.room && cell.courseCode ? getSlotRoomConflict(day, slot, currentSemId, cell.room) : null;
                                return (
                                  <div className={`relative group/cell p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border shadow-xs hover:shadow-md transition-all flex flex-col justify-between min-h-[105px] ${
                                    cellRoomConflict
                                      ? "border-rose-400 dark:border-rose-600 bg-rose-50/20"
                                      : "border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500"
                                  }`}>
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                                          {cell.courseCode}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                                          cellRoomConflict
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                        }`}>
                                          <MapPin className={`w-3 h-3 ${cellRoomConflict ? "text-rose-500" : "text-indigo-500"}`} />
                                          <span>{cell.room || "Room"}</span>
                                        </span>
                                      </div>
                                      {cell.courseTitle && (
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mt-2">
                                          {cell.courseTitle}
                                        </p>
                                      )}
                                      {cellRoomConflict && (
                                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                          <AlertCircle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                                          <span className="truncate">Conflict: Room with Sem {cellRoomConflict.semester}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                      <span className="truncate">{cell.teacherName || "Instructor"}</span>
                                      <Edit3 className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                );
                              })() : (
                                <div className="h-full min-h-[105px] rounded-xl border border-dashed border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all p-3 group/empty">
                                  <PlusCircle className="w-5 h-5 group-hover/empty:scale-110 transition-transform" />
                                  <span className="text-[11px] font-bold mt-1.5 opacity-0 group-hover/empty:opacity-100 transition-opacity">
                                    Assign Class
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </CollapsibleBody>

        {/* Edit Class Modal */}
        {editingRoutineCell && (() => {
          const currentRoomConflict = routineFormData.room && routineFormData.courseCode
            ? getSlotRoomConflict(editingRoutineCell.day, editingRoutineCell.timeSlot, editingRoutineCell.semester, routineFormData.room)
            : null;

          const currentTeacherConflict = routineFormData.teacherName && routineFormData.courseCode
            ? getSlotTeacherConflict(editingRoutineCell.day, editingRoutineCell.timeSlot, editingRoutineCell.semester, routineFormData.teacherName)
            : null;

          const occupiedRoomsAtCurrentSlot = getOccupiedRoomsAtSlot(
            editingRoutineCell.day,
            editingRoutineCell.timeSlot,
            editingRoutineCell.semester
          );

          const busyTeachersAtCurrentSlot = getBusyTeachersAtSlot(
            editingRoutineCell.day,
            editingRoutineCell.timeSlot,
            editingRoutineCell.semester
          );

          const roomPresets = Array.from(new Set([
            `Room ${400 + Number(editingRoutineCell.semester)}`,
            "Room 401",
            "Room 402",
            "Room 403",
            "Room 404",
            "Room 405",
            "Room 406",
            "Room 407",
            "Room 408",
            "Software Lab 1",
            "Software Lab 2",
            "Software Lab 3",
            "Hardware & Microprocessor Lab",
            "Digital Electronics Lab",
            "Network & Cyber Security Lab",
            "AI & Data Science Lab",
            "Robotics & Embedded Systems Lab"
          ]));

          return (
            <div
              data-lenis-prevent
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in overscroll-contain"
            >
              <div className="relative max-w-lg w-full p-6 sm:p-7 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                        Edit Routine Slot
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                        {editingRoutineCell.day} • {editingRoutineCell.timeSlot} • Semester {editingRoutineCell.semester} ({ROUTINE_SEMESTERS.find(s=>s.id===editingRoutineCell.semester)?.label})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingRoutineCell(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Conflict Warnings */}
                {currentRoomConflict && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Room Conflict: Double-Booking Not Permitted</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                      <strong>&quot;{currentRoomConflict.room}&quot;</strong> is already booked at this exact time ({editingRoutineCell.timeSlot}) on {editingRoutineCell.day} by <strong>Semester {currentRoomConflict.semester}</strong> ({currentRoomConflict.courseCode}{currentRoomConflict.courseTitle ? ` • ${currentRoomConflict.courseTitle}` : ""}). Another class cannot be held in this room at that time.
                    </p>
                    <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 pt-0.5">
                      💡 Please select an unoccupied classroom or lab below to save.
                    </p>
                  </div>
                )}

                {currentTeacherConflict && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Instructor Conflict: Simultaneous Classes</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                      <strong>{currentTeacherConflict.teacherName}</strong> is already assigned to teach <strong>Semester {currentTeacherConflict.semester}</strong> ({currentTeacherConflict.courseCode}) on {editingRoutineCell.day} at {editingRoutineCell.timeSlot}. An instructor cannot teach two classes at the same time.
                    </p>
                  </div>
                )}

                {/* Form Controls */}
                <div className="space-y-4">
                  {/* Course Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Academic Course
                    </label>
                    <select
                      value={routineFormData.courseCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        const cleanCode = code ? code.trim().toUpperCase() : "";
                        const matchedCourse = courses.find((c) => c.code?.trim().toUpperCase() === cleanCode);
                        const isCourseFacultyAllowed = matchedCourse?.faculty && ["A", "B", "C"].includes(matchedCourse.faculty.trim().toUpperCase());
                        let matchedTeacher = isCourseFacultyAllowed ? teachers.find((t) => t.name?.trim().toUpperCase() === matchedCourse.faculty.trim().toUpperCase()) : null;

                        if (!matchedTeacher && cleanCode) {
                          const sisterSlot = routines.find((r) =>
                            Number(r.semester) === Number(editingRoutineCell.semester) &&
                            r.courseCode?.trim().toUpperCase() === cleanCode &&
                            r.teacherName && ["A", "B", "C"].includes(r.teacherName.trim().toUpperCase())
                          );
                          if (sisterSlot) {
                            matchedTeacher = teachers.find((t) => t.name?.trim().toUpperCase() === sisterSlot.teacherName.trim().toUpperCase());
                          }
                        }

                        setRoutineFormData((prev) => ({
                          ...prev,
                          courseCode: code,
                          teacherId: matchedTeacher ? (matchedTeacher.teacherId || String(matchedTeacher._id)) : prev.teacherId,
                          teacherName: matchedTeacher ? matchedTeacher.name.trim().toUpperCase() : prev.teacherName,
                          teacherEmail: matchedTeacher ? matchedTeacher.email : prev.teacherEmail,
                        }));
                      }}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- No Class / Vacate Slot --</option>
                      {(SEMESTER_COURSES[editingRoutineCell.semester] || []).map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code}: {c.title} ({c.credits} Cr)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Teacher Selection (Strictly A, B, or C) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Assigned Faculty / Instructor
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                        Only Teacher A, B, or C Allowed
                      </span>
                    </div>
                    <select
                      value={routineFormData.teacherName}
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const selectedTeacher = teachers.find((t) => t.name === selectedName);
                        setRoutineFormData({
                          ...routineFormData,
                          teacherName: selectedName,
                          teacherId: selectedTeacher?.teacherId || (selectedTeacher?._id ? String(selectedTeacher._id) : ""),
                          teacherEmail: selectedTeacher?.email || "",
                        });
                      }}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 ${
                        currentTeacherConflict
                          ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500"
                          : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                      }`}
                    >
                      <option value="">-- Select Teacher (A, B, or C) --</option>
                      {teachers
                        .filter((t) => ["A", "B", "C"].includes(t.name?.trim().toUpperCase()))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((t) => {
                          const isBusy = busyTeachersAtCurrentSlot.find(b => b.teacherName.trim().toLowerCase() === t.name.trim().toLowerCase());
                          return (
                            <option key={t._id || t.email} value={t.name}>
                              Teacher {t.name} (ID: {t.teacherId || "N/A"}) • {t.designation || "Faculty"} {isBusy ? `⚠️ [Busy: Sem ${isBusy.semester}]` : "✓ [Available]"}
                            </option>
                          );
                      })}
                    </select>

                    {/* Teacher Auto-Fill Helper Notice */}
                    {routineFormData.courseCode && routineFormData.teacherName && ["A", "B", "C"].includes(routineFormData.teacherName.trim().toUpperCase()) && (
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs text-indigo-700 dark:text-indigo-300 animate-in fade-in">
                        <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Routine Auto-Fill Active:</span>
                          <p className="text-[11px] text-indigo-600/90 dark:text-indigo-300/90 mt-0.5 leading-relaxed">
                            Assigning <strong>Teacher {routineFormData.teacherName}</strong> will automatically fill all scheduled weekly lecture slots of <strong>{routineFormData.courseCode}</strong> in Semester {editingRoutineCell.semester} with Teacher {routineFormData.teacherName}.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Room Location */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Classroom / Lab Location
                      </label>
                      {occupiedRoomsAtCurrentSlot.length > 0 && (
                        <span className="text-[10px] font-semibold text-rose-500 dark:text-rose-400">
                          {occupiedRoomsAtCurrentSlot.length} room(s) booked at this hour
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Room 401 or Software Lab 1"
                      value={routineFormData.room}
                      onChange={(e) => setRoutineFormData({ ...routineFormData, room: e.target.value })}
                      className={`w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 ${
                        currentRoomConflict
                          ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20"
                          : "border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
                      }`}
                    />

                    {/* Quick Preset Room Buttons with Occupancy Badges */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Select Available Room:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 max-h-32 overflow-y-auto p-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        {roomPresets.map((preset) => {
                          const isBooked = occupiedRoomsAtCurrentSlot.find(o => o.room.trim().toLowerCase() === preset.trim().toLowerCase());
                          const isSelected = routineFormData.room?.trim().toLowerCase() === preset.trim().toLowerCase();

                          if (isBooked) {
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => {
                                  setRoutineFormData({ ...routineFormData, room: preset });
                                  toast.error(`${preset} is booked by Semester ${isBooked.semester} at this time!`, { id: "room-conflict-warn" });
                                }}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400"
                                    : "bg-rose-50/50 dark:bg-rose-950/30 text-rose-500/80 dark:text-rose-400/80 border-rose-200/50 dark:border-rose-900/40 hover:bg-rose-100"
                                }`}
                                title={`${preset} is booked on ${editingRoutineCell.day} at ${editingRoutineCell.timeSlot} by Semester ${isBooked.semester}`}
                              >
                                <span className="line-through">{preset}</span>
                                <span className="text-[8px] px-1 py-0.2 rounded bg-rose-200/70 dark:bg-rose-900/90 font-mono text-rose-800 dark:text-rose-200">
                                  Sem {isBooked.semester}
                                </span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setRoutineFormData({ ...routineFormData, room: preset })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                              }`}
                            >
                              <span>{preset}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                  {getRoutineCell(editingRoutineCell.day, editingRoutineCell.semester, editingRoutineCell.timeSlot) ? (
                    <button
                      type="button"
                      onClick={handleClearRoutineSlot}
                      disabled={isSavingRoutine}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Slot</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRoutineCell(null)}
                      disabled={isSavingRoutine}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRoutineSlot}
                      disabled={isSavingRoutine || Boolean(currentRoomConflict) || Boolean(currentTeacherConflict)}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        currentRoomConflict
                          ? "bg-rose-400 dark:bg-rose-500 text-white cursor-not-allowed opacity-80"
                          : currentTeacherConflict
                          ? "bg-amber-500 text-white cursor-not-allowed opacity-80"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200/50 dark:shadow-none cursor-pointer"
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {isSavingRoutine
                          ? "Saving..."
                          : currentRoomConflict
                          ? "Room Conflict (Select Another Room)"
                          : currentTeacherConflict
                          ? "Teacher Busy (Select Another)"
                          : "Save Routine Slot"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Curriculum & Courses Section */}
      <div id="courses" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Full 8-Semester Syllabus</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Department Curriculum & Course Matrix
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Explore and manage standard courses from Semester 1 through 8, credits, and assigned faculty members.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncCurriculum}
              disabled={isSyncingCurriculum}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm disabled:opacity-60"
              title="Sync standard syllabus for Semesters 1 to 8"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCurriculum ? "animate-spin text-indigo-500" : ""}`} />
              <span>{isSyncingCurriculum ? "Syncing Syllabus..." : "Sync Full Curriculum (Sem 1-8)"}</span>
            </button>
            <button
              onClick={() => setShowCourseForm(!showCourseForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showCourseForm ? "Close Form" : "Add New Course"}</span>
            </button>
            <SectionCollapseToggle
              isCollapsed={collapsedSections.courses}
              onToggle={() => toggleSection("courses")}
              label="Curriculum Matrix"
            />
          </div>
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.courses}
          onExpand={() => toggleSection("courses")}
          sectionName="Department Curriculum & Course Matrix"
        >
        {/* Semester Filter Tabs (Semesters 1 to 8) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Filter by Semester (1 - 8):
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <strong className="text-indigo-600 dark:text-indigo-400">{filteredCourses.length}</strong> of {courses.length} courses ({totalFilteredCredits.toFixed(1)} credits)
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setSelectedCourseSemester("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCourseSemester === "all"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>All Semesters</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCourseSemester === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {courses.length}
              </span>
            </button>

            {SEMESTER_KEYS.map((semKey) => {
              const semCount = courses.filter((c) => 
                String(c.semesterNum) === String(semKey) || 
                (c.semester && (
                  c.semester.toLowerCase().startsWith(String(semKey)) ||
                  c.semester.toLowerCase().includes(`${semKey}st`) ||
                  c.semester.toLowerCase().includes(`${semKey}nd`) ||
                  c.semester.toLowerCase().includes(`${semKey}rd`) ||
                  c.semester.toLowerCase().includes(`${semKey}th`)
                ))
              ).length;

              const isSelected = selectedCourseSemester === String(semKey);
              return (
                <button
                  key={semKey}
                  onClick={() => setSelectedCourseSemester(String(semKey))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Sem {semKey}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    {semCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar inside courses */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses by code (e.g. CSE 1101), course title, or instructor name..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {courseSearch && (
              <button
                onClick={() => setCourseSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Add Course Form */}
        {showCourseForm && (
          <form onSubmit={handleCreateCourse} className="p-6 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-indigo-900 dark:text-indigo-200">Add New Academic Course</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input
                required
                placeholder="Code (e.g. CSE 1101)"
                value={newCourse.code}
                onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
              <input
                required
                placeholder="Course Title"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Credits (e.g. 3.0)"
                value={newCourse.credits}
                onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
              <select
                value={newCourse.semester}
                onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                {SEMESTER_KEYS.map((key) => (
                  <option key={key} value={SEMESTER_LABELS[key]}>
                    {SEMESTER_LABELS[key]} (Sem {key})
                  </option>
                ))}
              </select>
              <select
                value={newCourse.faculty}
                onChange={(e) => setNewCourse({ ...newCourse, faculty: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              >
                <option value="">-- Assigned Teacher (A, B, or C) --</option>
                {teachers
                  .filter((t) => ["A", "B", "C"].includes(t.name?.trim().toUpperCase()))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((t) => (
                    <option key={t._id || t.email} value={t.name}>
                      Teacher {t.name} (ID: {t.teacherId || "CSE"})
                    </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCourseForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Save Course
              </button>
            </div>
          </form>
        )}

        {/* Course Cards Grid */}
        {filteredCourses.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No courses match the selected criteria</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Try selecting &quot;All Semesters&quot;, clearing your search query, or synchronizing the standard syllabus.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => { setSelectedCourseSemester("all"); setCourseSearch(""); }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={handleSyncCurriculum}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white cursor-pointer"
              >
                Sync 8 Semesters
              </button>
            </div>
          </div>
        ) : (
          <div
            data-lenis-prevent
            className="max-h-[640px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((course) => (
              <div
                key={course._id || course.code}
                className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all hover:shadow-md flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                      {course.code}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      {course.credits} Credits
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm pt-1 leading-snug">{course.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium">{course.semester}</span>
                    {course.type && (
                      <>
                        <span>•</span>
                        <span className="text-[11px] font-semibold text-slate-400">{course.type}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Faculty: {course.faculty || "Assigned Faculty"}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-1 min-w-[170px]">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">Teacher:</span>
                      <select
                        value={["A", "B", "C"].includes(course.faculty?.trim().toUpperCase()) ? course.faculty.trim().toUpperCase() : ""}
                        onChange={(e) => handleQuickAssignCourseFaculty(course._id, e.target.value)}
                        className="h-7 px-2 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500 w-full truncate cursor-pointer"
                        title="Assign Teacher A, B, or C to this course"
                      >
                        <option value="">-- Select Teacher --</option>
                        {teachers
                          .filter((t) => ["A", "B", "C"].includes(t.name?.trim().toUpperCase()))
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((t) => (
                            <option key={t._id || t.email} value={t.name}>
                              Teacher {t.name} (ID: {t.teacherId || "N/A"})
                            </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => handleDeleteCourse(course._id)}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </CollapsibleBody>
      </div>

      {/* Notice Board Section */}
      <NoticeBoardSection
        isAdmin={true}
        title="Notice Board"
        subtitle="Publish text announcements with files and voice notes, then revise or remove them whenever the department needs an update."
        isCollapsed={collapsedSections.notices}
        onToggle={() => toggleSection("notices")}
      />

      {/* ── Support & Complaints Management Hub ───────────────── */}
      <div id="support-complaints" className="scroll-mt-6 space-y-6">
        <div className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1.5">
                <LifeBuoy className="w-3.5 h-3.5 text-rose-500" />
                <span>Centralized Grievance & Technical Helpdesk</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Support & Complaints Registry</span>
                {pendingSupportCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-extrabold flex items-center gap-1 border border-rose-300 dark:border-rose-700 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>{pendingSupportCount} Active / Requires Action</span>
                  </span>
                )}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Review submitted grievances, IT helpdesk tickets, and general inquiries. Update case resolution status and publish official administrative responses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh Desk</span>
              </button>
              <SectionCollapseToggle
                isCollapsed={collapsedSections.support}
                onToggle={() => toggleSection("support")}
                label="Support Registry"
              />
            </div>
          </div>

          <CollapsibleBody
            isCollapsed={collapsedSections.support}
            onExpand={() => toggleSection("support")}
            sectionName="Support & Complaints Registry"
          >
          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 flex-wrap">
              <button
                onClick={() => setSupportFilter("all")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Records ({supportRecords.length})
              </button>
              <button
                onClick={() => setSupportFilter("pending")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "pending"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Active / Needs Action ({pendingSupportCount})
              </button>
              <button
                onClick={() => setSupportFilter("complaint")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "complaint"
                    ? "bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Grievances ({complaintsCount})
              </button>
              <button
                onClick={() => setSupportFilter("technical_support")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "technical_support"
                    ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                IT Support ({techCount})
              </button>
              <button
                onClick={() => setSupportFilter("general_inquiry")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "general_inquiry"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Inquiries ({inquiriesCount})
              </button>
              <button
                onClick={() => setSupportFilter("resolved")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  supportFilter === "resolved"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Resolved ({resolvedSupportCount})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by tracking ID, subject, author, category..."
                value={supportSearch}
                onChange={(e) => setSupportSearch(e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
              />
            </div>
          </div>

          {/* Records Table */}
          <div
            data-lenis-prevent
            className="overflow-auto overscroll-contain max-h-[580px] scrollbar-thin rounded-2xl border border-slate-100 dark:border-white/5"
          >
            {filteredSupportRecords.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
                <LifeBuoy className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">No support tickets or complaints found for this view.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Ticket & Origin</th>
                    <th className="pb-3 px-4">Subject & Details</th>
                    <th className="pb-3 px-4">Reporter Information</th>
                    <th className="pb-3 px-4">Status & Priority</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredSupportRecords.map((record) => {
                    const recId = record._id || record.id;
                    const isComplaint = record.type === "complaint";
                    const isTech = record.type === "technical_support";
                    const statusStr = String(record.status || "Submitted").toLowerCase();
                    const isResolved = ["resolved", "closed"].includes(statusStr);

                    return (
                      <tr key={recId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Ticket & Origin */}
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                              {record.trackingId || "N/A"}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                isComplaint
                                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800/60"
                                  : isTech
                                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800/60"
                                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800/60"
                              }`}>
                                {isComplaint ? "Grievance" : isTech ? "IT Helpdesk" : "Inquiry"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Subject & Details */}
                        <td className="py-4 px-4 align-top max-w-xs">
                          <div className="space-y-1">
                            <div className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-1">
                              {record.title}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {record.description}
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold capitalize">
                                {record.category || record.topic || "General"}
                              </span>
                              {record.adminResponse && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Responded
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Reporter Information */}
                        <td className="py-4 px-4 align-top">
                          {record.isAnonymous ? (
                            <div className="flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900/40 w-fit">
                              <Lock className="w-3 h-3 text-rose-500" />
                              <span className="font-bold text-[11px]">Anonymous Member</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5 text-xs">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {record.authorName || "Guest User"}
                              </div>
                              {record.authorEmail && (
                                <a
                                  href={`mailto:${record.authorEmail}`}
                                  className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                                >
                                  <Mail className="w-3 h-3" />
                                  <span>{record.authorEmail}</span>
                                </a>
                              )}
                              {record.authorPhone && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{record.authorPhone}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status & Priority */}
                        <td className="py-4 px-4 align-top">
                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                              isResolved
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                                : statusStr.includes("progress") || statusStr.includes("investigating")
                                ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800"
                                : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                            }`}>
                              {isResolved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{record.status}</span>
                            </span>
                            {record.priority && (
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Priority: <span className={record.priority === "Urgent" ? "text-rose-600" : "text-slate-600 dark:text-slate-300"}>{record.priority}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-4 align-top text-xs text-slate-400">
                          {new Date(record.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Administrative Action */}
                        <td className="py-4 px-4 align-top text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedSupport(record);
                                setAdminResponseDraft(record.adminResponse || "");
                                setSelectedNewStatus(record.status === "Resolved" ? "Resolved" : "In Progress");
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-bold transition-colors cursor-pointer"
                              title="Inspect & Respond"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review & Resolve</span>
                            </button>

                            <button
                              onClick={() => handleDeleteSupport(recId, record.title)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleBody>
        </div>
      </div>

      {/* ── Staff & Employee Verification Hub ─────────────────── */}
      <div id="directory" className="scroll-mt-6 space-y-6">
        <div id="employees" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                <span>Non-Teaching Staff & Operational Verification</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Staff & Employee Verification Hub</span>
                {pendingEmployeesCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-extrabold flex items-center gap-1 border border-amber-300 dark:border-amber-700 animate-pulse">
                    <Clock className="w-3 h-3" />
                    <span>{pendingEmployeesCount} Pending</span>
                  </span>
                )}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Review and approve non-teaching staff registrations, manage laboratory officers and attendants, or export department staff rosters.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {pendingEmployeesCount > 0 && (
                <button
                  onClick={handleApproveAllEmployees}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 dark:shadow-none transition-all cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Approve All Pending ({pendingEmployeesCount})</span>
                </button>
              )}
              <button
                onClick={handleExportEmployees}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <SectionCollapseToggle
                isCollapsed={collapsedSections.employees}
                onToggle={() => toggleSection("employees")}
                label="Staff Verification"
              />
            </div>
          </div>

          <CollapsibleBody
            isCollapsed={collapsedSections.employees}
            onExpand={() => toggleSection("employees")}
            sectionName="Staff & Employee Verification Hub"
          >
          {/* Tab & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start">
              <button
                onClick={() => setEmployeeTab("pending")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  employeeTab === "pending"
                    ? "bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Pending ({pendingEmployeesCount})
              </button>
              <button
                onClick={() => setEmployeeTab("approved")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  employeeTab === "approved"
                    ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Approved ({approvedEmployeesCount})
              </button>
              <button
                onClick={() => setEmployeeTab("all")}
                className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  employeeTab === "all"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold"
                    : "hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                All Staff ({employees.length})
              </button>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search staff by name, email, designation, department, or ID..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full h-10 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div
            data-lenis-prevent
            className="overflow-auto overscroll-contain max-h-[580px] scrollbar-thin rounded-2xl border border-slate-100 dark:border-white/5"
          >
            {filteredEmployees.length === 0 ? (
              <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
                <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-sm">No department staff records found for this filter.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs">
                  <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="pb-3 px-4">Role & Department</th>
                    <th className="pb-3 px-4">Office & Staff ID</th>
                    <th className="pb-3 px-4">Contact</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                  {filteredEmployees.map((emp) => {
                    const isPending = emp.status === "pending";
                    const isRejected = emp.status === "rejected";
                    const isApproved = emp.status === "approved" || (!isPending && !isRejected);
                    const empIdentifier = emp._id || emp.userId || emp.employeeId || emp.email;

                    return (
                      <tr key={emp._id || emp.employeeId || emp.email} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        {/* Staff Member Details */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-sm ring-1 ring-emerald-200 dark:ring-emerald-800/60">
                              {emp.name ? emp.name.charAt(0).toUpperCase() : "S"}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold">
                                  Staff
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {emp.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role & Department */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {emp.designation || "Staff Officer"}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {emp.department || "Operations & Maintenance"}
                            </span>
                          </div>
                        </td>

                        {/* Office & Staff ID */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {emp.officeRoom || "Academic Staff Desk"}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                              ID: {emp.employeeId || "N/A"}
                            </span>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {emp.phone || "Not specified"}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                            isApproved
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800"
                              : isRejected
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                          }`}>
                            {isApproved ? <CheckCircle2 className="w-3 h-3" /> :
                             isRejected ? <XCircle className="w-3 h-3" /> :
                             <Clock className="w-3 h-3" />}
                            {isApproved ? "approved" : isRejected ? "rejected" : "pending"}
                          </span>
                        </td>

                        {/* Moderation Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleUpdateEmployeeStatus(empIdentifier, "approved")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleUpdateEmployeeStatus(empIdentifier, "rejected")}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUpdateEmployeeStatus(empIdentifier, isApproved ? "pending" : "approved")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Reset to {isApproved ? "Pending" : "Approved"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteEmployee(empIdentifier, emp.name)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Staff Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          </CollapsibleBody>
        </div>

        {/* Department Operations & Administrative Desk Summary Bar */}
        <div className="p-6 rounded-[2rem] bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/70 dark:from-slate-900/90 dark:via-slate-900/80 dark:to-slate-800/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">CSE Department Administrative & Operations Registry</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Academic Building, Room 401 • ext. 4401 • admin@cse.edu</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <a href="#students" className="text-indigo-600 dark:text-indigo-400 hover:underline">Student Approvals ↑</a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="#faculty" className="text-sky-600 dark:text-sky-400 hover:underline">Faculty Approvals ↑</a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="#support-complaints" className="text-rose-600 dark:text-rose-400 hover:underline">Support & Grievances ↑</a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="#routine" className="text-slate-600 dark:text-slate-400 hover:underline">Academic Routine ↑</a>
          </div>
        </div>
      </div>

      {/* ── Support & Grievance Review Modal ── */}
      {selectedSupport && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overscroll-contain"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {selectedSupport.trackingId}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedSupport.type}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
                    {selectedSupport.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupport(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reporter details */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Reporter Identity
              </div>
              {selectedSupport.isAnonymous ? (
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>100% Anonymous Submission — Reporter identity strictly protected by the grievance protocol.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedSupport.authorName || "Guest User"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedSupport.authorEmail || "Not provided"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Full Description */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Case Description & Details
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {selectedSupport.description}
              </div>
            </div>

            {/* Activity Timeline */}
            {selectedSupport.timeline && selectedSupport.timeline.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Case Activity Timeline
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {selectedSupport.timeline.map((entry, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{entry.status}</span>
                          <span className="text-[10px] text-slate-400">{new Date(entry.at).toLocaleString()}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{entry.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Administrative Response Composer */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Official Administrative Response & Resolution Note
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Set Status:</span>
                  <select
                    value={selectedNewStatus}
                    onChange={(e) => setSelectedNewStatus(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="Type the department's resolution statement, investigative findings, or guidance for the reporter..."
                value={adminResponseDraft}
                onChange={(e) => setAdminResponseDraft(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSupport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingSupportId === (selectedSupport._id || selectedSupport.id)}
                  onClick={() => handleUpdateSupportStatus(selectedSupport._id || selectedSupport.id, selectedNewStatus, adminResponseDraft)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  {updatingSupportId ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Status & Response</span>
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

