"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
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
  X
} from "lucide-react";

export function DashboardSidebar({ isOpen, setIsOpen, user, profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentHash(window.location.hash);
      const handleHashChange = () => setCurrentHash(window.location.hash);
      window.addEventListener("hashchange", handleHashChange);
      return () => window.removeEventListener("hashchange", handleHashChange);
    }
  }, []);

  // Resilient role determination:
  // 1. Current route pathname (if on /dashboard/admin, ALWAYS render admin navigation)
  // 2. User session role
  // 3. User email patterns
  const resolveRole = () => {
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
  };

  const role = resolveRole();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Define tailored navigation items strictly scoped to the active role
  const getNavItems = () => {
    switch (role) {
      case "admin":
        return [
          { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
          { name: "Institutional Analytics", href: "/dashboard/admin#analytics", icon: BarChart3 },
          { name: "Student Approvals", href: "/dashboard/admin#pending", icon: UserCheck },
          { name: "Student Directory", href: "/dashboard/admin#students", icon: GraduationCap },
          { name: "Class Routine", href: "/dashboard/admin#routine", icon: Calendar },
          { name: "Curriculum Matrix (1-8)", href: "/dashboard/admin#courses", icon: BookOpen },
          { name: "Notice Dispatcher", href: "/dashboard/admin#notices", icon: Bell },
          { name: "Faculty & Staff", href: "/dashboard/admin#directory", icon: Users },
        ];
      case "teacher":
        return [
          { name: "Faculty Hub", href: "/dashboard/teacher", icon: LayoutDashboard },
          { name: "Teaching Analytics", href: "/dashboard/teacher#analytics", icon: BarChart3 },
          { name: "Today's Routine", href: "/dashboard/teacher#routine", icon: Clock },
          { name: "Course Materials", href: "/dashboard/teacher#materials", icon: BookOpen },
          { name: "Attendance Sessions", href: "/dashboard/teacher#attendance", icon: UserCheck },
        ];
      case "employee":
        return [
          { name: "Staff Desk", href: "/dashboard/employee", icon: LayoutDashboard },
          { name: "Fleet & Ticket Analytics", href: "/dashboard/employee#analytics", icon: BarChart3 },
          { name: "Shift Check-in", href: "/dashboard/employee#shift", icon: Clock },
          { name: "Lab Infrastructure", href: "/dashboard/employee#inventory", icon: Layers },
          { name: "Maintenance Tasks", href: "/dashboard/employee#tasks", icon: Wrench },
        ];
      case "student":
      default:
        return [
          { name: "Student Portal", href: "/dashboard/student", icon: LayoutDashboard },
          { name: "Academic Analytics", href: "/dashboard/student#analytics", icon: BarChart3 },
          { name: "Semester Curriculum", href: "/dashboard/student#routine", icon: BookOpen },
          { name: "Geofence Check-in", href: "/dashboard/student#checkin", icon: UserCheck },
          { name: "Academic Profile", href: "/dashboard/student#profile-settings", icon: GraduationCap },
        ];
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (e, item) => {
    setIsOpen(false);
    if (item.href.includes("#")) {
      const [itemPath, hash] = item.href.split("#");
      if (pathname === itemPath) {
        e.preventDefault();
        const targetEl = document.getElementById(hash);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
          window.history.pushState(null, "", item.href);
          setCurrentHash(`#${hash}`);
        }
      }
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

  const displayName = user?.name || (
    role === "admin" ? "System Administrator" :
    role === "teacher" ? "Faculty Member" :
    role === "employee" ? "Staff Officer" :
    "Student"
  );

  const displayEmail = user?.email || (
    role === "admin" ? "admin@cse.edu" :
    role === "teacher" ? "faculty@cse.edu" :
    role === "employee" ? "staff@cse.edu" :
    "student@student.cse.edu"
  );

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
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white/85 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10
        flex flex-col justify-between transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Top Header */}
        <div className="flex flex-col p-6 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950/40">
                <GraduationCap className="h-6 w-6 transition-transform group-hover:scale-110" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-extrabold text-xl text-slate-900 dark:text-white">CSE Portal</span>
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
          <div className="mt-6 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100/80 dark:border-slate-700/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </span>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate">
                  {displayEmail}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md ring-1 ${badge.bg}`}>
                {badge.label}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                role === "admin" || role === "teacher" || role === "employee" || user?.status === "approved"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" 
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              }`}>
                {role === "admin" || role === "teacher" || role === "employee" || user?.status === "approved" ? "Active" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              {role.toUpperCase()} NAVIGATION
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
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
