"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  Briefcase, 
  MapPin, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Cpu, 
  Server, 
  Wrench, 
  PlusCircle, 
  FileText, 
  Bell, 
  Sparkles,
  ShieldCheck,
  Activity,
  HardDrive,
  Edit3,
  Save,
  X,
  Camera,
  Upload,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Check,
  CheckCircle,
  User,
  HeartPulse,
  Hash,
  ExternalLink,
  ChevronRight,
  MonitorCheck
} from "lucide-react";
import toast from "react-hot-toast";
import Loading from "@/components/common/Loading";
import { EmployeeAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

const EMPLOYEE_DESIGNATIONS = [
  "Technical Officer",
  "Senior Lab Assistant",
  "System Administrator",
  "Network Engineer",
  "Hardware Technician",
  "Lab Assistant",
  "Senior Computer Operator",
  "Department Secretary",
  "Office Attendant"
];

const LAB_SECTIONS = [
  "Software Lab 1 (Room 301)",
  "Networking & Hardware Lab (Room 303)",
  "AI & High Performance Lab (Room 405)",
  "Multimedia & Seminar Hall (Room 501)",
  "Department Server Room (Room 205)",
  "Chairman Office & Administration"
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const ROUTINE_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];

export default function EmployeeDashboardPage() {
  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const user = sessionData?.user;

  // Profile states
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    employeeId: "",
    designation: "Technical Officer",
    department: "Computer Science & Engineering",
    section: "Software Lab Section",
    officeRoom: "Room 202 (Admin Section)",
    joiningDate: "",
    bio: "",
    address: "",
    bloodGroup: "",
    image: ""
  });
  const fileInputRef = useRef(null);

  // Shift & Duty states
  const [shiftStatus, setShiftStatus] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [isLoggingShift, setIsLoggingShift] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);

  // Maintenance Tasks states
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskCategoryFilter, setTaskCategoryFilter] = useState("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: "",
    category: "Hardware",
    location: "Software Lab 1 (Room 301)",
    priority: "Medium",
    description: "",
    assignedBy: "Chairman Office"
  });

  // Lab Facilities states
  const [labs, setLabs] = useState([]);
  const [labsLoading, setLabsLoading] = useState(true);
  const [editingLab, setEditingLab] = useState(null);
  const [labStatusForm, setLabStatusForm] = useState({ status: "", systems: "" });
  const [isSavingLab, setIsSavingLab] = useState(false);

  // Lab Schedule / Department Routine states
  const [routineSlots, setRoutineSlots] = useState([]);
  const [selectedRoutineDay, setSelectedRoutineDay] = useState("Saturday");
  const [routineLoading, setRoutineLoading] = useState(false);

  // ── 1. LOAD PROFILE DATA ─────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/email/${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setProfileForm({
          name: data?.name || user?.name || "",
          phone: data?.phone || user?.phone || "",
          employeeId: data?.employeeId || user?.employeeId || "EMP-204",
          designation: data?.designation || user?.designation || "Technical Officer",
          department: data?.department || user?.department || "Computer Science & Engineering",
          section: data?.section || "Software Lab Section",
          officeRoom: data?.officeRoom || "Room 202 (Admin Section)",
          joiningDate: data?.joiningDate || "2022-01-15",
          bio: data?.bio || "",
          address: data?.address || "PUST Campus Staff Quarter",
          bloodGroup: data?.bloodGroup || "O+",
          image: data?.image || user?.image || ""
        });
      }
    } catch (e) {
      console.error("Error loading employee profile:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, user?.name, user?.phone, user?.employeeId, user?.designation, user?.department, user?.image]);

  // ── 2. LOAD SHIFT STATUS & HISTORY ────────────────────────────
  const loadShiftData = useCallback(async () => {
    if (!user?.email) return;
    try {
      const [resStatus, resHistory] = await Promise.all([
        fetch(`${SERVER_URL}/api/employees/shift/status?email=${encodeURIComponent(user.email)}`),
        fetch(`${SERVER_URL}/api/employees/shift/history?email=${encodeURIComponent(user.email)}`)
      ]);
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        setShiftStatus(dataStatus);
      }
      if (resHistory.ok) {
        const dataHistory = await resHistory.json();
        if (dataHistory.shifts) {
          setShiftHistory(dataHistory.shifts);
        }
      }
    } catch (e) {
      console.warn("Could not sync shift status:", e);
    }
  }, [user?.email]);

  // ── 3. LOAD MAINTENANCE TASKS ────────────────────────────────
  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/tasks`);
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          setTasks(data.tasks);
        }
      }
    } catch (e) {
      console.warn("Could not fetch maintenance tasks:", e);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // ── 4. LOAD LAB FACILITIES ────────────────────────────────────
  const loadLabs = useCallback(async () => {
    setLabsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/labs`);
      if (res.ok) {
        const data = await res.json();
        if (data.labs) {
          setLabs(data.labs);
        }
      }
    } catch (e) {
      console.warn("Could not fetch lab facilities:", e);
    } finally {
      setLabsLoading(false);
    }
  }, []);

  // ── 5. LOAD DEPARTMENT ROUTINE (LAB SCHEDULES) ───────────────
  const loadRoutines = useCallback(async () => {
    setRoutineLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/routines`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setRoutineSlots(data);
        } else if (data?.routines) {
          setRoutineSlots(data.routines);
        }
      }
    } catch (e) {
      console.warn("Could not fetch departmental routines:", e);
    } finally {
      setRoutineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadProfile();
      loadShiftData();
      loadTasks();
      loadLabs();
      loadRoutines();
    } else if (!sessionLoading) {
      setIsLoading(false);
    }
  }, [user?.email, sessionLoading, loadProfile, loadShiftData, loadTasks, loadLabs, loadRoutines]);

  // ── PROFILE ACTIONS ───────────────────────────────────────────
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file should be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setProfileForm((prev) => ({ ...prev, image: event.target.result }));
      toast.success("Picture preview updated!");
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user?.email) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/profile/${encodeURIComponent(user.email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProfile(data.employee);
        toast.success("Employee profile updated successfully!");
        setIsEditingProfile(false);
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Network error saving profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ── SHIFT CHECK-IN ACTIONS ───────────────────────────────────
  const handleToggleShift = async () => {
    if (!user?.email) return;
    setIsLoggingShift(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/shift/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: profile?.name || user.name || "Staff Member",
          employeeId: profile?.employeeId || user.employeeId || "EMP-204"
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        loadShiftData();
      } else {
        toast.error(data.error || "Shift log failed");
      }
    } catch {
      toast.error("Network error recording shift");
    } finally {
      setIsLoggingShift(false);
    }
  };

  // ── TASK WORK ORDER ACTIONS ──────────────────────────────────
  const handleToggleTaskStatus = async (taskId, currentStatus) => {
    try {
      let nextStatus = "In Progress";
      if (currentStatus === "Pending") nextStatus = "In Progress";
      else if (currentStatus === "In Progress") nextStatus = "Resolved";
      else nextStatus = "Pending";

      const res = await fetch(`${SERVER_URL}/api/employees/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTasks((prev) =>
          prev.map((t) => (t.ticketId === taskId || t._id === taskId ? { ...t, status: nextStatus } : t))
        );
        toast.success(`Ticket ${taskId} marked as ${nextStatus}!`);
      } else {
        toast.error(data.error || "Failed to update ticket status");
      }
    } catch {
      toast.error("Network error updating task");
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      toast.error("Please enter a ticket title");
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTaskForm,
          reportedByEmail: user?.email || ""
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("New maintenance ticket created!");
        setTasks((prev) => [data.task, ...prev]);
        setShowNewTaskModal(false);
        setNewTaskForm({
          title: "",
          category: "Hardware",
          location: "Software Lab 1 (Room 301)",
          priority: "Medium",
          description: "",
          assignedBy: profile?.name || user?.name || "Staff Officer"
        });
      } else {
        toast.error(data.error || "Failed to create ticket");
      }
    } catch {
      toast.error("Network error creating ticket");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm(`Are you sure you want to delete ticket ${taskId}?`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/employees/tasks/${taskId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.ticketId !== taskId && t._id !== taskId));
        toast.success("Ticket deleted.");
      }
    } catch {
      toast.error("Could not delete ticket");
    }
  };

  // ── LAB STATUS ACTIONS ───────────────────────────────────────
  const handleOpenEditLab = (lab) => {
    setEditingLab(lab);
    setLabStatusForm({
      status: lab.status || "100% Operational",
      systems: lab.systems || ""
    });
  };

  const handleSaveLabStatus = async (e) => {
    e.preventDefault();
    if (!editingLab) return;
    setIsSavingLab(true);
    try {
      const idOrName = editingLab._id || editingLab.name;
      const res = await fetch(`${SERVER_URL}/api/employees/labs/${encodeURIComponent(idOrName)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labStatusForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${editingLab.name} status updated!`);
        setLabs((prev) =>
          prev.map((l) => (l.name === editingLab.name ? { ...l, ...labStatusForm } : l))
        );
        setEditingLab(null);
      } else {
        toast.error(data.error || "Failed to update lab");
      }
    } catch {
      toast.error("Network error updating lab facility");
    } finally {
      setIsSavingLab(false);
    }
  };

  // ── FILTERED DATA ────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesCat = taskCategoryFilter === "all" || t.category === taskCategoryFilter;
      const matchesStatus = taskStatusFilter === "all" || t.status === taskStatusFilter;
      const matchesSearch =
        !taskSearch ||
        t.title?.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.ticketId?.toLowerCase().includes(taskSearch.toLowerCase()) ||
        t.location?.toLowerCase().includes(taskSearch.toLowerCase());
      return matchesCat && matchesStatus && matchesSearch;
    });
  }, [tasks, taskCategoryFilter, taskStatusFilter, taskSearch]);

  const routineForSelectedDay = useMemo(() => {
    return routineSlots.filter((slot) => slot.day === selectedRoutineDay);
  }, [routineSlots, selectedRoutineDay]);

  if (isLoading && !profile) {
    return (
      <Loading 
        text="Loading Staff Workspace..." 
        subtext="Synchronizing assigned maintenance logs, facility health, and lab status" 
        fullScreen 
      />
    );
  }

  const activeImage = profile?.image || user?.image || null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── 1. EMPLOYEE PROFILE HERO CARD ──────────────────────────── */}
      <div id="profile" className="p-8 rounded-[2rem] bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 font-extrabold text-2xl border border-white/20 shadow-inner overflow-hidden ring-2 ring-emerald-500/30">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={user?.name || "Staff Member"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{user?.name ? user.name.charAt(0).toUpperCase() : "E"}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title="Edit Profile"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-200 backdrop-blur-md mb-1 border border-emerald-400/20">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profile?.designation || user?.designation || "Technical Officer / Staff"}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{profile?.name || user?.name || "Staff Member"}</span>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </h1>
              <p className="text-xs text-emerald-200/80 font-medium flex items-center gap-2 flex-wrap">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md">ID: {profile?.employeeId || user?.employeeId || "EMP-204"}</span>
                <span>•</span>
                <span>{profile?.section || "Software Lab Section"}</span>
                <span>•</span>
                <span>{profile?.department || "Computer Science & Engineering"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-medium text-slate-200 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[280px]">
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              Office: {profile?.officeRoom || "Dept Admin Section, Rm 202"}
            </span>
            <span className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {user?.email}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {profile?.phone || user?.phone || "+880 (Contact)"}
            </span>
            <span className="flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              Blood Group: <strong className="text-rose-300 font-bold">{profile?.bloodGroup || "Not Set"}</strong>
            </span>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Staff Credentials</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. QUICK ACTION & SHIFT STATUS BAR ───────────────────────── */}
      <div id="shift" className="grid grid-cols-1 md:grid-cols-4 gap-4 scroll-mt-6">
        {/* Today's Shift Card */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duty Check-In</span>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              {shiftStatus?.isCheckedIn
                ? `Checked In (${shiftStatus.shift?.checkInFormatted || "Recorded"})`
                : "Not Checked In Today"}
            </h4>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {shiftStatus?.isCheckedOut
                ? "Shift Completed"
                : shiftStatus?.isCheckedIn
                ? "Duty In Progress"
                : "08:30 AM - 04:30 PM Shift"}
            </span>
          </div>
          <button
            onClick={handleToggleShift}
            disabled={isLoggingShift || shiftStatus?.isCheckedOut}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              shiftStatus?.isCheckedOut
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                : shiftStatus?.isCheckedIn
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 dark:shadow-none"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none"
            }`}
          >
            {isLoggingShift
              ? "Recording..."
              : shiftStatus?.isCheckedOut
              ? "Completed"
              : shiftStatus?.isCheckedIn
              ? "Check Out"
              : "Log Check-in"}
          </button>
        </div>

        {/* Monitored Labs Counter */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex items-center gap-4 transition-colors">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monitored Labs</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">{labs.length} Labs</h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">All Lab Clusters Active</span>
          </div>
        </div>

        {/* Active Tickets Counter */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex items-center gap-4 transition-colors">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tickets</span>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white">
              {tasks.filter((t) => t.status !== "Resolved").length} Pending
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {tasks.filter((t) => t.status === "In Progress").length} In Progress
            </span>
          </div>
        </div>

        {/* Duty Logs & History Launcher */}
        <div className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duty Records</span>
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Shift Log History</h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{shiftHistory.length} Recorded Shifts</span>
          </div>
          <button
            onClick={() => setShowShiftHistoryModal(true)}
            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
            title="View Shift History"
          >
            <Clock className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── 3. HARDWARE FLEET & MAINTENANCE ANALYTICS ──────────────── */}
      <div id="analytics" className="scroll-mt-6">
        <EmployeeAnalyticsCharts tasks={tasks} labFacilities={labs} />
      </div>

      {/* ── 4. LAB FACILITIES & INFRASTRUCTURE ─────────────────────── */}
      <div id="inventory" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Department Lab Infrastructure & Hardware Status</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Real-time monitoring of computer laboratories, server rooms, and lecture halls
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs ring-1 ring-emerald-200 dark:ring-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Normal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {labs.map((lab, idx) => (
            <div
              key={lab._id || lab.name || `lab-${idx}`}
              className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all hover:shadow-md space-y-3 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {lab.name}
                    </h4>
                    <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">{lab.room}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ${lab.badgeColor || "bg-emerald-50 text-emerald-700"}`}>
                    {lab.status}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{lab.systems}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{lab.specs}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">In Charge: {lab.inCharge || "Staff Officer"}</span>
                <button
                  type="button"
                  onClick={() => handleOpenEditLab(lab)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold transition cursor-pointer"
                >
                  Edit Status
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. MAINTENANCE TICKETS & WORK ORDERS ───────────────────── */}
      <div id="tasks" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Assigned Section Tasks & Maintenance Tickets</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Click any status button to toggle between Pending, In Progress, and Resolved
            </p>
          </div>
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Work Ticket</span>
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", "Pending", "In Progress", "Resolved"].map((st) => (
              <button
                key={st}
                onClick={() => setTaskStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  taskStatusFilter === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {st === "all" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, lab, ticket ID..."
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Tickets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Ticket ID</th>
                <th className="pb-3 px-4">Task Description</th>
                <th className="pb-3 px-4">Location</th>
                <th className="pb-3 px-4">Priority</th>
                <th className="pb-3 px-4">Status (Click to Toggle)</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10 text-xs font-medium text-slate-700 dark:text-slate-200">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No maintenance tickets match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task, idx) => {
                  const tId = task.ticketId || task._id || `task-${idx}`;
                  return (
                    <tr key={tId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {task.ticketId || "TK-NEW"}
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white">{task.title}</div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Category: {task.category} • Assigned By: {task.assignedBy}
                        </span>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        {task.location}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                          task.priority === "High"
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800"
                            : task.priority === "Medium"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700"
                        }`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleTaskStatus(task.ticketId || task._id, task.status)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                            task.status === "Resolved"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300"
                              : task.status === "In Progress"
                              ? "bg-sky-100 dark:bg-sky-950/60 hover:bg-sky-200 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300"
                              : "bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300"
                          }`}
                          title="Click to cycle status"
                        >
                          {task.status === "Resolved" ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : task.status === "In Progress" ? (
                            <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-spin" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                          <span>{task.status}</span>
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDeleteTask(task.ticketId || task._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. CLASSROOM & LAB TIMETABLE SUPERVISION ────────────────── */}
      <div id="schedule" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Department Lab Timetable & Room Preparation</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Check scheduled practical sessions and faculty reservations to prepare laboratories ahead of class hours
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {ROUTINE_DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedRoutineDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedRoutineDay === day
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {routineLoading ? (
          <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
            Loading departmental laboratory schedule...
          </div>
        ) : routineForSelectedDay.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <MonitorCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No practical sessions or lab routine slots scheduled for {selectedRoutineDay}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routineForSelectedDay.map((slot, idx) => (
              <div
                key={slot._id || `${slot.day}-${slot.timeSlot}-${idx}`}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                    {slot.courseCode} • Sem {slot.semester}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                    {slot.timeSlot}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {slot.courseTitle || slot.courseCode}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Instructor: <strong>{slot.teacherName || "Assigned Faculty"}</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{slot.roomNo || "Lab Room"}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Prep Required
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. OFFICIAL NOTICE BOARD ─────────────────────────────────── */}
      <NoticeBoardSection
        title="Notice Board"
        subtitle="Department broadcast & staff operational notices."
      />

      {/* ── MODAL: EDIT STAFF PROFILE ───────────────────────────────── */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Staff Profile & Credentials</h3>
                  <p className="text-xs text-slate-400">Update your official contact and lab credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Photo Upload Row */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {profileForm.image ? (
                    <img src={profileForm.image} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Staff Photograph</label>
                  <p className="text-[11px] text-slate-400">JPG, PNG or WEBP up to 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Picture</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Designation</label>
                  <select
                    value={profileForm.designation}
                    onChange={(e) => setProfileForm({ ...profileForm, designation: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    {EMPLOYEE_DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assigned Section</label>
                  <select
                    value={profileForm.section}
                    onChange={(e) => setProfileForm({ ...profileForm, section: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    {LAB_SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Office / Lab Room</label>
                  <input
                    type="text"
                    value={profileForm.officeRoom}
                    onChange={(e) => setProfileForm({ ...profileForm, officeRoom: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Blood Group</label>
                  <select
                    value={profileForm.bloodGroup}
                    onChange={(e) => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Residential Address</label>
                <input
                  type="text"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Role & Responsibilities Bio</label>
                <textarea
                  rows={3}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Describe your maintenance scope, technical specializations, or duty responsibilities..."
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md shadow-emerald-200 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProfile ? "Saving Profile..." : "Save Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE WORK TICKET ───────────────────────────────── */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Create Work Ticket</h3>
                  <p className="text-xs text-slate-400">Log a facility or hardware maintenance order</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Lab 1 - Replace faulty HDMI switch"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category</label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Software">Software</option>
                    <option value="Network">Network</option>
                    <option value="Power & Facility">Power & Facility</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location / Lab</label>
                <select
                  value={newTaskForm.location}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                >
                  {LAB_SECTIONS.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Task Notes / Description</label>
                <textarea
                  rows={3}
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  placeholder="Detail symptoms, affected node numbers, or required spare parts..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isCreatingTask ? "Creating Ticket..." : "Submit Ticket"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT LAB FACILITY STATUS ─────────────────────────── */}
      {editingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Update {editingLab.name}</h3>
                <p className="text-xs text-slate-400">{editingLab.room}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLab(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLabStatus} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Operational Health Status</label>
                <select
                  value={labStatusForm.status}
                  onChange={(e) => setLabStatusForm({ ...labStatusForm, status: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold outline-none focus:border-indigo-500"
                >
                  <option value="100% Operational">100% Operational</option>
                  <option value="95% Operational">95% Operational</option>
                  <option value="Maintenance Needed">Maintenance Needed</option>
                  <option value="Under Service">Under Service</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Workstation Status Line</label>
                <input
                  type="text"
                  value={labStatusForm.systems}
                  onChange={(e) => setLabStatusForm({ ...labStatusForm, systems: e.target.value })}
                  placeholder="e.g. 45 / 45 PCs Online"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLab(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLab}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingLab ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SHIFT HISTORY ────────────────────────────────────── */}
      {showShiftHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Duty Shift Check-In Log</h3>
                  <p className="text-xs text-slate-400">Attendance records recorded with biometric timestamping</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShiftHistoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {shiftHistory.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No shift logs found yet. Click "Log Check-in" to record today's shift.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {shiftHistory.map((s, idx) => (
                  <div key={s._id || `${s.date}-${idx}`} className="py-3.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{s.date}</div>
                      <div className="text-[11px] text-slate-400">{s.shiftType || "Standard Day Duty"}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {s.checkInFormatted || "Recorded"} {s.checkOutFormatted ? `➔ ${s.checkOutFormatted}` : "(In Progress)"}
                      </span>
                      <div className="text-[10px] text-slate-400">
                        {s.durationHours ? `Total: ${s.durationHours}` : s.status || "Present"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
