"use client";

import React, { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  Presentation, 
  Clock, 
  BookOpen, 
  UserCheck, 
  Sparkles, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  FileText, 
  Play, 
  CheckCircle2, 
  Layers,
  AlertCircle,
  RefreshCw,
  LogOut,
  Plus,
  UploadCloud,
  X,
  Camera,
  Save,
  Edit3,
  Trash2,
  User,
  Users,
  Globe,
  Award,
  GraduationCap,
  Image as ImageIcon,
  Link2,
  Upload,
  Check,
  Coffee
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import toast from "react-hot-toast";
import Loading from "@/components/common/Loading";
import { TeacherAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";
import TeacherAssignmentsSection from "@/components/assignment/TeacherAssignmentsSection";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

const ROUTINE_DAYS = ["All Days", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
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
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DESIGNATIONS = [
  "Professor", 
  "Associate Professor", 
  "Assistant Professor", 
  "Lecturer", 
  "Adjunct Faculty",
  "Visiting Professor",
  "Department Head"
];

export default function TeacherDashboardPage() {
  const { data: sessionData, isPending: sessionLoading } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teacherSchedule, setTeacherSchedule] = useState([]);
  const [allRoutines, setAllRoutines] = useState([]);
  const [routineViewMode, setRoutineViewMode] = useState("my"); // "my" | "full"
  const [selectedFullSemester, setSelectedFullSemester] = useState("all"); // "all" | "7" | "8"
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("All Days");

  // Profile Edit & Photo State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    teacherId: "",
    designation: "Professor",
    specialization: "",
    officeRoom: "",
    joiningDate: "",
    bio: "",
    address: "",
    bloodGroup: "",
    education: "",
    researchInterests: "",
    github: "",
    linkedin: "",
    googleScholar: "",
    website: "",
    image: "",
  });

  // Materials state & modal
  const [materials, setMaterials] = useState([
    { id: "1", title: "Course Introduction & Syllabus Overview", course: "CSE Core", type: "PDF Document", date: "Just now" },
  ]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [materialForm, setMaterialForm] = useState({ title: "", course: "", type: "Lecture Slides (PDF)" });
  const [materialFile, setMaterialFile] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  // Course-wise Attendance Roster Modal
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [selectedRosterCourse, setSelectedRosterCourse] = useState("all");
  const [rosterData, setRosterData] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Attendance history state
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  const syncFormData = (data) => {
    setFormData({
      name: data?.name || user?.name || "",
      phone: data?.phone || user?.phone || "",
      teacherId: data?.teacherId || user?.teacherId || "",
      designation: data?.designation || user?.designation || "Professor",
      specialization: data?.specialization || user?.specialization || "",
      officeRoom: data?.officeRoom || user?.officeRoom || "",
      joiningDate: data?.joiningDate || user?.joiningDate || "",
      bio: data?.bio || "",
      address: data?.address || user?.address || "",
      bloodGroup: data?.bloodGroup || user?.bloodGroup || "",
      education: data?.education || "",
      researchInterests: data?.researchInterests || "",
      github: data?.github || "",
      linkedin: data?.linkedin || "",
      googleScholar: data?.googleScholar || "",
      website: data?.website || "",
      image: data?.image || user?.image || "",
    });
  };

  const loadProfile = async (showFeedback = false) => {
    if (!user?.email) {
      if (!sessionLoading) {
        setIsLoading(false);
      }
      return;
    }
    if (showFeedback) setIsRefreshing(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/teachers/email/${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        syncFormData(data);
        if (data.status === "approved") {
          if (showFeedback) toast.success("Faculty account verified and approved!");
        } else if (data.status === "pending" && showFeedback) {
          toast("Status: Still pending department administrator approval.", { icon: "⏳" });
        }
        // Load schedule for this teacher
        loadSchedule(data);
      } else {
        syncFormData(null);
        loadSchedule(null);
      }
    } catch (e) {
      console.error(e);
      if (showFeedback) toast.error("Could not reach verification server.");
    } finally {
      setIsLoading(false);
      if (showFeedback) setIsRefreshing(false);
    }
  };

  const loadSchedule = async (teacherData) => {
    setScheduleLoading(true);
    try {
      const teacherName = teacherData?.name || user?.name;
      const teacherId = teacherData?.teacherId || user?.teacherId;
      const email = teacherData?.email || user?.email;

      const params = new URLSearchParams();
      if (teacherId) params.set("teacherId", teacherId);
      if (teacherName) params.set("teacherName", teacherName);
      if (email) params.set("email", email);

      const [myRes, allRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/teacher/routine?${params.toString()}`),
        fetch(`${SERVER_URL}/api/routines`)
      ]);

      if (myRes.ok) {
        const slots = await myRes.json();
        const formatted = (slots || []).map((slot) => ({
          id: slot._id,
          code: slot.courseCode,
          title: slot.courseTitle,
          room: slot.room,
          time: slot.timeSlot,
          day: slot.day,
          semester: `Semester ${slot.semester}`,
          semesterNum: slot.semester,
          enrolled: 45 + ((slot.semester || 1) * 2),
        }));
        setTeacherSchedule(formatted);
      }

      if (allRes.ok) {
        const aData = await allRes.json();
        const aList = Array.isArray(aData) ? aData : (aData.routines || []);
        setAllRoutines(aList);
      }
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const getFullRoutineCells = (day, timeSlot) => {
    return allRoutines.filter((r) => {
      const isSlot = r.timeSlot === timeSlot ||
        r.timeSlot?.replace(/^0/, "") === timeSlot?.replace(/^0/, "");
      if (selectedFullSemester !== "all") {
        return r.day === day && isSlot && Number(r.semester) === Number(selectedFullSemester);
      }
      return r.day === day && isSlot;
    });
  };

  useEffect(() => {
    if (user?.email) {
      loadProfile();
    } else if (!sessionLoading) {
      setIsLoading(false);
    }
  }, [user?.email, sessionLoading]);

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Client-side image optimization & base64 converter
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Please select an image under 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        // Optimize on canvas: max 600px width/height for avatar fidelity
        const maxDim = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setFormData((prev) => ({ ...prev, image: compressedDataUrl }));
        toast.success("New picture staged! Click 'Save Profile Changes' or 'Save Picture Now' to apply.");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Instant save for profile picture
  const handleQuickSavePhoto = async (newImageUrl) => {
    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) {
      toast.error("User session not found.");
      return;
    }

    setIsUploadingPhoto(true);
    const photoToSave = newImageUrl !== undefined ? newImageUrl : formData.image;

    try {
      const res = await fetch(`${SERVER_URL}/api/teachers/profile/${encodeURIComponent(targetEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoToSave }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile picture");
      }

      setProfile(data.teacher);
      setFormData((prev) => ({ ...prev, image: data.teacher.image || "" }));
      toast.success(photoToSave ? "Profile picture updated successfully!" : "Profile picture removed.");
    } catch (err) {
      console.error("Photo save error:", err);
      toast.error(err.message || "Failed to update profile picture");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
    if (profile?.image) {
      handleQuickSavePhoto("");
    } else {
      toast.success("Profile photo cleared.");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    if (!formData.name?.trim()) {
      toast.error("Faculty Name is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/teachers/profile/${encodeURIComponent(targetEmail)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update faculty profile");
      }

      setProfile(data.teacher);
      syncFormData(data.teacher);
      setIsEditing(false);
      toast.success("Faculty profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err.message || "Failed to save profile changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    syncFormData(profile);
    setIsEditing(false);
  };

  const handleStartAttendance = async (cls) => {
    if (isPending) {
      toast.error("Your faculty account is pending administrator approval.");
      return;
    }
    const newLog = {
      id: Date.now().toString(),
      course: cls.code,
      title: cls.title,
      room: cls.room,
      date: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      present: Math.floor(cls.enrolled * 0.92),
      absent: Math.floor(cls.enrolled * 0.08),
      percentage: "92.0%"
    };
    setAttendanceLogs(prev => [newLog, ...prev]);

    try {
      await fetch(`${SERVER_URL}/api/attendance/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: cls.code,
          courseTitle: cls.title,
          semester: cls.semesterNum || cls.semester,
          teacherName: activeName,
          room: cls.room,
          timeSlot: cls.time,
          day: cls.day
        })
      });
      toast.success(`Live attendance session launched for ${cls.code} (${cls.room})! Students can now check in.`);
    } catch (e) {
      console.error(e);
      toast.success(`Active attendance session started for ${cls.code} (${cls.room})!`);
    }
  };

  const fetchPersistedMaterials = async () => {
    try {
      const res = await fetch("/backend/api/materials");
      const data = await res.json();
      if (res.ok && data.materials && data.materials.length > 0) {
        setMaterials(data.materials);
      }
    } catch (e) {
      console.warn("Could not load persisted materials:", e);
    }
  };

  useEffect(() => {
    fetchPersistedMaterials();
  }, []);

  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.title.trim() || !materialForm.course.trim()) {
      toast.error("Please enter material title and course code.");
      return;
    }
    setUploadingMaterial(true);
    try {
      const formData = new FormData();
      formData.append("title", materialForm.title.trim());
      formData.append("course", materialForm.course.trim());
      formData.append("type", materialForm.type);
      formData.append("teacherName", activeName || user?.name || "Faculty Member");
      formData.append("teacherEmail", user?.email || "");
      if (materialFile) {
        formData.append("file", materialFile);
      }

      const res = await fetch("/backend/api/materials", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Study material published for students!");
        setMaterialForm({ title: "", course: "", type: "Lecture Slides (PDF)" });
        setMaterialFile(null);
        setShowUploadModal(false);
        fetchPersistedMaterials();
      } else {
        toast.error(data.error || "Failed to upload study material");
      }
    } catch {
      toast.error("Network error uploading material");
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleLoadRosterReport = async (courseCode) => {
    setRosterLoading(true);
    setShowRosterModal(true);
    try {
      const url = courseCode && courseCode !== "all"
        ? `/backend/api/attendance/teacher/roster-report?courseCode=${encodeURIComponent(courseCode)}`
        : `/backend/api/attendance/teacher/roster-report`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.success) {
        setRosterData(data);
      }
    } catch (e) {
      toast.error("Could not fetch roster report.");
    } finally {
      setRosterLoading(false);
    }
  };

  const isPending = (profile?.status || user?.status) === "pending";

  const filteredSchedule = selectedDay === "All Days"
    ? teacherSchedule
    : teacherSchedule.filter(s => s.day === selectedDay);

  const displayImage = formData.image || profile?.image || user?.image || null;
  const activeName = profile?.name || user?.name || "Faculty Member";
  const activeDesignation = profile?.designation || user?.designation || "Faculty Member";
  const activeTeacherId = profile?.teacherId || user?.teacherId || "Assigned by Dept";
  const activeSpecialization = profile?.specialization || user?.specialization || "Computer Science & Engineering";
  const activeOffice = profile?.officeRoom || user?.officeRoom || "Academic Building";
  const activePhone = profile?.phone || user?.phone || "+880 (Contact)";

  if (!sessionLoading && !user && !profile) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 space-y-4 bg-white/80 dark:bg-slate-900/80 rounded-3xl border border-slate-200 dark:border-white/10 backdrop-blur-xl">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Faculty Session Required</h2>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed font-medium">Please sign in with your faculty email and password to access your teaching dashboard, schedule, and profile management.</p>
        <a href="/login" className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-transform hover:scale-105 active:scale-95">
          Sign In Now
        </a>
      </div>
    );
  }

  if (isLoading && !profile) {
    return (
      <Loading 
        text="Loading Faculty Workspace..." 
        subtext="Synchronizing teaching schedule, course modules, and department notices" 
        fullScreen 
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Faculty Profile Hero Card */}
      <div id="profile" className="p-7 sm:p-8 rounded-[2rem] bg-gradient-to-r from-sky-950 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden scroll-mt-6 border border-white/10">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-sky-300 font-extrabold text-3xl border border-white/20 shadow-inner overflow-hidden ring-2 ring-white/10">
                {displayImage ? (
                  <img src={displayImage} alt={activeName} className="h-full w-full object-cover" />
                ) : (
                  <span>{activeName ? activeName.charAt(0).toUpperCase() : "T"}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setTimeout(() => {
                    fileInputRef.current?.click();
                    const el = document.getElementById("profile-settings");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 60);
                }}
                title="Change Faculty Picture"
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-lg border border-white/30 transition-transform active:scale-95 cursor-pointer group-hover:scale-110"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200 backdrop-blur-md mb-1 border border-sky-400/20">
                <Presentation className="w-3.5 h-3.5 text-sky-400" />
                <span>{activeDesignation}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {activeName}
              </h1>
              <p className="text-xs text-sky-200/80 font-medium flex items-center gap-2 flex-wrap">
                <span>ID: {activeTeacherId}</span>
                <span>•</span>
                <span>Domain: {activeSpecialization}</span>
                {profile?.education && (
                  <>
                    <span>•</span>
                    <span>{profile.education}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-2 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm flex-1">
              <span className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{activePhone}</span>
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">Office: {activeOffice}</span>
              </span>
            </div>

            <button
              onClick={() => {
                setIsEditing(!isEditing);
                const el = document.getElementById("profile-settings");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            >
              <Edit3 className="w-4 h-4 text-sky-300" />
              <span>{isEditing ? "Close Profile Editor" : "Edit Profile Data"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Account Verification Gate / Status Banner */}
      {isPending ? (
        <div className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-amber-200/80 dark:border-amber-800/60 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  <span>Awaiting Administrator Approval</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Faculty Registration Under Review</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-2xl">
                  Your faculty registration has been submitted and is currently in the <strong>CSE Department Faculty Verification Queue</strong>. Once an administrator verifies and approves your account from the Admin Panel, your teaching workload, lecture attendance controls, and course material dispatcher will be fully unlocked.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadProfile(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 dark:shadow-none transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Checking..." : "Check Approval Status"}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Faculty Account Approved & Verified by Department Admin</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-lg">
            Active Faculty Member
          </span>
        </div>
      )}

      {/* ── Faculty Profile & Information Center ─────────────────── */}
      <div id="profile-settings" className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Faculty Academic Identity Management</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              <span>Faculty Profile & Information Center</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Update your academic credentials, office hours, contact numbers, and profile photo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-200/50 dark:shadow-sky-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Update Profile Data</span>
              </button>
            ) : (
              <button
                onClick={handleCancelEdit}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          /* Profile Edit Form */
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Profile Picture Studio */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-sky-50/80 via-indigo-50/50 to-slate-50/80 dark:from-sky-950/40 dark:via-indigo-950/30 dark:to-slate-900/50 border border-sky-100/80 dark:border-white/10 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Photo Preview Container */}
                <div className="relative group shrink-0">
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center text-sky-600 dark:text-sky-400 font-extrabold text-3xl border-2 border-sky-200 dark:border-sky-800 shadow-md overflow-hidden ring-4 ring-sky-500/10">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="h-full w-full object-cover" />
                    ) : profile?.image ? (
                      <img src={profile.image} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span>{formData.name?.charAt(0) || activeName.charAt(0) || "T"}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Choose Picture from Device"
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white shadow-md border-2 border-white dark:border-slate-900 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-sky-500" />
                      <span>Official Faculty Picture</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">JPEG, PNG, WEBP up to 10MB</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                    Upload your high-resolution portrait photograph. The image will be displayed on student schedules, routine cards, and department rosters.
                  </p>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {/* Action Buttons for Picture */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Device Photo</span>
                    </button>

                    {(formData.image || profile?.image) && (
                      <button
                        type="button"
                        onClick={() => handleQuickSavePhoto()}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isUploadingPhoto ? "Saving..." : "Save Picture Now"}</span>
                      </button>
                    )}

                    {(formData.image || profile?.image) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        disabled={isUploadingPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Picture</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>{showUrlInput ? "Hide URL input" : "Or use web URL"}</span>
                    </button>
                  </div>

                  {/* Optional Image URL Input */}
                  {showUrlInput && (
                    <div className="pt-2 flex items-center gap-2 max-w-md animate-in fade-in duration-200">
                      <input
                        type="url"
                        placeholder="https://example.com/my-photo.jpg"
                        value={formData.image}
                        onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                        className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickSavePhoto()}
                        disabled={!formData.image || isUploadingPhoto}
                        className="h-9 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Dr. John Smith"
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Teacher ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Faculty / Teacher ID
                </label>
                <input
                  type="text"
                  name="teacherId"
                  value={formData.teacherId}
                  onChange={handleInputChange}
                  placeholder="e.g. T-101"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Academic Designation
                </label>
                <select
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                >
                  {DESIGNATIONS.map((des) => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              </div>

              {/* Specialization */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Specialization & Domain
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  placeholder="e.g. Artificial Intelligence & Distributed Systems"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Office Room */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Office / Cabin Room
                </label>
                <input
                  type="text"
                  name="officeRoom"
                  value={formData.officeRoom}
                  onChange={handleInputChange}
                  placeholder="e.g. Room 402, Academic Bldg 2"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+880 1711-000000"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Highest Degree */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Highest Degree / Qualifications
                </label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleInputChange}
                  placeholder="e.g. Ph.D. in Computer Science (BUET)"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Joining Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Department Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Campus / Residential Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Teachers Quarters, PUST Campus, Pabna"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Bio & Research Statement */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Academic Biography & Research Summary
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Brief overview of teaching philosophy, active research domains, publications, and laboratory groups..."
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                />
              </div>

              {/* Academic & Social Profiles */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Google Scholar / Research URL
                </label>
                <input
                  type="url"
                  name="googleScholar"
                  value={formData.googleScholar}
                  onChange={handleInputChange}
                  placeholder="https://scholar.google.com/citations?..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  GitHub Profile URL
                </label>
                <input
                  type="url"
                  name="github"
                  value={formData.github}
                  onChange={handleInputChange}
                  placeholder="https://github.com/..."
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Form Footer Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-200/50 dark:shadow-none transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving Changes..." : "Save Profile Changes"}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Static Display Mode with Details Cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Academic Credentials */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <GraduationCap className="w-4 h-4 text-sky-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Academic Details</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Designation</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{activeDesignation}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Department ID</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{activeTeacherId}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Specialization</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{activeSpecialization}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Education / Degree</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{profile?.education || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Joining Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{profile?.joiningDate || "Not recorded"}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Contact & Office */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <MapPin className="w-4 h-4 text-sky-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Office & Contact</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Office / Cabin</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{activeOffice}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Official Email</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">{user?.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Phone Number</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{activePhone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Residential Location</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{profile?.address || "PUST Campus"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Blood Group</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{profile?.bloodGroup || "Not specified"}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Research & Social Profiles */}
            <div className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <BookOpen className="w-4 h-4 text-sky-500" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bio & Web Profiles</h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                "{profile?.bio || "No academic bio provided yet. Click 'Update Profile Data' to add your research summary, active labs, and teaching philosophy."}"
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {profile?.googleScholar && (
                  <a
                    href={profile.googleScholar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold hover:underline"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Google Scholar</span>
                  </a>
                )}
                {profile?.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:underline"
                  >
                    <FaLinkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile?.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:underline"
                  >
                    <FaGithub className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </a>
                )}
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Routine & Class Schedule */}
      <div id="routine" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-500" />
              <span>Teaching Timetable & Routine Studio</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Routine & Class Schedule</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Live departmental schedules synchronized directly with administrator routine planning</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 rounded-xl ring-1 ring-sky-200 dark:ring-sky-800">
              {routineViewMode === "my" ? `${teacherSchedule.length} Assigned Lectures` : `${allRoutines.length} Active Classes`}
            </span>
            <button
              onClick={() => loadProfile(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Refresh Schedule"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scheduleLoading ? "animate-spin text-sky-500" : ""}`} />
              <span>Sync Routine</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs: My Assigned Lectures vs Full Department Routine Grid */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRoutineViewMode("my")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                routineViewMode === "my"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Presentation className="w-4 h-4" />
              <span>My Assigned Lectures</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                routineViewMode === "my" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {teacherSchedule.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoutineViewMode("full")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                routineViewMode === "full"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Full Department Routine</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                routineViewMode === "full" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {allRoutines.length}
              </span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {routineViewMode === "my"
              ? `${filteredSchedule.length} lecture${filteredSchedule.length === 1 ? "" : "s"} visible on current filter`
              : `Master Routine (${allRoutines.length} classes across active semesters)`}
          </span>
        </div>

        {/* View 1: My Assigned Lectures */}
        {routineViewMode === "my" && (
          <div className="space-y-4">
            {/* Day Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {ROUTINE_DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedDay === day
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-200 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* Schedule Cards Grid */}
            {scheduleLoading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
              </div>
            ) : filteredSchedule.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {selectedDay === "All Days" ? "No Classes Assigned Yet" : `No Classes Scheduled on ${selectedDay}`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Your faculty account is active. Once the department administrator schedules your course assignments in the Class Routine Studio, your routine slots and student cohorts will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {filteredSchedule.map((cls, idx) => (
                  <div key={cls.id || idx} className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-500/50 transition-all space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">{cls.code}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">{cls.day}</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{cls.title}</h3>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Time Slot:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cls.time}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Classroom / Lab:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cls.room}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Target Cohort:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{cls.semester}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleStartAttendance(cls)}
                      disabled={isPending}
                      className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl font-bold text-xs transition-colors ${
                        isPending
                          ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none"
                          : "bg-sky-600 hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white shadow-md shadow-sky-200/60 dark:shadow-none cursor-pointer"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isPending ? "Awaiting Approval" : "Start Attendance Session"}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* View 2: Full Department Routine Grid */}
        {routineViewMode === "full" && (
          <div className="space-y-4">
            {/* Semester Filter Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
                Semester View:
              </span>
              <button
                type="button"
                onClick={() => setSelectedFullSemester("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedFullSemester === "all"
                    ? "bg-sky-600 text-white shadow-sm shadow-sky-300 dark:shadow-none"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <span>Full Department Routine (All Semesters)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedFullSemester === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                }`}>
                  {allRoutines.length}
                </span>
              </button>

              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                const count = allRoutines.filter((r) => Number(r.semester) === sem).length;
                const isSelected = selectedFullSemester === String(sem);
                const year = Math.ceil(sem / 2);
                const term = ((sem - 1) % 2) + 1;
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedFullSemester(String(sem))}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-sky-600 text-white shadow-sm shadow-sky-300 dark:shadow-none"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>Semester {sem} ({year}-{term})</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Timetable Grid */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs">
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md">
                      <th className="w-24 border-r border-slate-200 dark:border-white/10 py-4 px-3 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        Day
                      </th>
                      {ROUTINE_TIME_SLOTS.map((slot) => {
                        const isBreak = slot === "01:00 - 02:00";
                        return (
                          <th
                            key={slot}
                            className={`${isBreak ? "w-16 px-1" : "min-w-[175px] px-3"} border-r border-slate-200 dark:border-white/10 py-3.5 text-center font-bold whitespace-nowrap last:border-0`}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Clock className={`w-3.5 h-3.5 ${isBreak ? "text-amber-500/50" : "text-sky-500"}`} />
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
                    {ROUTINE_DAYS.filter(d => d !== "All Days").map((day) => (
                      <tr
                        key={day}
                        className="group transition-colors hover:bg-sky-50/20 dark:hover:bg-sky-950/20"
                      >
                        <td className="w-24 border-r border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 p-4 text-center align-middle font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
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

                          const cells = getFullRoutineCells(day, slot);
                          return (
                            <td
                              key={slot}
                              className="border-r border-slate-200 dark:border-white/10 p-2.5 align-middle"
                            >
                              {cells && cells.length > 0 ? (
                                <div className="space-y-2">
                                  {cells.map((cell, cIdx) => {
                                    const isMyClass = 
                                      (cell.teacherName && activeName && (
                                        cell.teacherName.toLowerCase() === activeName.toLowerCase() ||
                                        activeName.toLowerCase().includes(cell.teacherName.toLowerCase()) ||
                                        cell.teacherName.toLowerCase().includes(activeName.toLowerCase())
                                      )) ||
                                      (cell.teacherId && activeTeacherId && cell.teacherId === activeTeacherId);
                                    
                                    return (
                                      <div
                                        key={cell._id || cIdx}
                                        className={`p-3 rounded-xl border shadow-xs transition-all flex flex-col justify-between min-h-[105px] ${
                                          isMyClass
                                            ? "bg-sky-50/90 dark:bg-sky-950/80 border-sky-400 dark:border-sky-500 ring-2 ring-sky-300 dark:ring-sky-700/50"
                                            : "bg-white dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                                        }`}
                                      >
                                        <div>
                                          <div className="flex items-center justify-between gap-1 flex-wrap">
                                            <span className="font-mono font-black text-[11px] text-sky-600 dark:text-sky-400 bg-sky-100/70 dark:bg-sky-950/80 px-2 py-0.5 rounded-md">
                                              {cell.courseCode}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                              Sem {cell.semester}
                                            </span>
                                            {isMyClass && (
                                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-sky-600 text-white shadow-xs">
                                                ★ My Class
                                              </span>
                                            )}
                                          </div>
                                          <p className="mt-1.5 font-bold text-slate-800 dark:text-slate-100 text-xs leading-snug line-clamp-2">
                                            {cell.courseTitle}
                                          </p>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1">
                                          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                            <span className="font-medium truncate max-w-[110px]" title={cell.teacherName}>
                                              {cell.teacherName || "Unassigned"}
                                            </span>
                                            <span className="inline-flex items-center gap-0.5 font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                              <MapPin className="w-2.5 h-2.5 text-sky-500" />
                                              <span>{cell.room || "Room"}</span>
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center p-3 text-slate-300 dark:text-slate-600 select-none">
                                  <span className="text-[10px] font-medium tracking-wide">Free Slot</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Faculty Workload & Engagement Studio */}
      <div id="analytics" className="scroll-mt-6">
        <TeacherAnalyticsCharts teacherSchedule={teacherSchedule} />
      </div>

      {/* ── Faculty Assignments & Coursework Manager ────────────── */}
      <TeacherAssignmentsSection
        teacher={profile || user}
        courses={teacherSchedule}
      />

      {/* Materials & Assignment Center */}
      <div id="materials" className="grid grid-cols-1 lg:grid-cols-2 gap-8 scroll-mt-6">
        <div className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Published Study Materials</span>
            </h3>
            <button 
              onClick={() => {
                if (isPending) {
                  toast.error("Upload locked until administrator verifies your faculty account.");
                  return;
                }
                setShowUploadModal(true);
              }}
              disabled={isPending}
              className={`text-xs font-bold inline-flex items-center gap-1 ${
                isPending
                  ? "text-slate-400 dark:text-slate-500 cursor-not-allowed"
                  : "text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Material</span>
            </button>
          </div>

          <div className="space-y-3">
            {materials.map((mat, idx) => (
              <div key={mat._id || mat.id || `mat-${idx}`} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{mat.title}</div>
                  <div className="text-slate-400 dark:text-slate-400">{mat.course} • {mat.type}</div>
                </div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">
                  {mat.date || (mat.createdAt ? new Date(mat.createdAt).toLocaleDateString() : "Recent")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance History */}
        <div id="attendance" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4 transition-colors scroll-mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Attendance History</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleLoadRosterReport(selectedRosterCourse)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student Roster</span>
              </button>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md">
                Live Session Tracker
              </span>
            </div>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              No live attendance sessions taken yet today. Click "Start Attendance Session" on any scheduled class slot above to initialize roll-call.
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceLogs.map((att, idx) => (
                <div key={att._id || att.id || `att-${idx}`} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-200/40 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">{att.course} Attendance</div>
                    <div className="text-slate-400 dark:text-slate-400">{att.date} • {att.present} Present, {att.absent} Absent</div>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{att.percentage}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Official Notice Board */}
      <NoticeBoardSection
        title="Notice Board"
        subtitle="Department broadcast & official faculty circulars."
      />

      {/* Upload Material Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Publish Study Material</h3>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Material Title</label>
                <input 
                  type="text"
                  placeholder="e.g. Chapter 3 - CPU Scheduling & Multithreading"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Course Code</label>
                <input 
                  type="text"
                  placeholder="e.g. CSE 3101"
                  value={materialForm.course}
                  onChange={(e) => setMaterialForm({ ...materialForm, course: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Material Format</label>
                <select
                  value={materialForm.type}
                  onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Lecture Slides (PDF)">Lecture Slides (PDF)</option>
                  <option value="Reference Notes (PDF)">Reference Notes (PDF)</option>
                  <option value="Lab Manual & Exercises">Lab Manual & Exercises</option>
                  <option value="Problem Set & Code Solution">Problem Set & Code Solution</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Attach File</span>
                  <span className="text-[10px] text-slate-400">PDF, PPTX, DOCX, ZIP</span>
                </label>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingMaterial}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  {uploadingMaterial ? "Uploading..." : "Publish Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── COURSE ATTENDANCE ROSTER MODAL ────────────────────── */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Course Attendance Roster & Student Log
                  </h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Roll-Call Verification • Cumulative Attendance Percentages
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Course Selector Bar */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Course:
                </label>
                <select
                  value={selectedRosterCourse}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedRosterCourse(val);
                    handleLoadRosterReport(val);
                  }}
                  className="h-9 px-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">All Scheduled Courses</option>
                  {Array.from(new Set(teacherSchedule.map((s) => s.code))).map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>

              {rosterData && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Total Classes Conducted: <strong className="text-slate-900 dark:text-white">{rosterData.totalSessions}</strong></span>
                  <span>•</span>
                  <span>Students Enrolled: <strong className="text-slate-900 dark:text-white">{rosterData.studentCount}</strong></span>
                </div>
              )}
            </div>

            {/* Roster Table */}
            {rosterLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Generating course attendance roster...
              </div>
            ) : !rosterData || rosterData.roster.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No student records or class sessions found for this course.</p>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">Student ID</th>
                      <th className="p-3.5">Full Name</th>
                      <th className="p-3.5">Batch / Sem</th>
                      <th className="p-3.5 text-center">Classes Attended</th>
                      <th className="p-3.5 text-center">Attendance Rate</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {rosterData.roster.map((stu) => (
                      <tr key={stu.id || stu.studentId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {stu.studentId}
                        </td>
                        <td className="p-3.5 font-bold text-slate-800 dark:text-white">
                          {stu.name}
                          <span className="block text-[10px] text-slate-400 font-normal">{stu.email}</span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          Batch {stu.batch || "N/A"} • Sem {stu.semester || "N/A"}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-700 dark:text-slate-300">
                          {stu.attendedCount} / {rosterData.totalSessions}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="font-extrabold text-sm font-mono text-slate-900 dark:text-white">
                            {stu.percentage}%
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              stu.isAtRisk
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {stu.isAtRisk ? "Low Attendance" : "Good Standing"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
