"use client";

import React, { useState, useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  Download, 
  Award, 
  Navigation,
  FileCheck,
  Edit3,
  Save,
  X,
  User,
  Hash,
  HeartPulse,
  ShieldCheck,
  Check,
  RotateCcw,
  Camera,
  Upload,
  Trash2,
  Link2,
  Image as ImageIcon,
  Search,
  Filter,
  Coffee,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Info,
  CheckCircle,
  Compass,
  Radio,
  Timer
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import toast from "react-hot-toast";
import { 
  getCoursesBySemester, 
  getSemesterTotalCredits, 
  SEMESTER_KEYS, 
  SEMESTER_LABELS 
} from "@/data/courses";
import Loading from "@/components/common/Loading";
import { StudentAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import { apiFetch } from "@/lib/api";
import FaceVerificationModal from "@/components/dashboard/FaceVerificationModal";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";

const ROUTINE_DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
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

// Strict Geofence Targets: University Campus & Personal/Authorized Coordinate
const CAMPUS_LOCATIONS = [
  { name: "University Campus (PUST CSE Building)", lat: 24.01296, lon: 89.280835, id: "univ", label: "University (PUST)" },
  { name: "Authorized Campus Location (Me)", lat: 24.841355, lon: 89.381426, id: "me", label: "Me (Personal)" },
];
const ALLOWED_RADIUS_METERS = 10; // Strict 10m radius
const ATTENDANCE_WINDOW_MINUTES = 10; // First 10 minutes of class start

// Helper to calculate distance in meters to nearest campus/authorized coordinates
const getGeofenceInfo = (userCoords) => {
  if (!userCoords?.latitude || !userCoords?.longitude) return null;
  const R = 6371e3;
  let minDistance = Infinity;
  let nearest = null;

  for (const loc of CAMPUS_LOCATIONS) {
    const φ1 = (userCoords.latitude * Math.PI) / 180;
    const φ2 = (loc.lat * Math.PI) / 180;
    const Δφ = ((loc.lat - userCoords.latitude) * Math.PI) / 180;
    const Δλ = ((loc.lon - userCoords.longitude) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  const roundedDistance = Math.round(minDistance * 10) / 10;
  return {
    distance: roundedDistance,
    inRange: roundedDistance <= ALLOWED_RADIUS_METERS,
    locationName: nearest?.label || nearest?.name || "Classroom",
  };
};

const getServerUrl = () => {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "127.0.0.1") {
      return "http://127.0.0.1:5000";
    }
  }
  return process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
};

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function StudentDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    studentId: "",
    batch: "",
    semester: "6",
    session: "",
    bloodGroup: "",
    address: "",
    bio: "",
    emergencyContact: "",
    guardianName: "",
    github: "",
    linkedin: "",
    image: "",
  });

  // Helper to extract numeric semester 1-8
  const parseSemesterNum = (semStr) => {
    if (!semStr) return 1;
    const match = String(semStr).match(/(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 8) return n;
    }
    return 1;
  };

  const syncFormData = (data) => {
    setFormData({
      name: data?.name || user?.name || "",
      phone: data?.phone || user?.phone || "",
      studentId: data?.studentId || user?.studentId || "",
      batch: data?.batch !== undefined && data?.batch !== null ? String(data.batch) : "",
      semester: data?.semester ? String(parseSemesterNum(data.semester)) : "1",
      session: data?.session || user?.session || "",
      bloodGroup: data?.bloodGroup || user?.bloodGroup || "",
      address: data?.address || user?.address || "",
      bio: data?.bio || "",
      emergencyContact: data?.emergencyContact || "",
      guardianName: data?.guardianName || "",
      github: data?.github || "",
      linkedin: data?.linkedin || "",
      image: data?.image || user?.image || "",
    });
  };

  // Enrolled semester automatically resolves from student registration data
  const studentEnrolledSem = parseSemesterNum(profile?.semester || user?.semester);
  const [courseFilter, setCourseFilter] = useState("all");
  const [courseSearch, setCourseSearch] = useState("");
  const [routines, setRoutines] = useState([]);
  const [routineTab, setRoutineTab] = useState("grid"); // "grid" | "courses"
  const [isRoutineLoading, setIsRoutineLoading] = useState(false);
  const [selectedRoutineSemester, setSelectedRoutineSemester] = useState("1");

  // ── Student Attendance States (department-management pattern) ──
  const [attendanceSessions, setAttendanceSessions] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [attendanceTargetDay, setAttendanceTargetDay] = useState("today");
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState("fetching"); // "fetching" | "ready" | "denied" | "unsupported"
  const [faceStatus, setFaceStatus] = useState({ enrolled: false, enrolledAt: null });
  const [faceModalConfig, setFaceModalConfig] = useState({
    isOpen: false,
    purpose: "verify", // "enroll" | "verify"
    routine: null,
  });

  const loadRoutines = async (showToast = false) => {
    const serverUrl = getServerUrl();
    setIsRoutineLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/routines`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.routines || []);
        setRoutines(list);
        if (showToast) {
          toast.success("Routine synchronized with latest departmental timetable!");
        }
      }
    } catch (e) {
      console.error("Error loading routine:", e);
      if (showToast) toast.error("Could not sync routine.");
    } finally {
      setIsRoutineLoading(false);
    }
  };

  const loadAttendanceData = async (showFeedback = false, overrideDay = null) => {
    if (showFeedback) setIsAttendanceLoading(true);
    const dayParam = overrideDay !== null ? overrideDay : attendanceTargetDay;
    const query = dayParam && dayParam !== "today" ? `?targetDay=${encodeURIComponent(dayParam)}` : "";

    try {
      const [sessionsRes, statsRes, histRes, faceRes] = await Promise.all([
        apiFetch(`/api/attendance/student/active-sessions${query}`),
        apiFetch("/api/attendance/student/stats"),
        apiFetch("/api/attendance/student/history"),
        apiFetch("/api/face/status"),
      ]);

      if (sessionsRes.ok && sessionsRes.data?.sessions) {
        setAttendanceSessions(sessionsRes.data.sessions);
        if (sessionsRes.data.face) {
          setFaceStatus(sessionsRes.data.face);
        }
      }

      if (statsRes.ok && statsRes.data?.stats) {
        setAttendanceStats(statsRes.data.stats);
        if (statsRes.data.overallPercentage !== undefined) {
          setAttendanceSummary({
            overallPercentage: statsRes.data.overallPercentage,
            totalAttended: statsRes.data.totalAttended,
            totalTarget: statsRes.data.totalTarget,
          });
        }
      }

      if (histRes.ok && histRes.data?.history) {
        setAttendanceHistory(histRes.data.history);
      }

      if (faceRes.ok && faceRes.data) {
        setFaceStatus({
          enrolled: Boolean(faceRes.data.enrolled),
          enrolledAt: faceRes.data.enrolledAt || null,
        });
      }

      if (showFeedback) {
        toast.success("Attendance records synchronized!");
      }
    } catch (err) {
      console.error("Error loading attendance data:", err);
      if (showFeedback) toast.error("Could not sync attendance data.");
    } finally {
      setIsAttendanceLoading(false);
    }
  };

  useEffect(() => {
    loadRoutines();
    if (user?.email) {
      loadAttendanceData(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (studentEnrolledSem) {
      setSelectedRoutineSemester(String(studentEnrolledSem));
    }
  }, [studentEnrolledSem]);

  const getStudentRoutineCells = (day, timeSlot) => {
    return routines.filter((r) => {
      const isSlot = r.timeSlot === timeSlot ||
        r.timeSlot?.replace(/^0/, "") === timeSlot?.replace(/^0/, "");
      if (selectedRoutineSemester !== "all") {
        return r.day === day && isSlot && Number(r.semester) === Number(selectedRoutineSemester);
      }
      return r.day === day && isSlot;
    });
  };

  const loadProfile = async (showToast = false) => {
    if (!user?.email) return;
    if (showToast) setIsRefreshing(true);
    const serverUrl = getServerUrl();
    try {
      const res = await fetch(`${serverUrl}/api/students/email/${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        syncFormData(data);

        // If student is not yet approved by admin, route to dedicated status page
        if (data.status === "pending") {
          window.location.href = "/pending";
          return;
        }
        if (data.status === "rejected") {
          window.location.href = "/rejected";
          return;
        }

        if (showToast) {
          toast.success("Student profile synced!");
        }
      }
    } catch (e) {
      console.error("Error loading profile:", e);
      if (showToast) toast.error("Unable to check status. Please check your connection.");
    } finally {
      if (showToast) setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.email]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  // Dedicated instant save for profile picture
  const handleQuickSavePhoto = async (newImageUrl) => {
    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) {
      toast.error("User session not found.");
      return;
    }

    setIsUploadingPhoto(true);
    const serverUrl = getServerUrl();
    const photoToSave = newImageUrl !== undefined ? newImageUrl : formData.image;

    try {
      let res;
      try {
        res = await fetch(`${serverUrl}/api/students/profile/${encodeURIComponent(targetEmail)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photoToSave }),
        });
      } catch (err) {
        res = await fetch(`${serverUrl}/api/students/profile/${encodeURIComponent(targetEmail)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photoToSave }),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile picture");
      }

      setProfile(data.student);
      setFormData((prev) => ({ ...prev, image: data.student.image || "" }));
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
      toast.error("Full Name is required.");
      return;
    }

    setIsSaving(true);
    const serverUrl = getServerUrl();
    try {
      let res;
      try {
        res = await fetch(`${serverUrl}/api/students/profile/${encodeURIComponent(targetEmail)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } catch (fetchErr) {
        console.warn("PUT failed, attempting PATCH fallback:", fetchErr);
        res = await fetch(`${serverUrl}/api/students/profile/${encodeURIComponent(targetEmail)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update student profile");
      }

      setProfile(data.student);
      syncFormData(data.student);

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Profile update error:", err);
      const isNetworkError = err?.name === "TypeError" && String(err?.message || "").toLowerCase().includes("fetch");
      toast.error(
        isNetworkError 
          ? "Cannot connect to server. Please ensure the backend server on port 5000 is running." 
          : (err.message || "Failed to save profile changes")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    syncFormData(profile);
    setIsEditing(false);
  };

  const isPending = (profile?.status || user?.status) === "pending";

  const enrolledSemester = studentEnrolledSem;
  const semesterCourses = getCoursesBySemester(enrolledSemester);
  const semesterCredits = getSemesterTotalCredits(enrolledSemester);

  const filteredCourses = semesterCourses.filter((course) => {
    const isLab = course.type === "Sessional" || course.type === "Laboratory" || course.title?.toLowerCase().includes("sessional") || course.title?.toLowerCase().includes("lab");
    if (courseFilter === "theory" && isLab) return false;
    if (courseFilter === "lab" && !isLab) return false;
    if (courseSearch.trim()) {
      const q = courseSearch.toLowerCase();
      const codeMatch = (course.code || "").toLowerCase().includes(q);
      const titleMatch = (course.title || "").toLowerCase().includes(q);
      return codeMatch || titleMatch;
    }
    return true;
  });

  const theoryCount = semesterCourses.filter((c) => !(c.type === "Sessional" || c.type === "Laboratory" || c.title?.toLowerCase().includes("sessional") || c.title?.toLowerCase().includes("lab"))).length;
  const labCount = semesterCourses.length - theoryCount;

  // Geolocation handling (department-management pattern)
  const getPosition = (showToast = false) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeoStatus("unsupported");
      if (showToast) toast.error("Geolocation is not supported by your browser.");
      return;
    }
    setGeoStatus("fetching");
    if (showToast) toast("Requesting location access...", { icon: "📍" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGeoStatus("ready");
        if (showToast) toast.success("Location enabled — Ready to mark attendance");
      },
      (err) => {
        console.warn("Location error:", err);
        setGeoStatus("denied");
        if (showToast) toast.error("Location permission denied. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  useEffect(() => {
    getPosition(false);
  }, []);

  const handleOpenFaceEnrollment = () => {
    if (isPending) {
      toast.error("Account approval required before enrolling face biometrics.");
      return;
    }
    setFaceModalConfig({
      isOpen: true,
      purpose: "enroll",
      routine: null,
    });
  };

  const handleOpenFaceCheckIn = (session) => {
    if (isPending) {
      toast.error("Attendance is locked until administrator approves your student account.");
      return;
    }

    if (session.attendanceId) {
      toast.success("Attendance already recorded for this class session.");
      return;
    }

    if (!session.isMarkable) {
      toast.error("Attendance window is closed for this class (strictly available within first 10 minutes of class start).");
      return;
    }

    if (!faceStatus.enrolled) {
      toast.error("Please enroll your face first to enable anti-cheat attendance check-in.", { icon: "👤" });
      setFaceModalConfig({ isOpen: true, purpose: "enroll", routine: null });
      return;
    }

    if (!coords) {
      toast.error("Please enable location access to verify you are inside the classroom.");
      getPosition(true);
      return;
    }

    const geofence = getGeofenceInfo(coords);
    if (geofence && !geofence.inRange) {
      toast.error(
        `Location Verification: You are ${geofence.distance}m away from ${geofence.locationName}. Attendance strictly requires being within 10 meters of the classroom.`,
        { duration: 6000, icon: "📍" }
      );
      return;
    }

    // Open Face Verification Modal for this active class
    setFaceModalConfig({
      isOpen: true,
      purpose: "verify",
      routine: {
        routineId: session.routineId,
        courseCode: session.courseCode,
        courseTitle: session.courseTitle || session.courseName,
        timeSlot: session.timeSlot,
      },
    });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  if (isLoading && !profile) {
    return (
      <Loading 
        text="Loading Student Workspace..." 
        subtext="Retrieving semester curriculum, attendance & department status" 
        fullScreen 
      />
    );
  }

  const activeName = profile?.name || user?.name || "Student Portal";
  const activeRoll = profile?.studentId || user?.studentId || "220101";
  const activeBatch = profile?.batch || user?.batch || "10";
  const activeSemester = profile?.semester || user?.semester || "6";
  const activeSession = profile?.session || user?.session || "2021-2022";
  const activePhone = profile?.phone || user?.phone || "+8801700000000";
  const activeAddress = profile?.address || user?.address || "Pabna, Bangladesh";
  const activeBlood = profile?.bloodGroup || user?.bloodGroup || "Not specified";

  const displayImage = formData.image || profile?.image || user?.image || null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Student Profile Hero Card */}
      <div id="profile" className="p-7 sm:p-8 rounded-[2rem] bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl relative overflow-hidden scroll-mt-6 border border-white/10">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <div className="h-20 w-20 sm:h-22 sm:w-22 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 font-extrabold text-3xl border border-white/20 shadow-inner overflow-hidden ring-2 ring-white/10">
                {displayImage ? (
                  <img src={displayImage} alt={activeName} className="h-full w-full object-cover" />
                ) : (
                  activeName ? activeName.charAt(0).toUpperCase() : "S"
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
                title="Change Profile Picture"
                className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border border-white/30 transition-transform active:scale-95 cursor-pointer group-hover:scale-110"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200 backdrop-blur-md mb-1 border border-indigo-400/20">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Undergraduate CSE Student</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {activeName}
              </h1>
              <p className="text-xs text-indigo-200/80 font-medium flex items-center gap-2 flex-wrap">
                <span>Roll: {activeRoll}</span>
                <span>•</span>
                <span>Batch {activeBatch}</span>
                <span>•</span>
                <span>Semester {activeSemester}</span>
                <span>•</span>
                <span>Session {activeSession}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-2 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm flex-1">
              <span className="flex items-center gap-2 truncate">
                <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{user?.email}</span>
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{activePhone}</span>
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{activeAddress}</span>
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
              <Edit3 className="w-4 h-4 text-indigo-300" />
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registration Under Review</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-2xl">
                  Your registration has been submitted and is currently in the <strong>CSE Department Approval Queue</strong>. Once an administrator verifies and approves your account from the Admin Panel, your full academic profile, course routine, marks, and attendance portals will be unlocked automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadProfile(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-200 dark:shadow-none transition-colors cursor-pointer"
              >
                <Clock className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Checking..." : "Check Approval Status"}</span>
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Account Approved & Verified by Department Admin</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-lg">
            Active Student
          </span>
        </div>
      )}

      {/* Profile Update Section */}
      <div id="profile-settings" className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Academic Identity Management</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Student Profile & Information Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Keep your contact details, academic roll, semester, and personal information up to date.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200/50 dark:shadow-indigo-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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
            {/* Profile Picture & Avatar Studio */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-slate-50/80 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/50 border border-indigo-100/80 dark:border-white/10 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Photo Preview Container */}
                <div className="relative group shrink-0">
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-md overflow-hidden ring-4 ring-indigo-500/10">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="h-full w-full object-cover" />
                    ) : profile?.image ? (
                      <img src={profile.image} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span>{formData.name?.charAt(0) || activeName.charAt(0) || "S"}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Choose Picture from Device"
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-2 border-white dark:border-slate-900 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Photo Actions & Description */}
                <div className="flex-1 space-y-3 text-center sm:text-left w-full">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                        PNG, JPG, WEBP (Auto-optimized)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Select a clear photo from your device or paste an image link. It will update your Student Portal, Attendance card, and Navbar.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 dark:shadow-none transition-all cursor-pointer hover:scale-102 active:scale-98"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose From Device</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{showUrlInput ? "Hide Link Input" : "Image URL"}</span>
                    </button>

                    {(formData.image || profile?.image) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Photo</span>
                      </button>
                    )}

                    {formData.image && formData.image !== (profile?.image || "") && (
                      <button
                        type="button"
                        disabled={isUploadingPhoto}
                        onClick={() => handleQuickSavePhoto(formData.image)}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 dark:shadow-none transition-all cursor-pointer"
                      >
                        {isUploadingPhoto ? (
                          <>
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Photo Only</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  {/* Optional Image URL Input */}
                  {showUrlInput && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <input
                          type="url"
                          placeholder="Paste image URL (e.g. https://... or GitHub avatar)"
                          value={formData.image}
                          onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Rotno Das"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Student Roll / ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-500" />
                  Student Roll / ID *
                </label>
                <input
                  type="text"
                  name="studentId"
                  value={formData.studentId}
                  onChange={handleInputChange}
                  placeholder="e.g. 220106"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Contact Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 01700000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Current Semester Dropdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  Current Semester *
                </label>
                <select
                  name="semester"
                  value={formData.semester}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  {SEMESTER_KEYS.map((sem) => (
                    <option key={sem} value={String(sem)}>
                      Semester {sem} ({SEMESTER_LABELS[sem]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Batch Number
                </label>
                <input
                  type="text"
                  name="batch"
                  value={formData.batch}
                  onChange={handleInputChange}
                  placeholder="e.g. 14"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Academic Session */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  Academic Session
                </label>
                <input
                  type="text"
                  name="session"
                  value={formData.session}
                  onChange={handleInputChange}
                  placeholder="e.g. 2021-2022"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Blood Group */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                  Blood Group
                </label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Address */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  Present Address / District
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g. Bogura / Pabna, Bangladesh"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Guardian Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  Guardian / Parent Name
                </label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleInputChange}
                  placeholder="e.g. Md. Das"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Emergency Contact */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-500" />
                  Emergency Contact Number
                </label>
                <input
                  type="text"
                  name="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                  placeholder="e.g. 01800000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Institutional Email (Read-Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  Institutional Email (Locked)
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || ""}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FaGithub className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  GitHub Profile URL
                </label>
                <input
                  type="text"
                  name="github"
                  value={formData.github}
                  onChange={handleInputChange}
                  placeholder="https://github.com/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FaLinkedin className="w-3.5 h-3.5 text-blue-500" />
                  LinkedIn Profile URL
                </label>
                <input
                  type="text"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all"
                />
              </div>

              {/* Bio / Academic Focus */}
              <div className="space-y-1.5 md:col-span-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                  Academic Bio / Research Interests
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Brief summary of your academic interests, competitive programming, project domains, or aspirations..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-900 dark:text-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-200/50 dark:shadow-indigo-950/40 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Profile Details Card (View Mode) */
          <div className="space-y-6">
            {/* Top Identity & Photo Bar */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/70 dark:border-white/5">
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-2xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden shrink-0">
                {displayImage ? (
                  <img src={displayImage} alt={activeName} className="h-full w-full object-cover" />
                ) : (
                  activeName ? activeName.charAt(0).toUpperCase() : "S"
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{activeName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                    {displayImage ? "Custom Picture Active" : "Default Initial Avatar"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  Roll: <strong>{activeRoll}</strong> • Semester {activeSemester} • Batch {activeBatch}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 60);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Change Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Student Roll</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {activeRoll}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current Semester</span>
                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                  Semester {activeSemester}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Academic Batch</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                  Batch {activeBatch}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                  {activeSession}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Blood Group</span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
                  {activeBlood}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
                  {activePhone}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Campus / Home Address</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block truncate">
                  {activeAddress}
                </span>
              </div>
            </div>

            {/* Extra profile details (Bio, Guardian, Links) */}
            {(profile?.bio || profile?.guardianName || profile?.emergencyContact || profile?.github || profile?.linkedin) && (
              <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 space-y-4">
                {profile?.bio && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Academic Bio & Focus
                    </span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-200/50 dark:border-white/5 text-xs">
                  {profile?.guardianName && (
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      <strong>Guardian:</strong> {profile.guardianName}
                    </span>
                  )}
                  {profile?.emergencyContact && (
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      <strong>Emergency Contact:</strong> {profile.emergencyContact}
                    </span>
                  )}
                  {profile?.github && (
                    <a
                      href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <FaGithub className="w-3.5 h-3.5" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {profile?.linkedin && (
                    <a
                      href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <FaLinkedin className="w-3.5 h-3.5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Academic Performance & Routine Workload Visualizations */}
      <div id="analytics" className="scroll-mt-6">
        <StudentAnalyticsCharts 
          enrolledSemester={enrolledSemester} 
          routineCount={routines.length} 
          semesterCredits={semesterCredits} 
          attendanceStats={attendanceStats}
          attendanceSummary={attendanceSummary}
        />
      </div>

      {/* Attendance & Class Presence Tracking */}
      <div id="attendance" className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-7 transition-colors scroll-mt-6">
        {/* Section Top Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Smart Geofence Attendance</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <CheckCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Class Attendance & Presence Tracking
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Automated location verification for daily routine classes (09:00 AM – 05:00 PM) • 10-Minute check-in window • Strict 10m campus radius.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>First 10 Mins Window</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800">
              <Target className="w-3.5 h-3.5 text-sky-500" />
              <span>10m Radius</span>
            </span>
            <button
              onClick={() => loadAttendanceData(true)}
              disabled={isAttendanceLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Sync attendance records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAttendanceLoading ? "animate-spin text-indigo-500" : ""}`} />
              <span>Sync Records</span>
            </button>
          </div>
        </div>

        {/* Live Geolocation Status Card */}
        <div className="relative overflow-hidden rounded-2xl border transition-all">
          {geoStatus === "unsupported" ? (
            <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-xs font-bold">Geolocation Not Supported</p>
                <p className="text-[11px] text-rose-600 dark:text-rose-400">Your browser does not support HTML5 geolocation API.</p>
              </div>
            </div>
          ) : geoStatus === "denied" ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0 text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">Location Permission Blocked</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">Please enable browser location access to verify your 10-meter campus presence.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => getPosition(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer self-start sm:self-center"
              >
                Enable Location Access
              </button>
            </div>
          ) : geoStatus === "fetching" ? (
            <div className="flex items-center justify-between p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-800 dark:text-sky-300 rounded-2xl">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-sky-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold">Acquiring Hardware GPS Satellite Location...</p>
                  <p className="text-[11px] text-sky-600 dark:text-sky-400">Establishing high-accuracy coordinate fix</p>
                </div>
              </div>
            </div>
          ) : (
            (() => {
              const geofence = getGeofenceInfo(coords);
              const inRange = geofence?.inRange;

              return (
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                  inRange
                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`relative flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${
                      inRange
                        ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600"
                        : "bg-amber-100 dark:bg-amber-900/50 text-amber-600"
                    }`}>
                      {inRange ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                        </>
                      ) : (
                        <MapPin className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-xs font-bold ${inRange ? "text-emerald-800 dark:text-emerald-200" : "text-amber-800 dark:text-amber-200"}`}>
                          {inRange ? "Hardware Location Verified & Within Range" : "Location Active — Outside 10m Geofence"}
                        </p>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                          inRange
                            ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                        }`}>
                          {geofence ? `${geofence.distance}m from ${geofence.locationName}` : "Measuring distance..."}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${inRange ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                        {inRange
                          ? "You are within the 10-meter classroom geofence. Ready to submit attendance."
                          : `You are currently ${geofence?.distance}m away. Attendance strictly requires being within 10 meters of the classroom.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                    <button
                      type="button"
                      onClick={() => getPosition(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold ring-1 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        inRange
                          ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800 hover:bg-emerald-600 hover:text-white"
                          : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-800 hover:bg-amber-600 hover:text-white"
                      }`}
                      title="Refresh hardware GPS position"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sync GPS</span>
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {/* Biometric Face Status Banner */}
        {!faceStatus.enrolled ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200 dark:border-indigo-800/60 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md shadow-indigo-600/30">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Biometric Enrollment Required
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    Action Needed
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Enroll your face once with anti-spoof liveness to enable instant, anti-cheat attendance check-in for all your scheduled classes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenFaceEnrollment}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap self-start sm:self-center"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Enroll Face Now</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">Face Biometrics Active & Enrolled</span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                (Anti-cheat liveness enabled)
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenFaceEnrollment}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-center cursor-pointer"
            >
              Update / Re-enroll Face
            </button>
          </div>
        )}

        {/* Schedule Day Selector Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
              Schedule Day:
            </span>
            <button
              type="button"
              onClick={() => {
                setAttendanceTargetDay("today");
                loadAttendanceData(false, "today");
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                attendanceTargetDay === "today"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>Today's Classes</span>
            </button>
            {ROUTINE_DAYS.map((d) => {
              const isSelected = attendanceTargetDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setAttendanceTargetDay(d);
                    loadAttendanceData(false, d);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {attendanceSessions.length} {attendanceSessions.length === 1 ? "Class" : "Classes"} Scheduled
          </span>
        </div>

        {/* Main 2-Column Section: Active & Upcoming Classes (Left 2 Cols) + Course Statistics (Right 1 Col) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
          {/* Left Column: Scheduled Classes */}
          <div className="space-y-4 lg:col-span-2">
            {attendanceSessions.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mx-auto text-indigo-500">
                  <Clock className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Classes Scheduled
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  According to your registered semester timetable, there are no scheduled classes for this day.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {attendanceSessions.map((session, index) => {
                  const isAttended = Boolean(session.attendanceId);
                  const isMarkable = session.isMarkable;
                  const isActive = session.isActive;
                  const isPast = session.isPast;

                  return (
                    <div
                      key={session.sessionId || index}
                      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 ${
                        isAttended
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-400"
                          : isActive && isMarkable
                            ? "bg-white dark:bg-slate-800/90 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                            : "bg-white dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isAttended
                                ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                                : isActive && isMarkable
                                  ? "bg-indigo-600 text-white shadow-md animate-pulse"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isAttended ? (
                              <CheckCircle className="w-6 h-6" />
                            ) : (
                              <Clock className="w-6 h-6" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                                {session.courseCode}
                              </span>

                              {isAttended && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                  <Check className="w-3 h-3" />
                                  <span>Present</span>
                                </span>
                              )}

                              {!isAttended && isActive && isMarkable && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white animate-pulse">
                                  <Zap className="w-3 h-3" />
                                  <span>Check-in Open</span>
                                </span>
                              )}

                              {!isAttended && isActive && !isMarkable && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                  <Clock className="w-3 h-3" />
                                  <span>Window Closed (&gt;10m)</span>
                                </span>
                              )}

                              {!isAttended && isPast && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                  <span>Missed</span>
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">
                              {session.courseTitle || session.courseName}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Faculty: {session.teacherName || "Department Faculty"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end gap-2 shrink-0">
                          <span className="font-mono font-bold text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 self-start sm:self-end">
                            {session.timeSlot || `${session.startTime} — ${session.endTime}`}
                          </span>

                          {!isAttended && (
                            <div className="flex items-center gap-2">
                              {isMarkable ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenFaceCheckIn(session)}
                                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>Mark Present</span>
                                </button>
                              ) : isActive ? (
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                  Window Closed (&gt;10m)
                                </span>
                              ) : isPast ? (
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                  Missed
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  Upcoming (Opens at {session.startTime || "start"})
                                </span>
                              )}
                            </div>
                          )}

                          {isAttended && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Recorded Present</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Meta Bar */}
                      <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-700/40 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{session.room || "Room 401"} ({session.location || "PUST Campus"})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-sky-500" />
                          <span>Radius: 10m Geofence</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Window: First 10 Mins</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Statistics Sidebar */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Attendance Statistics
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Semester Course Records
                  </p>
                </div>
              </div>

              {attendanceStats.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No historical records logged yet.
                </div>
              ) : (
                <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1 scrollbar-thin">
                  {attendanceStats.map((stat) => {
                    const pct = stat.percentage || 0;
                    const isGood = pct >= 75;
                    const isWarning = pct >= 60 && pct < 75;

                    return (
                      <div
                        key={stat.courseCode}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {stat.courseTitle || stat.courseName}
                            </p>
                            <span className="font-mono text-[10px] font-bold text-slate-400">
                              {stat.courseCode}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                              isGood
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                                : isWarning
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isGood
                                ? "bg-emerald-500"
                                : isWarning
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>
                            {stat.attendedSessions} / {stat.totalSessions} Sessions
                          </span>
                          <span className={isGood ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                            {isGood ? "Good Standing" : "Short Attendance"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/40 text-[10px]">
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-1.5 text-center">
                            <span className="text-slate-400 block font-semibold">Present</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                              {stat.presentCount || stat.attendedSessions || 0}
                            </span>
                          </div>
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-700/40 p-1.5 text-center">
                            <span className="text-slate-400 block font-semibold">Late</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">
                              {stat.lateCount || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Routine & Semester Courses (Enrolled Registered Semester) */}
      <div id="routine" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Registered Curriculum & Routine</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Semester {enrolledSemester} Courses & Academic Routine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Syllabus courses, credit weights, and weekly lecture routine for your registered term (Semester {enrolledSemester} • {SEMESTER_LABELS[enrolledSemester] || "Current Semester"}).
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enrolled Term: Semester {enrolledSemester}</span>
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl ring-1 ring-indigo-200 dark:ring-indigo-800">
              {semesterCredits.toFixed(1)} Total Credits
            </span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              {semesterCourses.length} Enrolled Courses
            </span>
            <button
              onClick={() => loadRoutines(true)}
              disabled={isRoutineLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Refresh routine schedule"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRoutineLoading ? "animate-spin text-indigo-500" : ""}`} />
              <span>Sync Routine</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs: Weekly Routine Grid vs Curriculum Courses */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold">
            <button
              type="button"
              onClick={() => setRoutineTab("grid")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                routineTab === "grid"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly Routine Grid</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                routineTab === "grid" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {routines.length} Classes
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRoutineTab("courses")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                routineTab === "courses"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Curriculum Courses Matrix</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                routineTab === "courses" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {semesterCourses.length}
              </span>
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {routineTab === "grid" ? "Saturday to Wednesday Academic Routine" : "Syllabus courses & credit distribution"}
          </span>
        </div>

        {/* Semester Filter Selector Tabs */}
        {routineTab === "grid" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 whitespace-nowrap">
              Schedule View:
            </span>
            <button
              type="button"
              onClick={() => setSelectedRoutineSemester("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedRoutineSemester === "all"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>Full Master Routine (All Semesters)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedRoutineSemester === "all" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}>
                {routines.length}
              </span>
            </button>

            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
              const semCount = routines.filter((r) => Number(r.semester) === sem).length;
              const isSelected = selectedRoutineSemester === String(sem);
              const year = Math.ceil(sem / 2);
              const term = ((sem - 1) % 2) + 1;
              const isMyTerm = enrolledSemester && Number(enrolledSemester) === sem;
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedRoutineSemester(String(sem))}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-300 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Semester {sem} ({year}-{term}){isMyTerm ? " ★ My Term" : ""}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                  }`}>
                    {semCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Content View 1: Weekly Routine Timetable Grid ── */}
        {routineTab === "grid" && (
          <div className="space-y-4">
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
                            className={`${isBreak ? "w-16 px-1" : "min-w-[170px] px-3"} border-r border-slate-200 dark:border-white/10 py-3.5 text-center font-bold whitespace-nowrap last:border-0`}
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
                    {ROUTINE_DAYS.map((day) => (
                      <tr
                        key={day}
                        className="group transition-colors hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20"
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

                          const cells = getStudentRoutineCells(day, slot);
                          return (
                            <td
                              key={slot}
                              className="border-r border-slate-200 dark:border-white/10 p-2.5 align-middle"
                            >
                              {cells && cells.length > 0 ? (
                                <div className="space-y-2">
                                  {cells.map((cell, cIdx) => (
                                    <div key={cell._id || cIdx} className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all flex flex-col justify-between min-h-[95px]">
                                      <div>
                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                          <span className="font-mono font-black text-[11px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                                            {cell.courseCode}
                                          </span>
                                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                            Sem {cell.semester}
                                          </span>
                                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                                            <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                            <span>{cell.room || "Room"}</span>
                                          </span>
                                        </div>
                                        {cell.courseTitle && (
                                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mt-1.5">
                                            {cell.courseTitle}
                                          </p>
                                        )}
                                      </div>
                                      <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate flex items-center justify-between">
                                        <span>{cell.teacherName || "Faculty Instructor"}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-full min-h-[95px] rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600 text-sm font-light">
                                  -
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

        {/* ── Content View 2: Curriculum Syllabus Courses ── */}
        {routineTab === "courses" && (
          <div className="space-y-5">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              {/* Category Filter Pills */}
              <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCourseFilter("all")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All Courses ({semesterCourses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("theory")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "theory"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Theory ({theoryCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("lab")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "lab"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Lab / Sessional ({labCount})
                </button>
              </div>

              {/* Quick Course Search */}
              <div className="relative max-w-xs sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search course code or title..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {courseSearch && (
                  <button
                    type="button"
                    onClick={() => setCourseSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Course Cards Grid */}
            {filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredCourses.map((c, i) => {
                  const isLab = c.type === "Sessional" || c.type === "Laboratory" || c.title?.toLowerCase().includes("sessional") || c.title?.toLowerCase().includes("lab");

                  return (
                    <div
                      key={c.code || i}
                      className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {c.code}
                          </span>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                            {c.credits} Credits
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                          {c.title}
                        </h3>
                        <div className="inline-block">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isLab 
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50"
                              : "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
                          }`}>
                            {c.type || (isLab ? "Sessional / Practical" : "Theory")}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{isLab ? "Software / Hardware Lab" : `Room ${400 + enrolledSemester}`}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                          Department Faculty Instructor
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No courses match your filter</h4>
                <p className="text-xs text-slate-400">Try clearing the search query or selecting &quot;All Courses&quot;.</p>
                <button
                  type="button"
                  onClick={() => { setCourseFilter("all"); setCourseSearch(""); }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Notice Board */}
      <NoticeBoardSection
        title="Notice Board"
        subtitle="Department broadcast & official academic circulars."
      />

      {/* Live Face Verification & Enrollment Modal */}
      <FaceVerificationModal
        isOpen={faceModalConfig.isOpen}
        onClose={() => setFaceModalConfig(prev => ({ ...prev, isOpen: false }))}
        purpose={faceModalConfig.purpose}
        routine={faceModalConfig.routine}
        coords={coords}
        onSuccess={async () => {
          await loadAttendanceData(false);
        }}
      />
    </div>
  );
}
