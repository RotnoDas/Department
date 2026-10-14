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
  FileText
} from "lucide-react";
import toast from "react-hot-toast";
import { SEMESTER_COURSES, SEMESTER_LABELS, SEMESTER_KEYS } from "@/data/courses";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function AdminDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingStudents: 0,
    approvedStudents: 0,
    totalTeachers: 0,
    totalEmployees: 0,
    totalUsers: 0,
  });
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

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
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      toast.error("Failed to fetch department statistics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    const headers = ["Name", "Email", "Teacher ID", "Designation", "Specialization", "Office Room", "Phone"];
    const rows = teachers.map(t => [
      `"${t.name || ''}"`,
      `"${t.email || ''}"`,
      `"${t.teacherId || ''}"`,
      `"${t.designation || ''}"`,
      `"${t.specialization || ''}"`,
      `"${t.officeRoom || ''}"`,
      `"${t.phone || ''}"`
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
    return true;
  }).filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 backdrop-blur-md shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Faculty Members</span>
            <div className="h-10 w-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Presentation className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalTeachers}</span>
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">Teaching Staff</span>
          </div>
        </div>

        {/* Staff Employees */}
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Department Staff</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalEmployees}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Officers & Staff</span>
          </div>
        </div>
      </div>

      {/* Main Section: Student Approvals & Directory */}
      <div id="students" className="scroll-mt-6">
        <div id="pending" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Admissions & Verification Hub</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Review and approve pending accounts, manage verified students, or export CSV records.
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
          </div>
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 self-start">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "pending" 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" 
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Pending ({stats.pendingStudents})
            </button>
            <button
              onClick={() => setActiveTab("approved")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "approved" 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" 
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Approved ({stats.approvedStudents})
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "all" 
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold" 
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Students ({stats.totalStudents})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, roll, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Students Table */}
        <div id="students" className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
              <UserCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-sm">No student registrations found for this filter.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Student Details</th>
                  <th className="pb-3 px-4">Academic Info</th>
                  <th className="pb-3 px-4">Contact</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                {filteredStudents.map((student) => (
                  <tr key={student._id || student.userId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Name & Email */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">
                          {student.name ? student.name.charAt(0).toUpperCase() : "S"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Academic Info */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-200">Roll: {student.studentId || "N/A"}</span>
                        <span className="text-slate-500 dark:text-slate-400">Batch {student.batch || "N/A"} • Sem {student.semester || "N/A"}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">Session: {student.session || "N/A"}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {student.phone || "N/A"}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">{student.address || "Pabna"}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase ${
                        student.status === "approved" 
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800" 
                          : student.status === "rejected"
                          ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                          : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                      }`}>
                        {student.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> :
                         student.status === "rejected" ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {student.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {student.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(student._id || student.userId || student.studentId || student.email, "approved")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(student._id || student.userId || student.studentId || student.email, "rejected")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(student._id || student.userId || student.studentId || student.email, student.status === "approved" ? "pending" : "approved")}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Reset to {student.status === "approved" ? "Pending" : "Approved"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStudent(student._id || student.userId || student.studentId || student.email, student.name)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
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
          </div>
        </div>

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
              <input
                placeholder="Assigned Faculty"
                value={newCourse.faculty}
                onChange={(e) => setNewCourse({ ...newCourse, faculty: e.target.value })}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
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
                Try selecting "All Semesters", clearing your search query, or synchronizing the standard syllabus.
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
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Faculty: {course.faculty || "Faculty Department Pool"}</p>
                </div>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                  <button
                    onClick={() => handleDeleteCourse(course._id)}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notice Board Dispatcher Section */}
      <div id="notices" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Official Notice Board & Circular Dispatcher
            </h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Publish official announcements, academic notices, and circulars visible across student and staff portals.
            </p>
          </div>
          <button
            onClick={() => setShowNoticeForm(!showNoticeForm)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{showNoticeForm ? "Close Form" : "Dispatch Notice"}</span>
          </button>
        </div>

        {/* Notice Dispatch Form */}
        {showNoticeForm && (
          <form onSubmit={handleCreateNotice} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Publish New Official Circular</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Notice Title</label>
                <input
                  required
                  placeholder="e.g. 6th Semester Practical Exam Seating"
                  value={newNotice.title}
                  onChange={(e) => setNewNotice({ ...newNotice, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Category</label>
                <select
                  value={newNotice.category}
                  onChange={(e) => setNewNotice({ ...newNotice, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  <option value="Academic" className="bg-white dark:bg-slate-800">Academic</option>
                  <option value="Examination" className="bg-white dark:bg-slate-800">Examination</option>
                  <option value="Events" className="bg-white dark:bg-slate-800">Events</option>
                  <option value="Infrastructure" className="bg-white dark:bg-slate-800">Infrastructure</option>
                  <option value="General" className="bg-white dark:bg-slate-800">General</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Target Audience</label>
                <select
                  value={newNotice.audience}
                  onChange={(e) => setNewNotice({ ...newNotice, audience: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  <option value="All Members" className="bg-white dark:bg-slate-800">All Members</option>
                  <option value="All Students" className="bg-white dark:bg-slate-800">All Students</option>
                  <option value="Faculty Only" className="bg-white dark:bg-slate-800">Faculty Only</option>
                  <option value="Staff Only" className="bg-white dark:bg-slate-800">Staff Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Notice Content / Body</label>
              <textarea
                required
                rows={3}
                placeholder="Enter detailed notice content, schedule, or instructions..."
                value={newNotice.content}
                onChange={(e) => setNewNotice({ ...newNotice, content: e.target.value })}
                className="w-full p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNoticeForm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Publish Notice
              </button>
            </div>
          </form>
        )}

        {/* Notices Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => (
            <div
              key={notice._id}
              className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-slate-200 dark:hover:border-slate-600 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                      {notice.category || "General"}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                      Audience: {notice.audience || "All"}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{notice.date}</span>
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{notice.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{notice.content}</p>
              </div>

              <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end">
                <button
                  onClick={() => handleDeleteNotice(notice._id)}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Notice</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Faculty and Staff Sections */}
      <div id="directory" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-6">
        {/* Faculty Roster */}
        <div id="teachers" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Presentation className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Faculty Members ({teachers.length})</h3>
            </div>
            <button
              onClick={handleExportFaculty}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-bold transition-all cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/10 max-h-80 overflow-y-auto">
            {teachers.map(teacher => (
              <div key={teacher._id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{teacher.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.designation || "Faculty"} • {teacher.specialization || "CSE"}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{teacher.email}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{teacher.officeRoom || "Academic Bldg"}</span>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">ID: {teacher.teacherId || "N/A"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Employees Roster */}
        <div id="employees" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Staff Members ({employees.length})</h3>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
              Non-Teaching Staff
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-white/10 max-h-80 overflow-y-auto">
            {employees.map(emp => (
              <div key={emp._id} className="py-3.5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{emp.designation || "Staff"} • {emp.department || "Office"}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{emp.email}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.employeeId || "Staff ID"}</span>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">{emp.phone || "N/A"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
