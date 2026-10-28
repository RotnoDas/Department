"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { authClient, safeSignOut } from "@/lib/auth-client";
import { getCoursesBySemester } from "@/data/courses";
import { ThemeToggle } from "@/components/common/ThemeToggle";

// Register GSAP Plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin);
}
import { 
  GraduationCap, 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BookOpen, 
  Clock, 
  FileText, 
  Calendar, 
  Award, 
  LogOut, 
  ArrowLeft, 
  Sparkles, 
  Presentation, 
  Briefcase, 
  ShieldCheck, 
  Bell, 
  Layers,
  Wrench,
  CheckCircle2,
  Compass,
  BarChart3,
  User,
  X,
  LifeBuoy,
  BookMarked,
  ChevronRight,
  ExternalLink,
  ChevronDown
} from "lucide-react";

export function DashboardSidebar({ isOpen, setIsOpen, user, profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentHash, setCurrentHash] = useState("");
  const [activeSection, setActiveSection] = useState("profile");
  const isManualScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Dynamic state for teacher assigned courses & schedule count
  const [assignedCourses, setAssignedCourses] = useState([]);
  const [routineSlotCount, setRoutineSlotCount] = useState(0);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Dynamic state for student profile & courses
  const [studentProfile, setStudentProfile] = useState(null);

  // Monitor URL hash changes and sync on mount (SSR safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const initialHash = window.location.hash;
      setCurrentHash(initialHash);
      const initialHashId = initialHash.replace("#", "");
      if (initialHashId) {
        setActiveSection(initialHashId);
      }

      const handleHashChange = () => {
        const rawHash = window.location.hash;
        setCurrentHash(rawHash);
        const hashId = rawHash.replace("#", "");
        if (hashId) {
          setActiveSection(hashId);
        }
      };
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  // Resilient role determination:
  const resolveRole = useCallback(() => {
    if (pathname?.startsWith("/dashboard/admin")) return "admin";
    if (pathname?.startsWith("/dashboard/teacher")) return "teacher";
    if (pathname?.startsWith("/dashboard/employee")) return "employee";
    if (pathname?.startsWith("/dashboard/student")) return "student";

    if (user?.role) return user.role;

    const email = (user?.email || "").toLowerCase().trim();
    if (email === "admin@cse.edu" || email.includes("admin")) return "admin";
    if (email.endsWith("@teacher.cse.edu") || (email.endsWith("@cse.edu") && !email.includes("student") && !email.includes("staff") && !email.includes("employee"))) return "teacher";
    if (email.endsWith("@employee.cse.edu") || email.endsWith("@staff.cse.edu")) return "employee";
    if (email.endsWith("@student.cse.edu")) return "student";

    return "student";
  }, [pathname, user]);

  const role = resolveRole();

  // Contextual teacher route detection
  const isTeacherRoute = pathname?.startsWith("/dashboard/teacher");
  const isCourseWorkspace = isTeacherRoute && pathname.includes("/courses/");
  const activeCourseCode = useMemo(() => {
    if (!isCourseWorkspace) return null;
    try {
      const parts = pathname.split("/courses/")[1];
      const raw = parts ? parts.split("/")[0]?.split("?")[0] : "";
      return decodeURIComponent(raw).trim().toUpperCase();
    } catch {
      return null;
    }
  }, [isCourseWorkspace, pathname]);

  // Current active tab when on a course workspace
  const currentTab = searchParams?.get("tab") || "attendance";

  // Fetch teacher's assigned courses for quick-launcher and navigation badge
  useEffect(() => {
    if (role !== "teacher") return;

    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) return;

    // Load from sessionStorage if available for instantaneous UI hydration
    try {
      const cached = sessionStorage.getItem(`dept_teacher_courses_${targetEmail}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAssignedCourses(parsed);
        }
      }
    } catch (_) {}

    let isMounted = true;
    const fetchCourses = async () => {
      setIsLoadingCourses(true);
      try {
        const params = new URLSearchParams();
        params.set("email", targetEmail);
        if (user?.teacherId || profile?.teacherId) params.set("teacherId", user?.teacherId || profile?.teacherId);
        if (user?.name || profile?.name) params.set("teacherName", user?.name || profile?.name);

        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
        const res = await fetch(`${serverUrl}/api/teacher/routine?${params.toString()}`);
        if (res.ok && isMounted) {
          const slots = await res.json();
          if (Array.isArray(slots)) {
            setRoutineSlotCount(slots.length);
            const map = new Map();
            slots.forEach((s) => {
              if (s.courseCode) {
                const code = s.courseCode.trim().toUpperCase();
                if (!map.has(code)) {
                  map.set(code, {
                    code,
                    title: s.courseTitle || `${code} Course Module`,
                    semester: s.semester ? `Semester ${s.semester}` : "Semester 7",
                    semesterNum: s.semester || 7,
                    count: 1,
                  });
                } else {
                  map.get(code).count++;
                }
              }
            });
            const list = Array.from(map.values());
            setAssignedCourses(list);
            try {
              sessionStorage.setItem(`dept_teacher_courses_${targetEmail}`, JSON.stringify(list));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn("Could not fetch sidebar courses:", err);
      } finally {
        if (isMounted) setIsLoadingCourses(false);
      }
    };

    fetchCourses();
    return () => { isMounted = false; };
  }, [role, user?.email, user?.teacherId, user?.name, profile?.email, profile?.teacherId, profile?.name]);

  // Fetch & sync student profile for quick-launcher and navigation badges
  useEffect(() => {
    if (role !== "student") return;

    const targetEmail = user?.email || profile?.email;
    if (!targetEmail) return;

    // Load from sessionStorage if available for instantaneous UI hydration
    try {
      const cached = sessionStorage.getItem(`dept_student_profile_${targetEmail}`) || sessionStorage.getItem("dept_student_profile");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) setStudentProfile(parsed);
      }
    } catch (_) {}

    let isMounted = true;
    const fetchStudent = async () => {
      try {
        const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
        const res = await fetch(`${serverUrl}/api/students/email/${encodeURIComponent(targetEmail)}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data) {
            setStudentProfile(data);
            try {
              sessionStorage.setItem(`dept_student_profile_${targetEmail}`, JSON.stringify(data));
              sessionStorage.setItem("dept_student_profile", JSON.stringify(data));
            } catch (_) {}
          }
        }
      } catch (err) {
        console.warn("Could not fetch sidebar student profile:", err);
      }
    };

    fetchStudent();
    return () => { isMounted = false; };
  }, [role, user?.email, profile?.email]);

  // Determine student enrolled semester
  const studentSemester = useMemo(() => {
    const raw = studentProfile?.semester || profile?.semester || user?.semester;
    if (raw) {
      const match = String(raw).match(/(\d+)/);
      if (match) return match[1];
    }
    return "7";
  }, [studentProfile?.semester, profile?.semester, user?.semester]);

  // Resolved semester curriculum courses
  const studentSemesterCourses = useMemo(() => {
    return getCoursesBySemester(studentSemester) || [];
  }, [studentSemester]);

  // Student Navigation Items with section IDs, descriptions, and live badges (mapped exactly to page DOM order)
  const studentNavItems = useMemo(() => [
    { 
      name: "Student Profile", 
      description: "Bio, CGPA & academic status",
      href: "/dashboard/student", 
      hash: "", 
      scrollTarget: "profile",
      badge: "Overview",
      icon: LayoutDashboard 
    },
    { 
      name: "Profile & Face Biometrics", 
      description: "Bio editor & face enrollment",
      href: "/dashboard/student#profile-settings", 
      hash: "#profile-settings", 
      scrollTarget: "profile-settings",
      badge: "Face ID",
      icon: GraduationCap 
    },
    { 
      name: "Academic Analytics", 
      description: "Attendance % & exam eligibility",
      href: "/dashboard/student#analytics", 
      hash: "#analytics", 
      scrollTarget: "analytics",
      badge: "Analytics",
      icon: BarChart3 
    },
    { 
      name: "Smart Face Attendance", 
      description: "10m Geofence & AI check-in",
      href: "/dashboard/student#attendance", 
      hash: "#attendance", 
      scrollTarget: "attendance",
      badge: "10m GPS",
      icon: UserCheck 
    },
    { 
      name: "Class Routine & Timetable", 
      description: "Weekly timetable & room matrix",
      href: "/dashboard/student#routine", 
      hash: "#routine", 
      scrollTarget: "routine",
      badge: "Timetable",
      icon: Calendar 
    },
    { 
      name: "Course Study Materials", 
      description: "Lecture slides & syllabus notes",
      href: "/dashboard/student#materials", 
      hash: "#materials", 
      scrollTarget: "materials",
      badge: "Files",
      icon: BookOpen 
    },
    { 
      name: "Tasks & Assignments", 
      description: "Coursework submissions & marks",
      href: "/dashboard/student#assignments", 
      hash: "#assignments", 
      scrollTarget: "assignments",
      badge: "Tasks",
      icon: FileText 
    },
    { 
      name: "Department Notice Board", 
      description: "Official circulars & audio alerts",
      href: "/dashboard/student#notices", 
      hash: "#notices", 
      scrollTarget: "notices",
      badge: "Notices",
      icon: Bell 
    },
  ], []);

  // Jump handler for student curriculum course cards
  const handleStudentCourseClick = (course) => {
    setIsOpen(false);
    if (pathname === "/dashboard/student") {
      setActiveSection("materials");
      setCurrentHash("#materials");
      isManualScrollingRef.current = true;

      window.dispatchEvent(new CustomEvent("dashboard-expand-section", { detail: { id: "materials" } }));
      window.dispatchEvent(new CustomEvent("dashboard-expand-section", { detail: { id: "assignments" } }));
      window.dispatchEvent(new CustomEvent("dashboard-filter-course", { detail: { courseCode: course.code } }));

      if (typeof window !== "undefined" && window.history.pushState) {
        window.history.pushState(null, "", "/dashboard/student#materials");
      }

      const targetEl = document.getElementById("materials");
      if (targetEl) {
        gsap.to(window, {
          duration: 0.6,
          scrollTo: { y: "#materials", offsetY: 70, autoKill: false },
          ease: "power2.inOut",
          onComplete: () => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
              isManualScrollingRef.current = false;
            }, 100);
          }
        });
      } else {
        isManualScrollingRef.current = false;
      }
    } else {
      router.push("/dashboard/student#materials");
    }
  };

  // Dynamic serial navigation mapping IDs for role
  const activeNavItems = useMemo(() => {
    if (role === "student") return studentNavItems;
    if (role === "teacher") {
      return [
        { scrollTarget: "profile" },
        { scrollTarget: "profile-settings" },
        { scrollTarget: "assigned-courses" },
        { scrollTarget: "routine" },
        { scrollTarget: "analytics" },
        { scrollTarget: "notices" },
      ];
    }
    return [];
  }, [role, studentNavItems]);

  // Active section scroll spy listener (mirroring Navbar.jsx's serial logic with exact viewport checks)
  useEffect(() => {
    if (pathname !== "/dashboard/teacher" && pathname !== "/dashboard/student") {
      return;
    }

    const ids = activeNavItems.map((item) => item.scrollTarget).filter(Boolean);
    if (!ids.length) return;

    const handleScrollSpy = () => {
      if (isManualScrollingRef.current) return;

      // Bottom of the page threshold -> select the last item
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
        const lastId = ids[ids.length - 1];
        if (lastId) setActiveSection(lastId);
        return;
      }

      // Check sections from bottom to top (serial sequence)
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          // When top of element has entered the upper 180px of viewport
          if (rect.top <= 180) {
            setActiveSection(ids[i]);
            return;
          }
        }
      }

      // Top of page fallback -> first item
      setActiveSection(ids[0] || "profile");
    };

    window.addEventListener("scroll", handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, [pathname, activeNavItems]);

  const handleLogout = async () => {
    await safeSignOut("/login");
  };

  // Smooth scroll and uncollapse handler with instant selection
  const handleNavClick = (e, item) => {
    setIsOpen(false);
    const hasHash = Boolean(item.href?.includes("#"));
    const [itemPath, hash] = hasHash ? item.href.split("#") : [item.href, ""];
    const targetId = item.scrollTarget || hash || "profile";

    if (pathname === itemPath) {
      e.preventDefault();

      // 1. INSTANT SELECTION FEEDBACK (Zero delay)
      setActiveSection(targetId);
      setCurrentHash(hash ? `#${hash}` : "");
      isManualScrollingRef.current = true;

      // 2. Dispatch expansion event for collapsible sections
      window.dispatchEvent(new CustomEvent("dashboard-expand-section", { detail: { id: targetId } }));

      // 3. Update URL silently
      if (typeof window !== "undefined" && window.history.pushState) {
        window.history.pushState(null, "", item.href);
      }

      // 4. Smooth programmatic GSAP scroll with 70px offset & autoKill: false (identical to Navbar.jsx)
      if (typeof window !== "undefined") {
        if (targetId === "profile" && !hash) {
          gsap.to(window, {
            duration: 0.6,
            scrollTo: { y: 0, autoKill: false },
            ease: "power2.inOut",
            onComplete: () => {
              if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => {
                isManualScrollingRef.current = false;
              }, 100);
            }
          });
        } else {
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            gsap.to(window, {
              duration: 0.6,
              scrollTo: { y: `#${targetId}`, offsetY: 70, autoKill: false },
              ease: "power2.inOut",
              onComplete: () => {
                if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = setTimeout(() => {
                  isManualScrollingRef.current = false;
                }, 100);
              }
            });
          } else {
            isManualScrollingRef.current = false;
          }
        }
      }
    } else {
      router.push(item.href);
    }
  };

  // Standard non-teacher navigation items
  const getStandardNavItems = () => {
    switch (role) {
      case "admin":
        return [
          { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
          { name: "Institutional Analytics", href: "/dashboard/admin#analytics", icon: BarChart3 },
          { name: "Support & Complaints", href: "/dashboard/admin#support-complaints", icon: LifeBuoy },
          { name: "Student Approvals", href: "/dashboard/admin#pending", icon: UserCheck },
          { name: "Faculty Approvals", href: "/dashboard/admin#faculty", icon: Presentation },
          { name: "Class Routine", href: "/dashboard/admin#routine", icon: Calendar },
          { name: "Curriculum Matrix (1-8)", href: "/dashboard/admin#courses", icon: BookOpen },
          { name: "Notice Dispatcher", href: "/dashboard/admin#notices", icon: Bell },
          { name: "Department Staff", href: "/dashboard/admin#directory", icon: Users },
        ];
      case "employee":
        return [
          { name: "Staff Desk", href: "/dashboard/employee", icon: LayoutDashboard },
          { name: "Notice Board", href: "/dashboard/employee#notices", icon: Bell },
          { name: "Fleet & Ticket Analytics", href: "/dashboard/employee#analytics", icon: BarChart3 },
          { name: "Shift Check-in", href: "/dashboard/employee#shift", icon: Clock },
          { name: "Lab Infrastructure", href: "/dashboard/employee#inventory", icon: Layers },
          { name: "Maintenance Tasks", href: "/dashboard/employee#tasks", icon: Wrench },
          { name: "Lab Timetable", href: "/dashboard/employee#schedule", icon: Calendar },
          { name: "Staff Profile", href: "/dashboard/employee#profile", icon: User },
        ];
      case "student":
      default:
        return [
          { name: "Student Profile", href: "/dashboard/student", icon: LayoutDashboard },
          { name: "Profile & Face Biometrics", href: "/dashboard/student#profile-settings", icon: GraduationCap },
          { name: "Academic Analytics", href: "/dashboard/student#analytics", icon: BarChart3 },
          { name: "Smart Face Attendance", href: "/dashboard/student#attendance", icon: UserCheck },
          { name: "Class Routine & Timetable", href: "/dashboard/student#routine", icon: Calendar },
          { name: "Course Study Materials", href: "/dashboard/student#materials", icon: BookOpen },
          { name: "Tasks & Assignments", href: "/dashboard/student#assignments", icon: FileText },
          { name: "Department Notice Board", href: "/dashboard/student#notices", icon: Bell },
        ];
    }
  };

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return { label: "Department Admin", bg: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-800" };
      case "teacher":
        return { label: "Faculty Member", bg: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800" };
      case "employee":
        return { label: "Staff / Officer", bg: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800" };
      case "student":
      default:
        return { label: "Student", bg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800" };
    }
  };

  const badge = getRoleBadge();

  const displayName = profile?.name || user?.name || (
    role === "admin" ? "System Administrator" :
    role === "teacher" ? "Faculty Member" :
    role === "employee" ? "Staff Officer" :
    "Student"
  );

  const displayEmail = profile?.email || user?.email || (
    role === "admin" ? "admin@cse.edu" :
    role === "teacher" ? "faculty@cse.edu" :
    role === "employee" ? "staff@cse.edu" :
    "student@student.cse.edu"
  );

  // Course workspace module tabs definition for active course navigation
  const courseWorkspaceModules = useMemo(() => {
    if (!activeCourseCode) return [];
    return [
      { id: "attendance", name: "Attendance Hub", icon: UserCheck },
      { id: "materials", name: "Study Materials", icon: BookOpen },
      { id: "assignments", name: "Continuous Tasks", icon: FileText },
      { id: "syllabus", name: "Syllabus & Policy", icon: BookMarked },
      { id: "schedule", name: "Routine Schedule", icon: Calendar },
    ];
  }, [activeCourseCode]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        data-lenis-prevent
        className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10
        flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none overscroll-contain
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Top Header */}
        <div className="flex flex-col p-5 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40">
                <GraduationCap className="h-5 w-5 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">CSE Portal</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 tracking-wider uppercase">
                  PUST Department
                </span>
              </div>
            </Link>
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Card */}
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex-wrap gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ring-1 ${badge.bg}`}>
                  {badge.label}
                </span>
                {role === "student" && (studentProfile?.studentId || profile?.studentId || user?.studentId) && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                    #{studentProfile?.studentId || profile?.studentId || user?.studentId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {role === "student" && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800">
                    Sem {studentSemester}
                  </span>
                )}
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                  role === "admin" || role === "teacher" || role === "employee" || user?.status === "approved" || studentProfile?.status === "approved"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" 
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                }`}>
                  {role === "admin" || role === "teacher" || role === "employee" || user?.status === "approved" || studentProfile?.status === "approved" ? "Active" : "Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TEACHER NAVIGATION VIEW ───────────────────────────────── */}
        {role === "teacher" ? (
          <div 
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-5 scrollbar-thin"
          >
            {/* SUB-VIEW A: INSIDE A SPECIFIC COURSE WORKSPACE */}
            {isCourseWorkspace && activeCourseCode ? (
              <div className="space-y-4">
                {/* Back to Faculty Hub Card */}
                <Link
                  href="/dashboard/teacher"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition group border border-slate-200/60 dark:border-white/5 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">Return to Faculty Hub</span>
                    <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">All courses & schedule</span>
                  </div>
                </Link>

                {/* Active Workspace Module Navigation */}
                <div>
                  <div className="px-2 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                      ACTIVE WORKSPACE
                    </span>
                    <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800">
                      {activeCourseCode}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {courseWorkspaceModules.map((module) => {
                      const Icon = module.icon;
                      const isActive = currentTab === module.id;
                      const moduleHref = `/dashboard/teacher/courses/${encodeURIComponent(activeCourseCode)}?tab=${module.id}`;

                      return (
                        <Link
                          key={module.id}
                          href={moduleHref}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer
                            ${isActive 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold" 
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                          `}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                            <span className="truncate">{module.name}</span>
                          </div>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Other Courses Switcher (if teacher has >1 course) */}
                {assignedCourses.filter((c) => c.code !== activeCourseCode).length > 0 && (
                  <div>
                    <div className="px-2 pt-2 pb-1.5 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                      OTHER ASSIGNED COURSES
                    </div>
                    <div className="space-y-1">
                      {assignedCourses
                        .filter((c) => c.code !== activeCourseCode)
                        .map((c) => (
                          <Link
                            key={c.code}
                            href={`/dashboard/teacher/courses/${encodeURIComponent(c.code)}`}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/40"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                                {c.code}
                              </span>
                              <span className="truncate text-[11px]">{c.title}</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          </Link>
                        ))}
                    </div>
                  </div>
                )}

                {/* Shortcuts Back to Main Hub Sections */}
                <div>
                  <div className="px-2 pt-2 pb-1.5 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                    FACULTY HUB JUMPS
                  </div>
                  <div className="space-y-1">
                    {[
                      { name: "All Assigned Courses", href: "/dashboard/teacher#assigned-courses", icon: BookOpen },
                      { name: "My Routine Schedule", href: "/dashboard/teacher#routine", icon: Clock },
                      { name: "Workload Analytics", href: "/dashboard/teacher#analytics", icon: BarChart3 },
                      { name: "Notice Board", href: "/dashboard/teacher#notices", icon: Bell },
                      { name: "Faculty Profile", href: "/dashboard/teacher#profile-settings", icon: User },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition"
                        >
                          <Icon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* SUB-VIEW B: ROOT TEACHER DASHBOARD (/dashboard/teacher) */
              <div className="space-y-5">
                {/* Faculty Main Sections */}
                <div>
                  <div className="px-2 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                      FACULTY WORKSPACE
                    </span>
                    {routineSlotCount > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {routineSlotCount} Total Classes
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[
                      { 
                        name: "Faculty Hub Overview", 
                        href: "/dashboard/teacher", 
                        hash: "", 
                        scrollTarget: "profile",
                        icon: LayoutDashboard 
                      },
                      { 
                        name: "My Assigned Courses", 
                        href: "/dashboard/teacher#assigned-courses", 
                        hash: "#assigned-courses", 
                        scrollTarget: "assigned-courses",
                        badge: assignedCourses.length > 0 ? `${assignedCourses.length}` : null,
                        icon: BookOpen 
                      },
                      { 
                        name: "Academic Routine & Schedule", 
                        href: "/dashboard/teacher#routine", 
                        hash: "#routine", 
                        scrollTarget: "routine",
                        badge: routineSlotCount > 0 ? `${routineSlotCount} slots` : null,
                        icon: Clock 
                      },
                      { 
                        name: "Workload Analytics", 
                        href: "/dashboard/teacher#analytics", 
                        hash: "#analytics", 
                        scrollTarget: "analytics",
                        icon: BarChart3 
                      },
                      { 
                        name: "Department Notice Board", 
                        href: "/dashboard/teacher#notices", 
                        hash: "#notices", 
                        scrollTarget: "notices",
                        icon: Bell 
                      },
                      { 
                        name: "Faculty Profile & Settings", 
                        href: "/dashboard/teacher#profile-settings", 
                        hash: "#profile-settings", 
                        scrollTarget: "profile-settings",
                        icon: User 
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const hasHash = Boolean(item.hash);
                      
                      // Match either current URL hash or scroll spy position
                      const isHashActive = hasHash ? currentHash === item.hash : (!currentHash || currentHash === "#");
                      const isScrollActive = activeSection === item.scrollTarget;
                      const isActive = isHashActive || isScrollActive;

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={(e) => handleNavClick(e, item)}
                          className={`
                            flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer
                            ${isActive 
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                          `}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              isActive 
                                ? "bg-white/20 text-white" 
                                : "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800"
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Course Workspaces Direct Jump Section */}
                <div>
                  <div className="px-2 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                      COURSE WORKSPACES
                    </span>
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                      {assignedCourses.length} Active
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {assignedCourses.length > 0 ? (
                      assignedCourses.map((c) => (
                        <Link
                          key={c.code}
                          href={`/dashboard/teacher/courses/${encodeURIComponent(c.code)}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/80 dark:bg-slate-800/50 dark:hover:bg-indigo-950/50 border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/80 transition group cursor-pointer shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono font-black text-[10px] shadow-xs">
                              {c.code.split(" ")[1] || c.code.slice(0, 4)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs truncate text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                                {c.code}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium">
                                {c.title}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                        </Link>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isLoadingCourses ? "Syncing assigned courses..." : "No courses assigned yet"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : role === "student" ? (
          /* ── STUDENT NAVIGATION VIEW ───────────────────────────────── */
          <div 
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-5 scrollbar-thin"
          >
            {/* Student Main Hub Sections */}
            <div>
              <div className="px-2 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  STUDENT WORKSPACE
                </span>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                  Semester {studentSemester}
                </span>
              </div>
              <div className="space-y-1">
                {studentNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.scrollTarget;

                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      className={`
                        group relative flex items-center justify-between p-2.5 rounded-2xl transition-all duration-200 cursor-pointer border
                        ${isActive 
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold border-indigo-200/80 dark:border-indigo-800/60 shadow-xs" 
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border-transparent hover:border-slate-200/60 dark:hover:border-white/5"}
                      `}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-xl transition-all duration-200 shrink-0 ${
                          isActive 
                            ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 shadow-xs" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/40 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 text-left">
                          <span className={`text-xs truncate leading-tight ${
                            isActive 
                              ? "font-bold text-indigo-600 dark:text-indigo-400" 
                              : "font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                          }`}>
                            {item.name}
                          </span>
                          {item.description && (
                            <span className={`text-[10px] truncate leading-tight mt-0.5 ${
                              isActive 
                                ? "font-medium text-indigo-500/90 dark:text-indigo-300/90" 
                                : "font-normal text-slate-400 dark:text-slate-500"
                            }`}>
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                        {item.badge && (
                          <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full transition-colors ${
                            isActive 
                              ? "bg-indigo-600 text-white shadow-xs" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200/60 dark:ring-white/5 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-300"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 animate-pulse" />
                        )}
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Semester Curriculum Direct Course List (Matching Teacher Course Workspaces) */}
            <div>
              <div className="px-2 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  SEMESTER CURRICULUM
                </span>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                  {studentSemesterCourses.length} Courses
                </span>
              </div>

              <div className="space-y-1.5">
                {studentSemesterCourses.length > 0 ? (
                  studentSemesterCourses.map((c) => {
                    const isLab = c.type === "Sessional" || c.type === "Laboratory" || c.title?.toLowerCase().includes("sessional") || c.title?.toLowerCase().includes("lab");
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleStudentCourseClick(c)}
                        className="w-full text-left flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/80 dark:bg-slate-800/50 dark:hover:bg-indigo-950/50 border border-slate-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-800/80 transition group cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono font-black text-[10px] shadow-xs ${
                            isLab
                              ? "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300"
                              : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                          }`}>
                            {c.code.split(" ")[1] || c.code.slice(0, 4)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs truncate text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                                {c.code}
                              </span>
                              <span className={`text-[9px] font-semibold px-1 rounded ${
                                isLab
                                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                              }`}>
                                {c.credits} Cr
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate font-medium">
                              {c.title}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Curriculum courses loading...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ── NON-TEACHER NAVIGATION ITEMS ──────────────────────────── */
          <div 
            data-lenis-prevent
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 space-y-4"
          >
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                {role.toUpperCase()} NAVIGATION
              </div>
              <div className="space-y-1">
                {getStandardNavItems().map((item) => {
                  const Icon = item.icon;
                  const hasHash = item.href.includes("#");
                  const itemPath = hasHash ? item.href.split("#")[0] : item.href;
                  const itemHash = hasHash ? `#${item.href.split("#")[1]}` : "";
                  
                  const isActive = hasHash 
                    ? pathname === itemPath && currentHash === itemHash
                    : pathname === item.href && (!currentHash || currentHash === "#");

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                      className={`
                        flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 cursor-pointer
                        ${isActive 
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/60 dark:shadow-indigo-900/40" 
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                      `}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-white/10 space-y-2">
          {/* Theme Switcher Row */}
          <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Theme</span>
            <ThemeToggle className="w-8 h-8 rounded-xl" />
          </div>

          <Link
            href="/"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl font-medium text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3.5 py-2 rounded-xl font-medium text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
