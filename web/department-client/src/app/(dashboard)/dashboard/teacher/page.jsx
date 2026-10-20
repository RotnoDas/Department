"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Search,
  ArrowRight,
  Bell,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import toast from "react-hot-toast";
import Loading from "@/components/common/Loading";
import { TeacherAnalyticsCharts } from "@/components/dashboard/DashboardCharts";
import NoticeBoardSection from "@/components/notice/NoticeBoardSection";
import CourseNoticeModal from "@/components/notice/CourseNoticeModal";
import { 
  SectionCollapseToggle, 
  CollapsibleBody, 
  DashboardCollapseControls 
} from "@/components/dashboard/CollapsibleSection";
import { apiFetch } from "@/lib/api";

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

  // Planned Classes Target State
  const [coursePlannedMap, setCoursePlannedMap] = useState({});
  const [editingTargetCourse, setEditingTargetCourse] = useState(null);
  const [targetClassesInput, setTargetClassesInput] = useState(36);
  const [isSavingDashboardTarget, setIsSavingDashboardTarget] = useState(false);

  // Course Notice Modal State (Teacher top button & notice management)
  const [isCourseNoticeModalOpen, setIsCourseNoticeModalOpen] = useState(false);
  const [editingCourseNotice, setEditingCourseNotice] = useState(null);

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

  // Collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState({
    profile: false,
    courses: false,
    routine: false,
    analytics: false,
    notices: false,
  });

  const toggleSection = (key) => setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));
  const collapseAllSections = () => setCollapsedSections({ profile: true, courses: true, routine: true, analytics: true, notices: true });
  const expandAllSections = () => setCollapsedSections({ profile: false, courses: false, routine: false, analytics: false, notices: false });
  const allCollapsed = Object.values(collapsedSections).every(Boolean);

  useEffect(() => {
    const handleHash = (customId) => {
      const hash = (typeof customId === "string" ? customId : window.location.hash).replace("#", "");
      if (!hash) return;
      if (hash === "profile-settings" || hash === "profile") setCollapsedSections((p) => ({ ...p, profile: false }));
      if (hash === "assigned-courses" || hash === "courses") setCollapsedSections((p) => ({ ...p, courses: false }));
      if (hash === "routine") setCollapsedSections((p) => ({ ...p, routine: false }));
      if (hash === "analytics") setCollapsedSections((p) => ({ ...p, analytics: false }));
      if (hash === "notices") setCollapsedSections((p) => ({ ...p, notices: false }));

      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 60);
    };

    const handleCustomExpand = (e) => {
      if (e.detail?.id) {
        handleHash(e.detail.id);
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener("dashboard-expand-section", handleCustomExpand);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener("dashboard-expand-section", handleCustomExpand);
    };
  }, []);

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

      const [myRes, allRes, coursesRes] = await Promise.all([
        fetch(`${SERVER_URL}/api/teacher/routine?${params.toString()}`),
        fetch(`${SERVER_URL}/api/routines`),
        fetch(`${SERVER_URL}/api/courses`).catch(() => null),
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

      if (coursesRes && coursesRes.ok) {
        const cData = await coursesRes.json();
        const map = {};
        (cData.courses || []).forEach((c) => {
          if (c.code) {
            map[c.code.toUpperCase()] = c.totalClasses;
          }
        });
        setCoursePlannedMap(map);
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

  // ── Routine Scheduled Class Time Validation Helpers ──
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

    // Teacher can start attendance from 5 minutes before scheduled start until scheduled end
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

    // Validate routine timing
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

  // Quick update planned classes from dashboard card
  const handleSaveDashboardTargetClasses = async (customCount) => {
    if (!editingTargetCourse?.code) return;
    const count = parseInt(customCount ?? targetClassesInput, 10);
    if (isNaN(count) || count < 1 || count > 300) {
      toast.error("Please enter a valid planned classes count (1 - 300).");
      return;
    }
    setIsSavingDashboardTarget(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/courses/code/${encodeURIComponent(editingTargetCourse.code)}/classes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalClasses: count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update target classes");
      toast.success(data.message || `Planned classes for ${editingTargetCourse.code} updated to ${count}`);
      setCoursePlannedMap((prev) => ({
        ...prev,
        [editingTargetCourse.code.toUpperCase()]: count,
      }));
      setEditingTargetCourse(null);
    } catch (err) {
      console.error("Error updating course classes:", err);
      toast.error(err.message || "Failed to update target classes");
    } finally {
      setIsSavingDashboardTarget(false);
    }
  };

  const isPending = (profile?.status || user?.status) === "pending";

  // Dynamically group unique courses assigned to this teacher from the routine schedule
  const assignedCourses = useMemo(() => {
    const map = new Map();
    (teacherSchedule || []).forEach((slot) => {
      if (!slot.code) return;
      const key = slot.code.toUpperCase();
      if (!map.has(key)) {
        const planned = coursePlannedMap[key] || 36;
        map.set(key, {
          id: slot.id,
          routineId: slot.id,
          code: slot.code,
          title: slot.title,
          semester: slot.semester,
          semesterNum: slot.semesterNum,
          enrolled: slot.enrolled || 45,
          totalClasses: planned,
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
    return Array.from(map.values()).map((c) => ({
      ...c,
      totalClasses: coursePlannedMap[c.code.toUpperCase()] || c.totalClasses || 36,
    }));
  }, [teacherSchedule, coursePlannedMap]);

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

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setEditingCourseNotice(null);
                  setIsCourseNoticeModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-400 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-sky-950/40 border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title="Publish Course Notice for Enrolled Students"
              >
                <Bell className="w-4 h-4 text-sky-200" />
                <span>Course Notice</span>
              </button>
              <DashboardCollapseControls
                onCollapseAll={collapseAllSections}
                onExpandAll={expandAllSections}
                allCollapsed={allCollapsed}
              />
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
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            )}
            <SectionCollapseToggle
              isCollapsed={collapsedSections.profile}
              onToggle={() => toggleSection("profile")}
              label="Faculty Profile"
            />
          </div>
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.profile}
          onExpand={() => toggleSection("profile")}
          sectionName="Faculty Profile & Information Center"
        >
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
                className="px-5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
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
        </CollapsibleBody>
      </div>

      {/* ── Dynamic My Assigned Courses Section (Synchronized with Routine) ── */}
      <div id="assigned-courses" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-xs font-semibold text-sky-600 dark:text-sky-400 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Dynamic Course Workspaces • Assigned by Admin</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Assigned Courses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Courses dynamically assigned to you in the academic routine. Select any course to access its dedicated workspace for individual attendance tracking, lecture materials, and coursework assignments.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-3 py-1.5 rounded-xl ring-1 ring-sky-200 dark:ring-sky-800">
              {assignedCourses.length} Assigned {assignedCourses.length === 1 ? "Course" : "Courses"}
            </span>
            <button
              onClick={() => loadProfile(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
              title="Refresh Assigned Courses"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scheduleLoading ? "animate-spin text-sky-500" : ""}`} />
              <span>Sync</span>
            </button>
            <SectionCollapseToggle
              isCollapsed={collapsedSections.courses}
              onToggle={() => toggleSection("courses")}
              label="Assigned Courses"
            />
          </div>
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.courses}
          onExpand={() => toggleSection("courses")}
          sectionName="My Assigned Courses"
        >
          {scheduleLoading ? (
            <div className="py-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
            </div>
          ) : assignedCourses.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No Courses Assigned in Routine
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When the department administrator assigns you to lecture courses in the Academic Routine Studio, your courses will dynamically appear here with individual workspaces for attendance calculation, course materials, and assignments.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignedCourses.map((course) => (
                <div
                  key={course.code}
                  className="p-6 rounded-[1.75rem] bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-sky-400 dark:hover:border-sky-500/60 hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-3.5">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-extrabold text-xs text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-lg border border-sky-200/60 dark:border-sky-900/60 uppercase tracking-wider">
                          {course.code}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          {course.semester}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTargetCourse(course);
                            setTargetClassesInput(course.totalClasses || 36);
                          }}
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 transition-all flex items-center gap-1 cursor-pointer"
                          title="Click to edit how many classes will be held for this course"
                        >
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          <span>{course.totalClasses || 36} Classes</span>
                          <Edit3 className="w-2.5 h-2.5 text-indigo-400" />
                        </button>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {course.slots.length} {course.slots.length === 1 ? "Slot" : "Slots"} / Wk
                        </span>
                      </div>
                    </div>

                    {/* Course Title Link */}
                    <Link
                      href={`/dashboard/teacher/courses/${encodeURIComponent(course.code)}`}
                      className="block group/link"
                      title="Enter Dedicated Course Workspace"
                    >
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-snug group-hover/link:text-sky-600 dark:group-hover/link:text-sky-400 transition-colors flex items-center justify-between gap-2">
                        <span>{course.title}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover/link:text-sky-600 dark:group-hover/link:text-sky-400 group-hover/link:translate-x-1 transition-all shrink-0" />
                      </h3>
                    </Link>

                    {/* Scheduled Slots Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Routine Timetable:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {course.slots.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                              <span>{s.day}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span>{s.time}</span>
                              <span className="text-[10px] text-slate-400 font-mono">({s.room})</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dedicated Capabilities */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold">
                        <UserCheck className="w-3 h-3" />
                        <span>Individual Attendance</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTargetCourse(course);
                          setTargetClassesInput(course.totalClasses || 36);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold transition cursor-pointer"
                        title="Edit target classes for this semester"
                      >
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        <span>Target: {course.totalClasses || 36}</span>
                        <Edit3 className="w-2.5 h-2.5 ml-0.5 text-indigo-400" />
                      </button>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold">
                        <FileText className="w-3 h-3" />
                        <span>Assignments</span>
                      </span>
                    </div>
                  </div>

                  {/* Primary CTA Buttons */}
                  <div className="pt-2 flex items-center gap-2.5">
                    <Link
                      href={`/dashboard/teacher/courses/${encodeURIComponent(course.code)}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Course Workspace ➔</span>
                    </Link>
                    {(() => {
                      const codeKey = (course.code || "").toUpperCase();
                      const session = activeAttendanceSessions[codeKey];
                      const isActive = session?.isOpen && session?.secondsLeft > 0;
                      const isStarting = startingAttendanceCode === codeKey;
                      const timing = getCourseRoutineTiming(course);

                      if (isStarting) {
                        return (
                          <button
                            disabled
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 cursor-not-allowed"
                          >
                            <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
                            <span>Starting...</span>
                          </button>
                        );
                      }

                      if (isActive) {
                        return (
                          <button
                            disabled
                            title={`Session active: ${formatTimer(session.secondsLeft)} remaining`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl font-bold text-xs bg-emerald-600 text-white ring-2 ring-emerald-400/50 shadow-md shadow-emerald-600/30 animate-pulse shrink-0 cursor-default"
                          >
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                            </span>
                            <span>Active ({formatTimer(session.secondsLeft)})</span>
                          </button>
                        );
                      }

                      if (!timing.canTake) {
                        return (
                          <button
                            disabled
                            title={timing.reason}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-11 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed shrink-0"
                          >
                            {timing.status === "upcoming" ? (
                              <Clock className="w-4 h-4 text-amber-500" />
                            ) : (
                              <Calendar className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{timing.label}</span>
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={() => handleStartAttendance(timing.targetSlot || course)}
                          disabled={isPending}
                          title={timing.reason}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 h-11 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Take Attendance</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleBody>
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
            <SectionCollapseToggle
              isCollapsed={collapsedSections.routine}
              onToggle={() => toggleSection("routine")}
              label="Academic Routine"
            />
          </div>
        </div>

        <CollapsibleBody
          isCollapsed={collapsedSections.routine}
          onExpand={() => toggleSection("routine")}
          sectionName="Academic Routine & Class Schedule"
        >
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSchedule.map((cls, idx) => (
                  <div 
                    key={cls.id || idx} 
                    className="p-6 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-400 dark:hover:border-indigo-500/60 hover:shadow-lg transition-all duration-200 flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/dashboard/teacher/courses/${encodeURIComponent(cls.code)}`}
                          className="block flex-1 pr-2 group/title"
                          title="Click to open course workspace"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider group-hover/title:underline">
                              {cls.code}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                              {cls.day}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-snug group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 transition-colors flex items-center gap-1.5">
                            <span>{cls.title}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover/title:opacity-100 group-hover/title:translate-x-0 transition-all text-indigo-600 dark:text-indigo-400 shrink-0" />
                          </h3>
                        </Link>
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
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

                      {/* Capabilities pills */}
                      <div className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>Attendance</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>Materials</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                          <FileText className="w-2.5 h-2.5" />
                          <span>Tasks</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <Link
                        href={`/dashboard/teacher/courses/${encodeURIComponent(cls.code)}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Course Workspace ➔</span>
                      </Link>
                      {(() => {
                        const codeKey = (cls.code || "").toUpperCase();
                        const session = activeAttendanceSessions[codeKey];
                        const isActive = session?.isOpen && session?.secondsLeft > 0;
                        const isStarting = startingAttendanceCode === codeKey;
                        const timing = getSlotRoutineTiming(cls.day, cls.time);

                        if (isStarting) {
                          return (
                            <button
                              disabled
                              className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 cursor-not-allowed"
                            >
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                              <span>Starting...</span>
                            </button>
                          );
                        }

                        if (isActive) {
                          return (
                            <button
                              disabled
                              title={`Session active: ${formatTimer(session.secondsLeft)} remaining`}
                              className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl font-bold text-xs bg-emerald-600 text-white ring-2 ring-emerald-400/50 shadow-xs animate-pulse shrink-0 cursor-default"
                            >
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                              <span>Active ({formatTimer(session.secondsLeft)})</span>
                            </button>
                          );
                        }

                        if (!timing.canTake) {
                          return (
                            <button
                              disabled
                              title={timing.reason}
                              className="inline-flex items-center justify-center gap-1.5 px-2.5 h-10 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-200/60 dark:border-slate-700/60 cursor-not-allowed shrink-0"
                            >
                              {timing.status === "upcoming" ? (
                                <Clock className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{timing.label}</span>
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleStartAttendance(cls)}
                            disabled={isPending}
                            title={timing.reason}
                            className="inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Take Attendance</span>
                          </button>
                        );
                      })()}
                    </div>
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
              <div
                data-lenis-prevent
                data-smart-scroll="horizontal"
                className="overflow-auto overscroll-contain max-h-[640px] scrollbar-thin"
              >
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-20 shadow-xs">
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md">
                      <th className="sticky left-0 top-0 z-30 w-24 border-r border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 py-4 px-3 text-center text-[10px] font-black tracking-widest text-slate-400 uppercase">
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
        </CollapsibleBody>
      </div>

      {/* Faculty Workload & Engagement Studio */}
      <div id="analytics" className="scroll-mt-6">
        <TeacherAnalyticsCharts 
          teacherSchedule={teacherSchedule} 
          isCollapsed={collapsedSections.analytics}
          onToggle={() => toggleSection("analytics")}
        />
      </div>

      {/* Official Notice Board */}
      <div id="notices" className="scroll-mt-6">
        <NoticeBoardSection
          title="Notice Board"
          subtitle="Department broadcast & official faculty circulars."
          isCollapsed={collapsedSections.notices}
          onToggle={() => toggleSection("notices")}
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

      {/* ── Quick Edit Target Classes Modal on Dashboard ── */}
      {editingTargetCourse && (
        <div
          data-lenis-prevent
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overscroll-contain"
        >
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Planned Classes • {editingTargetCourse.code}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{editingTargetCourse.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTargetCourse(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDashboardTargetClasses(targetClassesInput);
              }}
              className="space-y-4"
            >
              {/* Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Quick Presets
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[24, 30, 36, 40].map((preset) => {
                    const isSelected = Number(targetClassesInput) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setTargetClassesInput(preset)}
                        className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-102"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        {preset} Cls
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Number Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Planned Classes For Semester
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="300"
                    required
                    value={targetClassesInput}
                    onChange={(e) => setTargetClassesInput(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-extrabold text-slate-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    Sessions Target
                  </span>
                </div>
              </div>

              {/* Info note */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Attendance Threshold Impact</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Minimum 75% attendance for {targetClassesInput || 0} classes equals <strong>{Math.ceil(0.75 * (parseInt(targetClassesInput, 10) || 0))} attended classes</strong>.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTargetCourse(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDashboardTarget}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingDashboardTarget ? "Saving..." : "Save Target"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Course Notice Modal opened from Top Button or Section */}
      <CourseNoticeModal
        isOpen={isCourseNoticeModalOpen}
        onClose={() => {
          setIsCourseNoticeModalOpen(false);
          setEditingCourseNotice(null);
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
      />
    </div>
  );
}
