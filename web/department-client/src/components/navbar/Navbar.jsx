"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  Sparkles, 
  LayoutDashboard, 
  ChevronDown, 
  LogOut, 
  ArrowRight, 
  User, 
  Mail, 
  Hash, 
  BookOpen, 
  ShieldCheck, 
  ArrowUpRight,
  Calendar,
  Layers,
  Bell,
  LifeBuoy,
  Menu,
  X
} from "lucide-react";
import toast from "react-hot-toast";
import gsap from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";
import { authClient, safeSignOut } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";

// Register GSAP Plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollToPlugin);
}

// Structured Navigation Mapping for Homepage
export const NAV_ITEMS = [
  { label: "Overview", href: "#overview", targetId: "overview", icon: Sparkles, description: "Department highlight & welcome" },
  { label: "Features", href: "#features", targetId: "features", icon: Layers, description: "Key platform capabilities" },
  { label: "Notices", href: "#notices", targetId: "notices", icon: Bell, description: "Latest circulars & announcements" },
  { label: "Support", href: "#support", targetId: "support", icon: LifeBuoy, description: "Student support & administrative help" },
];

export function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [dbProfile, setDbProfile] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { 
    stiffness: 80, 
    damping: 20, 
    restDelta: 0.001 
  });
  const width = useTransform(smoothProgress, [0, 1], ["0%", "100%"]);

  const user = session?.user;

  // Resolve user role with fallback resilience
  const resolveRole = () => {
    if (user?.role) return user.role;
    const email = (user?.email || "").toLowerCase().trim();
    if (email === "admin@cse.edu" || email.includes("admin")) return "admin";
    if (email.endsWith("@teacher.cse.edu") || (email.endsWith("@cse.edu") && !email.includes("student") && !email.includes("staff") && !email.includes("admin") && !email.includes("employee"))) return "teacher";
    if (email.endsWith("@employee.cse.edu") || email.endsWith("@staff.cse.edu")) return "employee";
    return "student";
  };

  const role = user ? resolveRole() : null;

  // Fetch full student/teacher/employee details from backend if available
  useEffect(() => {
    if (user?.email) {
      const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";
      fetch(`${serverUrl}/api/users/${user.email}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.profile) {
            setDbProfile(data.profile);
          } else if (data?.user) {
            setDbProfile(data.user);
          }
        })
        .catch(() => {});
    } else {
      setDbProfile(null);
    }
  }, [user?.email]);

  // Handle clicking outside to dismiss dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };
    if (isDropdownOpen || mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen, mobileMenuOpen]);

  // Active section scroll spy listener
  useEffect(() => {
    const handleScrollSpy = () => {
      const scrollPosition = window.scrollY + 180;
      const ids = NAV_ITEMS.map((item) => item.targetId);
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            setActiveSection(ids[i]);
            return;
          }
        }
      }
      setActiveSection("overview");
    };

    window.addEventListener("scroll", handleScrollSpy, { passive: true });
    handleScrollSpy();
    return () => window.removeEventListener("scroll", handleScrollSpy);
  }, []);

  const handleNavClick = (e, item) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      const el = document.getElementById(item.targetId);
      if (el) {
        gsap.to(window, {
          duration: 0.6,
          scrollTo: { y: `#${item.targetId}`, offsetY: 70 },
          ease: "power2.inOut",
        });
        setActiveSection(item.targetId);
      }
    } else {
      router.push(`/${item.href}`);
    }
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    toast.success("Signing out...");
    await safeSignOut("/login");
  };

  const getDashboardPath = () => {
    switch (role) {
      case "admin": return "/dashboard/admin";
      case "teacher": return "/dashboard/teacher";
      case "employee": return "/dashboard/employee";
      case "student":
      default: return "/dashboard/student";
    }
  };

  const getDashboardLabel = () => {
    switch (role) {
      case "admin": return "Admin Console";
      case "teacher": return "Faculty Hub";
      case "employee": return "Staff Desk";
      case "student":
      default: return "Student Portal";
    }
  };

  const getRoleMeta = () => {
    switch (role) {
      case "admin":
        return {
          label: "Administrator",
          badgeClass: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-purple-200 dark:ring-purple-800",
          avatarBg: "from-purple-600 via-indigo-600 to-indigo-700",
        };
      case "teacher":
        return {
          label: "Faculty Member",
          badgeClass: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-sky-200 dark:ring-sky-800",
          avatarBg: "from-sky-600 via-blue-600 to-indigo-700",
        };
      case "employee":
        return {
          label: "Staff / Officer",
          badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-800",
          avatarBg: "from-emerald-600 via-teal-600 to-cyan-700",
        };
      case "student":
      default:
        return {
          label: "Student",
          badgeClass: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-indigo-200 dark:ring-indigo-800",
          avatarBg: "from-indigo-600 via-purple-600 to-pink-600",
        };
    }
  };

  const roleMeta = getRoleMeta();
  const displayName = user?.name || (
    role === "admin" ? "Administrator" :
    role === "teacher" ? "Faculty Member" :
    role === "employee" ? "Staff Officer" :
    "Student"
  );
  const displayEmail = user?.email || "";
  const initial = (displayName.trim().charAt(0) || "U").toUpperCase();
  const userPhoto = user?.image || dbProfile?.image || null;

  return (
    <>
      {/* Top Edge Screen Liquid Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-slate-900/5 dark:bg-white/5 backdrop-blur-sm">
        <motion.div 
          className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.7)]"
          style={{ width }}
        />
      </div>

      <header className="gsap-nav fixed top-6 left-4 right-4 md:left-8 md:right-8 lg:left-12 lg:right-12 max-w-[1500px] mx-auto z-50 flex items-center justify-between px-5 sm:px-8 py-3.5 sm:py-4 rounded-[2.5rem] bg-white/80 dark:bg-slate-900/85 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[0_10px_40px_rgb(0,0,0,0.06),0_4px_15px_rgb(79,70,229,0.05)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-colors duration-300">
        <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
          {/* Logo Icon */}
          <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-900/40 transition-transform group-hover:scale-105">
            <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
          </div>
          {/* Logo Text */}
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">CSE</span>
              <div className="h-2 w-2 rounded-full bg-indigo-500" />
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.08em] text-slate-600 dark:text-slate-300 uppercase leading-tight mt-0.5">
              Computer Science & Engineering
            </span>
            <span className="hidden sm:inline text-[8px] sm:text-[8.5px] font-semibold tracking-[0.1em] text-slate-400 dark:text-slate-400 uppercase leading-tight mt-0.5">
              Pabna University of Science & Technology
            </span>
          </div>
        </Link>

        {/* Nav Links & CTA */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Desktop Navigation Capsule */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 mr-1 shadow-inner">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.targetId;
              return (
                <a
                  key={item.targetId}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-300 font-bold bg-white dark:bg-slate-900/90 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-700/40"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-400"}`} />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
          
          {/* Dark / Light Mode Toggle Button */}
          <ThemeToggle />

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Authentication State Display */}
          {isPending ? (
            // Subtle loading skeleton
            <div className="h-10 w-24 sm:w-28 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 animate-pulse" />
          ) : user ? (
            // LOGGED-IN: Dashboard Button + Interactive Profile Dropdown
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Go to Dashboard CTA */}
              <Link
                href={getDashboardPath()}
                className="inline-flex items-center gap-2 font-bold text-xs sm:text-sm tracking-wide text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-200/50 dark:shadow-indigo-950/40 px-3 sm:px-4.5 h-9 sm:h-10.5 rounded-xl transition-all hover:scale-105 active:scale-95 group"
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-100 transition-transform group-hover:rotate-12" />
                <span className="hidden sm:inline">{getDashboardLabel()}</span>
                <span className="sm:hidden">Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-80 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>

              {/* Profile Dropdown Container */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-expanded={isDropdownOpen}
                  aria-label="User profile and settings"
                  className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 rounded-full sm:rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-all cursor-pointer group shadow-xs"
                >
                  {/* Avatar Icon */}
                  <div className={`flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-full bg-gradient-to-br ${roleMeta.avatarBg} text-white font-bold text-xs shadow-sm ring-2 ring-white dark:ring-slate-900 overflow-hidden shrink-0`}>
                    {userPhoto ? (
                      <img src={userPhoto} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      initial
                    )}
                  </div>
                  {/* Name and Role Label (Desktop) */}
                  <div className="hidden md:flex flex-col text-left mr-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[110px] leading-tight">
                      {displayName}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 leading-tight">
                      {roleMeta.label}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform duration-200 ${isDropdownOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""}`} />
                </button>

                {/* Dropdown Menu Card */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-3 w-[calc(100vw-2rem)] sm:w-88 max-w-sm rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)] p-4 sm:p-5 z-[70] text-slate-800 dark:text-slate-100"
                    >
                      {/* User Header Section */}
                      <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-white/10">
                        <div className="relative">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${roleMeta.avatarBg} text-white font-extrabold text-lg shadow-md ring-2 ring-white dark:ring-slate-800 overflow-hidden shrink-0`}>
                            {userPhoto ? (
                              <img src={userPhoto} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" title="Active" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {displayName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {displayEmail}
                          </span>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ${roleMeta.badgeClass}`}>
                              {roleMeta.label}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md ring-1 ring-emerald-200 dark:ring-emerald-900/50">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Profile Details Grid */}
                      <div className="py-3.5 my-1 space-y-2 border-b border-slate-100 dark:border-white/10">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                          Account Profile
                        </span>
                        
                        {role === "student" && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Student ID</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                {dbProfile?.studentId || "Verified"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Semester</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 truncate block mt-0.5">
                                {dbProfile?.semester ? `${dbProfile.semester}${isNaN(dbProfile.semester) ? "" : "th"} Sem` : "Enrolled"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Batch</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                {dbProfile?.batch ? `Batch ${dbProfile.batch}` : "CSE Dept"}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                              <span className="text-[10px] text-slate-400 dark:text-slate-400 block font-medium">Academic Session</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                                {dbProfile?.session || "2023-2024"}
                              </span>
                            </div>
                          </div>
                        )}

                        {role === "teacher" && (
                          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs">
                            <span className="text-[10px] text-slate-400 block font-medium">Designation & Department</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                              {dbProfile?.designation || "Faculty Member"} • Dept of CSE
                            </span>
                          </div>
                        )}

                        {role === "employee" && (
                          <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 text-xs">
                            <span className="text-[10px] text-slate-400 block font-medium">Office / Department</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                              Staff Operations • Dept of CSE
                            </span>
                          </div>
                        )}

                        {role === "admin" && (
                          <div className="p-2.5 rounded-xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/30 text-xs">
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-semibold">System Privileges</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
                              Master Administrator • Full Access
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Links */}
                      <div className="pt-2 space-y-1.5">
                        <Link
                          href={getDashboardPath()}
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200/50 dark:shadow-indigo-950/40 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Go to {getDashboardLabel()}</span>
                          </div>
                          <ArrowRight className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="flex items-center gap-2.5 w-full px-3.5 py-2 rounded-xl font-semibold text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            // LOGGED-OUT: Clean "Sign In" Button
            <Link
              href="/login"
              className="inline-flex items-center justify-center font-bold text-xs sm:text-sm tracking-wide text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 dark:shadow-indigo-900/30 px-5 sm:px-7 h-10 sm:h-11 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Navigation Dropdown Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed top-24 left-4 right-4 z-50 p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl border border-slate-200/80 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] max-w-lg mx-auto"
          >
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase px-3 py-1">
                Explore Department Portal
              </span>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.targetId;
                return (
                  <a
                    key={item.targetId}
                    href={item.href}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${isActive ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span>{item.label}</span>
                      <span className="text-[11px] font-normal text-slate-400 dark:text-slate-400">{item.description}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

