"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import { authClient, safeSignOut } from "@/lib/auth-client";
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
  Coffee,
  ChevronRight,
  ChevronLeft,
  Search,
  ArrowRight,
  Bell,
  BarChart3,
  LayoutDashboard,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import toast from "react-hot-toast";
import Loading from "@/components/common/Loading";
import { TeacherAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";
import CourseNoticeModal from "@/components/notice/CourseNoticeModal";
import { apiFetch } from "@/lib/api";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

const ROUTINE_DAYS = ["All Days", "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
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

// 6 Dedicated Pages for the Teacher Dashboard (Matching Student Panel Architecture)
export const TEACHER_DASHBOARD_PAGES = [
  {
    pageNum: 1,
    id: "profile",
    title: "Faculty Overview & Hub",
    shortLabel: "Overview",
    description: "Academic profile, quick workload summary, and active course portals",
    badge: "Faculty Hub",
    icon: LayoutDashboard,
  },
  {
    pageNum: 2,
    id: "profile-settings",
    title: "Profile & Research Portfolio",
    shortLabel: "Bio & Settings",
    description: "Personal contact details, designation, publications & research interests",
    badge: "Profile",
    icon: User,
  },
  {
    pageNum: 3,
    id: "assigned-courses",
    title: "Assigned Course Workspaces",
    shortLabel: "Courses",
    description: "Active teaching courses, live geofenced attendance & workspaces",
    badge: "Courses",
    icon: BookOpen,
  },
  {
    pageNum: 4,
    id: "routine",
    title: "Academic Routine & Schedule",
    shortLabel: "Routine",
    description: "Weekly lecture timetable, classroom allocation & full routine matrix",
    badge: "Schedule",
    icon: Clock,
  },
  {
    pageNum: 5,
    id: "analytics",
    title: "Workload & Teaching Analytics",
    shortLabel: "Analytics",
    description: "Weekly lecture hours, course distribution & attendance metrics",
    badge: "Analytics",
    icon: BarChart3,
  },
  {
    pageNum: 6,
    id: "notices",
    title: "Department Notice Board",
    shortLabel: "Notices",
    description: "Official circulars, student announcements & notice publishing",
    badge: "Notices",
    icon: Bell,
  },
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

  // Pagination Active Page State
  const [currentPage, setCurrentPage] = useState("profile");

  // Course Notice Modal State
  const [isCourseNoticeModalOpen, setIsCourseNoticeModalOpen] = useState(false);
  const [editingCourseNotice, setEditingCourseNotice] = useState(null);
  const [defaultNoticeCourse, setDefaultNoticeCourse] = useState("");

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

  // Live Attendance Session Management
  const [activeAttendanceSessions, setActiveAttendanceSessions] = useState({});
  const [startingAttendanceCode, setStartingAttendanceCode] = useState(null);

  const formatTimer = (totalSec) => {
    if (!totalSec || totalSec <= 0) return "00:00";
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const loadActiveAttendance = async () => {
    try {
      const res = await apiFetch("/api/attendance/teacher/active-sessions");
      if (res.ok && Array.isArray(res.data?.sessions)) {
        const map = {};
        res.data.sessions.forEach((s) => {
          if (s.isOpen && s.secondsLeft > 0 && s.courseCode) {
            map[s.courseCode.toUpperCase()] = {
              routineId: s.routineId,
              secondsLeft: s.secondsLeft,
              isOpen: true,
              startedAt: s.startedAt,
            };
          }
        });
        setActiveAttendanceSessions(map);
      }
    } catch (err) {
      console.error("Error loading active teacher attendance sessions:", err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAttendanceSessions((prev) => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          const curr = updated[key];
          if (curr && curr.secondsLeft > 0) {
            const nextSec = curr.secondsLeft - 1;
            if (nextSec <= 0) {
              delete updated[key];
              changed = true;
            } else {
              updated[key] = { ...curr, secondsLeft: nextSec };
              changed = true;
            }
          } else {
            delete updated[key];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Pagination and Hash Navigation Synchronization ──
  const goToPage = useCallback((pageId) => {
    if (TEACHER_DASHBOARD_PAGES.some((p) => p.id === pageId)) {
      setCurrentPage(pageId);
      if (typeof window !== "undefined") {
        const newUrl = pageId === "profile" 
          ? window.location.pathname 
          : `${window.location.pathname}#${pageId}`;
        window.history.pushState(null, "", newUrl);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const rawHash = window.location.hash.replace("#", "");
      if (rawHash && TEACHER_DASHBOARD_PAGES.some((p) => p.id === rawHash)) {
        setCurrentPage(rawHash);
      }
    }

    const handleHash = () => {
      const rawHash = window.location.hash.replace("#", "");
      if (rawHash && TEACHER_DASHBOARD_PAGES.some((p) => p.id === rawHash)) {
        setCurrentPage(rawHash);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    const handleChangePage = (e) => {
      const targetId = e?.detail?.sectionId;
      if (targetId && TEACHER_DASHBOARD_PAGES.some((p) => p.id === targetId)) {
        setCurrentPage(targetId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("hashchange", handleHash);
    window.addEventListener("popstate", handleHash);
    window.addEventListener("dashboard-change-page", handleChangePage);

    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("popstate", handleHash);
      window.removeEventListener("dashboard-change-page", handleChangePage);
    };
  }, []);

  // Notify left sidebar whenever currentPage changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dashboard-sync-sidebar", {
          detail: { sectionId: currentPage },
        })
      );
    }
  }, [currentPage]);

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
        fetch(`${SERVER_URL}/api/routines`),
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
      loadActiveAttendance();
    } else if (!sessionLoading) {
      setIsLoading(false);
    }
  }, [user?.email, sessionLoading]);

  const handleSignOut = async () => {
    await safeSignOut("/login");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profile-photo-updated", {
          detail: {
            image: data.teacher.image || "",
            name: data.teacher.name || profile?.name,
            user: data.teacher,
          }
        }));
      }
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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profile-photo-updated", {
          detail: {
            image: "",
            name: profile?.name || user?.name,
            user: profile,
          }
        }));
      }
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profile-photo-updated", {
          detail: {
            image: data.teacher.image || "",
            name: data.teacher.name || profile?.name,
            user: data.teacher,
          }
        }));
      }

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

  // Routine Timing Helpers
  const parseSlotMinutes = (slotStr) => {
    if (!slotStr || typeof slotStr !== "string") return null;
    const m = slotStr.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-\u2013\u2014]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i);
    if (!m) return null;
    const toMin = (hStr, mStr, meridiem) => {
      let h = parseInt(hStr, 10);
      const min = parseInt(mStr || "0", 10);
      if (min > 59 || h > 23) return null;
      if (meridiem) {
        if (h < 1 || h > 12) return null;
        h = h % 12;
        if (meridiem.toLowerCase() === "pm") h += 12;
      } else if (h >= 1 && h <= 7) {
        h += 12;
      }
      return h * 60 + min;
    };
    const startMin = toMin(m[1], m[2], m[3]);
    const endMin = toMin(m[4], m[5], m[6]);
    if (startMin === null || endMin === null || endMin <= startMin) return null;
    const pad = (h, mm) => `${String(h).padStart(2, "0")}:${String(mm || "00").padStart(2, "0")}`;
    return {
      startMin,
      endMin,
      startLabel: pad(m[1], m[2]),
      endLabel: pad(m[4], m[5]),
    };
  };

  const getCurrentDayAndMinutes = () => {
    const now = new Date();
    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = weekdayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    return { currentDay, currentMinutes };
  };

  const getSlotRoutineTiming = (day, timeSlot) => {
    const { currentDay, currentMinutes } = getCurrentDayAndMinutes();
    const slot = parseSlotMinutes(timeSlot);
    if (!slot) {
      return { canTake: false, status: "invalid", label: "Invalid Slot", reason: "Invalid time format" };
    }

    const isToday = (day || "").toLowerCase() === currentDay.toLowerCase();
    if (!isToday) {
      return {
        canTake: false,
        status: "wrong_day",
        label: `Scheduled: ${day}`,
        reason: `Class is scheduled on ${day}. Today is ${currentDay}.`,
        slot,
      };
    }

    if (currentMinutes < slot.startMin - 5) {
      return {
        canTake: false,
        status: "upcoming",
        label: `Upcoming (${slot.startLabel})`,
        reason: `Class starts at ${slot.startLabel}. Attendance opens during class hours.`,
        slot,
      };
    }

    if (currentMinutes >= slot.endMin) {
      return {
        canTake: false,
        status: "ended",
        label: "Class Ended",
        reason: `Class ended at ${slot.endLabel}.`,
        slot,
      };
    }

    return {
      canTake: true,
      status: "in_session",
      label: "Take Attendance",
      reason: `Class is in session (${slot.startLabel} - ${slot.endLabel}). Click to launch 10-minute student check-in.`,
      slot,
    };
  };

  const getCourseRoutineTiming = (course) => {
    const { currentDay } = getCurrentDayAndMinutes();
    const slots = course.slots || [];
    const todaySlot = slots.find((s) => (s.day || "").toLowerCase() === currentDay.toLowerCase());

    if (!todaySlot) {
      const days = Array.from(new Set(slots.map((s) => s.day).filter(Boolean)));
      const dayLabel = days.length ? days.join(", ") : "Other Day";
      return {
        canTake: false,
        status: "no_class_today",
        label: "No Class Today",
        reason: `No lecture scheduled today (${currentDay}). Scheduled on: ${dayLabel}.`,
        targetSlot: slots[0] || course,
      };
    }

    const timing = getSlotRoutineTiming(todaySlot.day, todaySlot.time);
    return {
      ...timing,
      targetSlot: todaySlot,
    };
  };

  const handleStartAttendance = async (cls) => {
    if (isPending) {
      toast.error("Your faculty account is pending administrator approval.");
      return;
    }

    const code = cls.code || cls.courseCode;
    if (!code) {
      toast.error("Course code is missing.");
      return;
    }
    const key = code.toUpperCase();

    if (activeAttendanceSessions[key]?.isOpen && activeAttendanceSessions[key]?.secondsLeft > 0) {
      toast.success(
        `Attendance session for ${code} is already running (${formatTimer(activeAttendanceSessions[key].secondsLeft)} remaining).`,
        { icon: "⏱️" }
      );
      return;
    }

    const targetRoom = cls.room || (cls.rooms ? Array.from(cls.rooms)[0] : "Room 407");
    const targetTime = cls.time || (cls.slots && cls.slots[0]?.time) || "09:00 - 10:00";
    const targetDay = cls.day || (cls.slots && cls.slots[0]?.day) || "Saturday";
    const routineId = cls.id || cls.routineId || (cls.slots && cls.slots[0]?.id) || undefined;

    const timing = getSlotRoutineTiming(targetDay, targetTime);
    if (!timing.canTake) {
      toast.error(timing.reason || "Attendance can only be taken during scheduled routine class time.");
      return;
    }

    setStartingAttendanceCode(key);
    try {
      const res = await apiFetch("/api/attendance/session/start", {
        method: "POST",
        body: {
          routineId,
          courseCode: code,
          courseTitle: cls.title || cls.courseTitle,
          semester: cls.semesterNum || cls.semester,
          room: targetRoom,
          timeSlot: targetTime,
          day: targetDay,
        },
      });

      if (!res.ok) {
        throw new Error(res.data?.error || "Failed to start attendance session");
      }

      const secondsLeft = res.data?.secondsLeft || 600;
      setActiveAttendanceSessions({
        [key]: {
          routineId: res.data?.session?.routineId || routineId,
          secondsLeft,
          isOpen: true,
          startedAt: res.data?.session?.startedAt || new Date().toISOString(),
        },
      });

      toast.success(
        `Live 10-minute attendance window launched for ${code}! Students have 10 minutes to submit attendance.`,
        { duration: 6000, icon: "⏱️" }
      );
    } catch (err) {
      console.error("Attendance session start error:", err);
      toast.error(err.message || "Failed to launch attendance session.");
    } finally {
      setStartingAttendanceCode(null);
    }
  };

  const isPending = (profile?.status || user?.status) === "pending";

  const assignedCourses = useMemo(() => {
    const map = new Map();
    (teacherSchedule || []).forEach((slot) => {
      if (!slot.code) return;
      const key = slot.code.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          id: slot.id,
          routineId: slot.id,
          code: slot.code,
          title: slot.title,
          semester: slot.semester,
          semesterNum: slot.semesterNum,
          enrolled: slot.enrolled || 45,
          slots: [],
          rooms: new Set(),
        });
      }
      const entry = map.get(key);
      entry.slots.push({
        id: slot.id,
        routineId: slot.id,
        code: slot.code,
        day: slot.day,
        time: slot.time,
        room: slot.room,
        semesterNum: slot.semesterNum,
      });
      if (slot.room) entry.rooms.add(slot.room);
    });
    return Array.from(map.values());
  }, [teacherSchedule]);

  const filteredSchedule = selectedDay === "All Days"
    ? teacherSchedule
    : teacherSchedule.filter(s => s.day === selectedDay);

  const { currentDay } = getCurrentDayAndMinutes();
  const todayClasses = useMemo(() => {
    return (teacherSchedule || []).filter(
      (s) => (s.day || "").toLowerCase() === currentDay.toLowerCase()
    );
  }, [teacherSchedule, currentDay]);

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
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <User className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Faculty Session Required</h2>
        <p className="text-xs text-slate-500 max-w-md leading-relaxed font-medium">
          Please sign in with your faculty email and password to access your teaching dashboard, schedule, and profile management.
        </p>
        <a href="/login" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95">
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

  const currentIdx = TEACHER_DASHBOARD_PAGES.findIndex((p) => p.id === currentPage);
  const activePageObj = TEACHER_DASHBOARD_PAGES[currentIdx >= 0 ? currentIdx : 0];
  const prevPageObj = currentIdx > 0 ? TEACHER_DASHBOARD_PAGES[currentIdx - 1] : null;
  const nextPageObj = currentIdx >= 0 && currentIdx < TEACHER_DASHBOARD_PAGES.length - 1 ? TEACHER_DASHBOARD_PAGES[currentIdx + 1] : null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      {/* ── Top Dashboard Pagination & Section Stepper Bar (Parity with Student Panel) ── */}
      <div className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 transition-colors">
        {/* Top Header Row: Active Section Title, Page Count, and Navigation Steppers */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
              {activePageObj && React.createElement(activePageObj.icon, { className: "w-5 h-5" })}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Page {activePageObj?.pageNum || 1} of {TEACHER_DASHBOARD_PAGES.length}
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">•</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {activePageObj?.badge}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {activePageObj?.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                {activePageObj?.description}
              </p>
            </div>
          </div>

          {/* Previous / Next Quick Stepper Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={() => prevPageObj && goToPage(prevPageObj.id)}
              disabled={!prevPageObj}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                prevPageObj
                  ? "bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200/80 dark:border-white/10 shadow-xs cursor-pointer active:scale-95"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-white/5 cursor-not-allowed opacity-60"
              }`}
              title={prevPageObj ? `Go to Page ${prevPageObj.pageNum}: ${prevPageObj.title}` : "First Page"}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Previous</span>
            </button>

            <button
              type="button"
              onClick={() => nextPageObj && goToPage(nextPageObj.id)}
              disabled={!nextPageObj}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                nextPageObj
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600 shadow-xs shadow-indigo-600/20 cursor-pointer active:scale-95"
                  : "bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-white/5 cursor-not-allowed opacity-60"
              }`}
              title={nextPageObj ? `Go to Page ${nextPageObj.pageNum}: ${nextPageObj.title}` : "Last Page"}
            >
              <span className="hidden xs:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6 Section Step Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          {TEACHER_DASHBOARD_PAGES.map((page) => {
            const isCurrent = page.id === currentPage;
            const Icon = page.icon;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => goToPage(page.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                  isCurrent
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 scale-[1.02]"
                    : "bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200/70 dark:border-white/5"
                }`}
                title={`Page ${page.pageNum}: ${page.title}`}
              >
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-lg text-[10px] font-black ${
                  isCurrent 
                    ? "bg-white/20 text-white" 
                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                }`}>
                  {page.pageNum}
                </span>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`} />
                <span>{page.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Page 1: Faculty Overview & Academic Hub ── */}
      {currentPage === "profile" && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
          {/* Faculty Profile Hero Card (Remastered for Light & Dark Theme Excellence) */}
          <div id="profile" className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-white shadow-sm relative overflow-hidden scroll-mt-6 border border-slate-200/90 dark:border-white/10 transition-colors">
            {/* Subtle brand decorative background glows */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/[0.05] dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-500/[0.04] dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="h-20 w-20 sm:h-22 sm:w-22 rounded-3xl bg-indigo-50/80 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-extrabold text-3xl border border-indigo-200/80 dark:border-white/20 shadow-xs overflow-hidden ring-2 ring-indigo-500/10 dark:ring-white/10">
                    {displayImage ? (
                      <img src={displayImage} alt={activeName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{activeName ? activeName.charAt(0).toUpperCase() : "T"}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      goToPage("profile-settings");
                      setIsEditing(true);
                      setTimeout(() => {
                        fileInputRef.current?.click();
                      }, 120);
                    }}
                    title="Change Faculty Picture"
                    className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer group-hover:scale-110"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-200 backdrop-blur-md mb-1 border border-indigo-200/80 dark:border-indigo-400/20 shadow-xs">
                    <Presentation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{activeDesignation}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    {activeName}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-indigo-200/80 font-medium flex items-center gap-2 flex-wrap">
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
                <div className="flex flex-col gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50/90 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex-1">
                  <span className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{activePhone}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="truncate">Office: {activeOffice}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourseNotice(null);
                      setDefaultNoticeCourse("");
                      setIsCourseNoticeModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex-1"
                    title="Publish Course Notice for Enrolled Students"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Give Course Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      goToPage("profile-settings");
                      setIsEditing(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 font-bold text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs flex-1"
                  >
                    <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Edit Profile Data</span>
                  </button>
                </div>
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
                      Your faculty registration has been submitted and is currently in the <strong>CSE Department Approval Queue</strong>. Once verified, full classroom attendance launch, grading, routine studio, and student notices will be unlocked.
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
                    <span>{isRefreshing ? "Checking..." : "Check Status"}</span>
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
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Faculty Account Approved & Verified by Department Admin
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-lg">
                Active Faculty Member
              </span>
            </div>
          )}

          {/* Quick Metrics & Workload Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => goToPage("assigned-courses")}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500/60 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned Courses</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {assignedCourses.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Active Portals</span>
              </div>
            </div>

            <div 
              onClick={() => goToPage("routine")}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/60 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Weekly Lectures</span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {teacherSchedule.length}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Class Slots</span>
              </div>
            </div>

            <div 
              onClick={() => goToPage("assigned-courses")}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500/60 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Live Attendance</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {Object.keys(activeAttendanceSessions).length}
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  {Object.keys(activeAttendanceSessions).length > 0 ? "Running 10m" : "Standby"}
                </span>
              </div>
            </div>

            <div 
              onClick={() => goToPage("notices")}
              className="p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs hover:border-purple-400 dark:hover:border-purple-500/60 transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Circulars & Notices</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  Board
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Broadcasts</span>
              </div>
            </div>
          </div>

          {/* Today's Routine Schedule Preview */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Today's Lecture Agenda • {currentDay}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Today's Scheduled Classes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => goToPage("routine")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>View Full Weekly Routine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayClasses.map((cls, idx) => {
                  const timing = getSlotRoutineTiming(cls.day, cls.time);
                  const isLive = activeAttendanceSessions[cls.code.toUpperCase()]?.isOpen;
                  return (
                    <div 
                      key={cls.id || idx}
                      className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {cls.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {cls.semester}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {cls.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cls.time} • Room {cls.room}
                        </p>
                      </div>
                      <div className="pt-1 flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${
                          isLive 
                            ? "text-emerald-600 dark:text-emerald-400 animate-pulse" 
                            : timing.canTake 
                            ? "text-indigo-600 dark:text-indigo-400" 
                            : "text-slate-400"
                        }`}>
                          {isLive ? `Live: ${formatTimer(activeAttendanceSessions[cls.code.toUpperCase()].secondsLeft)}` : timing.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartAttendance(cls)}
                          disabled={isLive || !timing.canTake || startingAttendanceCode === cls.code.toUpperCase()}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isLive 
                              ? "bg-emerald-600 text-white cursor-default" 
                              : timing.canTake 
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs active:scale-95" 
                              : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                          }`}
                        >
                          {isLive ? "Active" : "Start Attendance"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
                <Coffee className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No lectures scheduled for today ({currentDay}).
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enjoy your academic research, curriculum preparation & student consultation hours.
                </p>
              </div>
            )}
          </div>

          {/* Quick Assigned Courses Portals */}
          <div className="p-6 sm:p-7 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Course Portals ({assignedCourses.length} Assigned)</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Active Course Workspaces
                </h3>
              </div>
              <button
                type="button"
                onClick={() => goToPage("assigned-courses")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <span>View All Course Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedCourses.map((c) => (
                <Link
                  key={c.code}
                  href={`/dashboard/teacher/courses/${encodeURIComponent(c.code)}`}
                  className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-white/5 hover:border-indigo-300 dark:hover:border-indigo-800/80 transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {c.semester}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {c.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.slots?.length || 1} weekly lecture slot{c.slots?.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 mt-3 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    <span>Enter Workspace</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page 2: Faculty Profile & Settings Editor ── */}
      {currentPage === "profile-settings" && (
        <div id="profile-settings" className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Faculty Academic Identity Management</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Faculty Profile & Research Portfolio</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Update your academic credentials, office hours, contact numbers, and profile photo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Update Profile Data</span>
                </button>
              ) : (
                <button
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold transition-all cursor-pointer active:scale-95"
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
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="relative group shrink-0">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-extrabold text-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-md overflow-hidden ring-4 ring-indigo-500/10">
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
                      className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md border-2 border-white dark:border-slate-900 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-500" />
                        <span>Official Faculty Picture</span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">JPEG, PNG, WEBP up to 10MB</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                      Upload your portrait photograph. The image is displayed on student schedules, routine cards, and department rosters.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Device Photo</span>
                      </button>

                      {(formData.image || profile?.image) && (
                        <button
                          type="button"
                          onClick={() => handleQuickSavePhoto()}
                          disabled={isUploadingPhoto}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Picture</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Link2 className="w-3 h-3" />
                        <span>{showUrlInput ? "Hide URL input" : "Or use web URL"}</span>
                      </button>
                    </div>

                    {showUrlInput && (
                      <div className="pt-2 flex items-center gap-2 max-w-md animate-in fade-in duration-200">
                        <input
                          type="url"
                          placeholder="https://example.com/my-photo.jpg"
                          value={formData.image}
                          onChange={(e) => setFormData((prev) => ({ ...prev, image: e.target.value }))}
                          className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity & Department Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Prof. Dr. Firstname Lastname"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Teacher ID / Department Code
                  </label>
                  <input
                    type="text"
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={handleInputChange}
                    placeholder="T-1002"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Academic Designation
                  </label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    {DESIGNATIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Primary Specialization / Research Domain
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    placeholder="e.g. Distributed Systems, Artificial Intelligence"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Office / Faculty Chamber Room
                  </label>
                  <input
                    type="text"
                    name="officeRoom"
                    value={formData.officeRoom}
                    onChange={handleInputChange}
                    placeholder="e.g. Room 402, CSE Academic Building"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+8801700000000"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Joining Date
                  </label>
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Blood Group
                  </label>
                  <select
                    name="bloodGroup"
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio & Academic Background */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Short Biography & Research Overview
                  </label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Brief overview of teaching philosophy, academic achievements, and research interests..."
                    className="w-full p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Educational Qualifications
                  </label>
                  <textarea
                    name="education"
                    rows={2}
                    value={formData.education}
                    onChange={handleInputChange}
                    placeholder="e.g. Ph.D. in Computer Engineering (2018), M.Sc. in CSE (2014), B.Sc. in CSE (2011)"
                    className="w-full p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Research Interests & Publications
                  </label>
                  <textarea
                    name="researchInterests"
                    rows={2}
                    value={formData.researchInterests}
                    onChange={handleInputChange}
                    placeholder="e.g. Edge AI, Microservices Architecture, Cloud Computing, Neural Networks"
                    className="w-full p-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Social and Academic Links */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Academic & Professional Links
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FaGithub className="w-3.5 h-3.5" />
                      <span>GitHub Profile URL</span>
                    </label>
                    <input
                      type="url"
                      name="github"
                      value={formData.github}
                      onChange={handleInputChange}
                      placeholder="https://github.com/username"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <FaLinkedin className="w-3.5 h-3.5 text-blue-500" />
                      <span>LinkedIn Profile URL</span>
                    </label>
                    <input
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Google Scholar URL</span>
                    </label>
                    <input
                      type="url"
                      name="googleScholar"
                      value={formData.googleScholar}
                      onChange={handleInputChange}
                      placeholder="https://scholar.google.com/citations?user=..."
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Personal Portfolio / Lab Website</span>
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://faculty.dept.edu/~name"
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Saving..." : "Save Profile Changes"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* Read-Only Profile View & Public Portfolio Summary */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Designation</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{activeDesignation}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Specialization</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{activeSpecialization}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Office Location</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{activeOffice}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Phone</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{activePhone}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Joining Date</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.joiningDate || "Not recorded"}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blood Group</span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{profile?.bloodGroup || "Not specified"}</p>
                </div>
              </div>

              {profile?.bio && (
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Biography</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {profile?.education && (
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Education</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{profile.education}</p>
                </div>
              )}

              {profile?.researchInterests && (
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Research & Publications</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{profile.researchInterests}</p>
                </div>
              )}

              {/* Social links */}
              <div className="flex items-center gap-3 flex-wrap pt-2">
                {profile?.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-all border border-slate-200/80 dark:border-white/5"
                  >
                    <FaGithub className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                  </a>
                )}
                {profile?.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all border border-blue-200/60 dark:border-blue-900/60"
                  >
                    <FaLinkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {profile?.googleScholar && (
                  <a
                    href={profile.googleScholar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all border border-indigo-200/60 dark:border-indigo-900/60"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Google Scholar</span>
                  </a>
                )}
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all border border-emerald-200/60 dark:border-emerald-900/60"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Lab / Website</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Page 3: Assigned Course Workspaces ── */}
      {currentPage === "assigned-courses" && (
        <div id="assigned-courses" className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Dynamic Routine Modules • Assigned by Admin</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                My Assigned Courses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Courses dynamically assigned to you in the academic routine. Select any course to access its dedicated workspace for individual attendance tracking, lecture materials, and coursework assignments.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
                {assignedCourses.length} Assigned {assignedCourses.length === 1 ? "Course" : "Courses"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditingCourseNotice(null);
                  setDefaultNoticeCourse("");
                  setIsCourseNoticeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Broadcast notice to students of any course"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Give Course Notice</span>
              </button>
              <button
                onClick={() => loadProfile(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200/80 dark:border-white/5"
                title="Refresh Assigned Courses"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scheduleLoading ? "animate-spin text-indigo-500" : ""}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Courses Assigned in Routine
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When the department administrator assigns you to lecture courses in the Academic Routine Studio, your courses will dynamically appear here with individual workspaces.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedCourses.map((course) => {
                const courseTiming = getCourseRoutineTiming(course);
                const activeSession = activeAttendanceSessions[course.code.toUpperCase()];
                const isSessionActive = activeSession?.isOpen && activeSession?.secondsLeft > 0;
                const isStarting = startingAttendanceCode === course.code.toUpperCase();

                return (
                  <div
                    key={course.code}
                    className="p-6 rounded-[1.75rem] bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-3.5">
                      {/* Header Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-3 py-1.5 rounded-xl font-mono font-bold text-xs bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {course.code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {course.semester}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            {course.enrolled} Students
                          </span>
                        </div>
                      </div>

                      {/* Course Title & Room Details */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{course.rooms.size > 0 ? Array.from(course.rooms).join(", ") : "Assigned Room"}</span>
                        </p>
                      </div>

                      {/* Weekly Slots Pill List */}
                      {course.slots && course.slots.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Weekly Lecture Timetable
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {course.slots.map((s, idx) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-300"
                              >
                                <Clock className="w-3 h-3 text-indigo-500" />
                                <span>{s.day.slice(0, 3)}: {s.time}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Hub & Live Attendance Trigger */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                      {/* Live Attendance Launch Button */}
                      <button
                        type="button"
                        onClick={() => handleStartAttendance(courseTiming.targetSlot || course)}
                        disabled={isSessionActive || !courseTiming.canTake || isStarting}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSessionActive
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 cursor-default"
                            : courseTiming.canTake
                            ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-95"
                            : "bg-slate-200/80 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                        }`}
                        title={courseTiming.reason}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 shrink-0" />
                          <span>
                            {isSessionActive 
                              ? `Live Window: ${formatTimer(activeSession.secondsLeft)}` 
                              : isStarting 
                              ? "Starting Session..." 
                              : courseTiming.label}
                          </span>
                        </div>
                        {isSessionActive && (
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        {/* Course Notice Quick Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourseNotice(null);
                            setDefaultNoticeCourse(course.code);
                            setIsCourseNoticeModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
                          title="Broadcast course notice"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Notice</span>
                        </button>

                        {/* Enter Workspace Direct Link */}
                        <Link
                          href={`/dashboard/teacher/courses/${encodeURIComponent(course.code)}`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all border border-indigo-200/60 dark:border-indigo-800/60 group-hover:shadow-xs"
                        >
                          <span>Enter Workspace</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Page 4: Academic Routine & Class Schedule ── */}
      {currentPage === "routine" && (
        <div id="routine" className="p-7 sm:p-8 rounded-[2rem] bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                <Calendar className="w-3.5 h-3.5" />
                <span>Teaching Timetable & Routine Studio</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Academic Routine & Class Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live departmental schedules synchronized directly with administrator routine planning.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
                {routineViewMode === "my" ? `${teacherSchedule.length} Assigned Lectures` : `${allRoutines.length} Active Classes`}
              </span>
              <button
                onClick={() => loadProfile(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-200/80 dark:border-white/5"
                title="Refresh Schedule"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scheduleLoading ? "animate-spin text-indigo-500" : ""}`} />
                <span>Sync Routine</span>
              </button>
            </div>
          </div>

          {/* View Mode Toggle: My Assigned Lectures vs Full Department Routine Grid */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRoutineViewMode("my")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  routineViewMode === "my"
                    ? "bg-indigo-600 text-white shadow-xs"
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
                    ? "bg-indigo-600 text-white shadow-xs"
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
                ? `${filteredSchedule.length} lecture${filteredSchedule.length === 1 ? "" : "s"} on filter`
                : `Master Routine (${allRoutines.length} classes across semesters)`}
            </span>
          </div>

          {/* View 1: My Assigned Lectures */}
          {routineViewMode === "my" && (
            <div className="space-y-4">
              {/* Day Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {ROUTINE_DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedDay === day
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {filteredSchedule.length === 0 ? (
                <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <Coffee className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No scheduled lectures on {selectedDay}
                  </p>
                  <p className="text-[11px] text-slate-400">Select another day or view full department routine.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSchedule.map((slot) => {
                    const timing = getSlotRoutineTiming(slot.day, slot.time);
                    const isLive = activeAttendanceSessions[slot.code.toUpperCase()]?.isOpen;

                    return (
                      <div
                        key={slot.id}
                        className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-800/60 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {slot.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">{slot.day}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{slot.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{slot.time} • Room {slot.room}</p>
                        </div>
                        <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                          <span className={`text-[11px] font-bold ${
                            isLive 
                              ? "text-emerald-600 dark:text-emerald-400 animate-pulse" 
                              : timing.canTake 
                              ? "text-indigo-600 dark:text-indigo-400" 
                              : "text-slate-400"
                          }`}>
                            {isLive ? `Live: ${formatTimer(activeAttendanceSessions[slot.code.toUpperCase()].secondsLeft)}` : timing.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStartAttendance(slot)}
                            disabled={isLive || !timing.canTake || startingAttendanceCode === slot.code.toUpperCase()}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isLive
                                ? "bg-emerald-600 text-white"
                                : timing.canTake
                                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs active:scale-95"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed opacity-60"
                            }`}
                          >
                            {isLive ? "Active" : "Start"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* View 2: Full Department Routine Matrix */}
          {routineViewMode === "full" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {["all", "1", "2", "3", "4", "5", "6", "7", "8"].map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedFullSemester(sem)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedFullSemester === sem
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {sem === "all" ? "All Semesters" : `Semester ${sem}`}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3 w-28">Day</th>
                      {ROUTINE_TIME_SLOTS.map((slot) => (
                        <th key={slot} className="p-3 min-w-[130px] text-center font-mono">{slot}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                    {["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"].map((day) => (
                      <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-800 dark:text-white bg-slate-50/30 dark:bg-slate-800/20">{day}</td>
                        {ROUTINE_TIME_SLOTS.map((timeSlot) => {
                          const cells = getFullRoutineCells(day, timeSlot);
                          return (
                            <td key={timeSlot} className="p-2 align-top text-center">
                              {cells.length > 0 ? (
                                <div className="space-y-1">
                                  {cells.map((c, i) => (
                                    <div key={i} className="p-1.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-left">
                                      <span className="block font-bold text-indigo-700 dark:text-indigo-300 text-[11px] truncate">{c.courseCode}</span>
                                      <span className="block text-[10px] text-slate-500 truncate">Rm {c.room} • Sem {c.semester}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600 text-[10px]">-</span>
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
          )}
        </div>
      )}

      {/* ── Page 5: Workload & Teaching Analytics ── */}
      {currentPage === "analytics" && (
        <div id="analytics" className="scroll-mt-6 animate-in fade-in duration-300 space-y-6">
          <TeacherAnalyticsCharts 
            teacherSchedule={teacherSchedule} 
            isCollapsed={false}
            onToggle={() => {}}
          />
        </div>
      )}

      {/* ── Page 6: Department Notice Board ── */}
      {currentPage === "notices" && (
        <div id="notices" className="scroll-mt-6 animate-in fade-in duration-300 space-y-6">
          <NoticeBoardSection
            title="Notice Board"
            subtitle="Department broadcast & official faculty circulars."
            isCollapsed={false}
            onToggle={() => {}}
            userRole="teacher"
            teacherCourses={assignedCourses}
            teacherProfile={{
              name: activeName,
              email: user?.email,
              designation: activeDesignation,
            }}
            onOpenCourseNotice={() => {
              setEditingCourseNotice(null);
              setIsCourseNoticeModalOpen(true);
            }}
          />
        </div>
      )}

      {/* ── Bottom Dashboard Pagination Navigation (Parity with Student Panel) ── */}
      <div className="bg-white/95 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm transition-colors mt-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Previous Page Button with Label */}
          <div className="w-full md:w-auto">
            {prevPageObj ? (
              <button
                type="button"
                onClick={() => goToPage(prevPageObj.id)}
                className="w-full md:w-auto inline-flex items-center justify-center md:justify-start gap-2.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div className="text-left">
                  <span className="block text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                    Previous Section (Page {prevPageObj.pageNum})
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {prevPageObj.shortLabel}
                  </span>
                </div>
              </button>
            ) : (
              <div className="hidden md:block w-32" />
            )}
          </div>

          {/* Center Quick Jump Numbered Pills */}
          <div className="flex items-center gap-1.5">
            {TEACHER_DASHBOARD_PAGES.map((page) => {
              const isCurrent = page.id === currentPage;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => goToPage(page.id)}
                  className={`w-9 h-9 rounded-xl text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200/60 dark:border-white/5"
                  }`}
                  title={`Page ${page.pageNum}: ${page.title}`}
                >
                  {page.pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button with Label */}
          <div className="w-full md:w-auto">
            {nextPageObj ? (
              <button
                type="button"
                onClick={() => goToPage(nextPageObj.id)}
                className="w-full md:w-auto inline-flex items-center justify-center md:justify-end gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-semibold text-indigo-200">
                    Next Section (Page {nextPageObj.pageNum})
                  </span>
                  <span className="font-bold text-white">
                    {nextPageObj.shortLabel}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-white" />
              </button>
            ) : (
              <div className="hidden md:block w-32" />
            )}
          </div>
        </div>
      </div>

      {/* Course Notice Modal opened from Top Button or Course Card */}
      <CourseNoticeModal
        isOpen={isCourseNoticeModalOpen}
        onClose={() => {
          setIsCourseNoticeModalOpen(false);
          setEditingCourseNotice(null);
          setDefaultNoticeCourse("");
        }}
        onNoticeSaved={() => {
          window.dispatchEvent(new CustomEvent("refresh-notices"));
        }}
        teacherCourses={assignedCourses}
        currentTeacher={{
          name: activeName,
          email: user?.email,
          designation: activeDesignation,
        }}
        editingNotice={editingCourseNotice}
        defaultCourseCode={defaultNoticeCourse}
      />
    </div>
  );
}
