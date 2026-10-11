"use client";

import React from "react";
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
  X
} from "lucide-react";

export function DashboardSidebar({ isOpen, setIsOpen, user, profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = user?.role || "student";

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Define navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case "admin":
        return [
          { name: "Overview", href: "/dashboard/admin", icon: LayoutDashboard },
          { name: "Pending Approvals", href: "/dashboard/admin#pending", icon: UserCheck },
          { name: "Curriculum & Courses", href: "/dashboard/admin#courses", icon: BookOpen },
          { name: "Notice Dispatcher", href: "/dashboard/admin#notices", icon: Bell },
          { name: "Student Directory", href: "/dashboard/admin#students", icon: GraduationCap },
          { name: "Faculty & Staff", href: "/dashboard/admin#directory", icon: Users },
        ];
      case "teacher":
        return [
          { name: "Faculty Hub", href: "/dashboard/teacher", icon: LayoutDashboard },
          { name: "My Schedule", href: "/dashboard/teacher#routine", icon: Clock },
          { name: "Attendance Sessions", href: "/dashboard/teacher#attendance", icon: UserCheck },
          { name: "Course Materials", href: "/dashboard/teacher#materials", icon: BookOpen },
        ];
      case "employee":
        return [
          { name: "Staff Desk", href: "/dashboard/employee", icon: LayoutDashboard },
          { name: "My Profile", href: "/dashboard/employee#profile", icon: Briefcase },
          { name: "Section Tasks", href: "/dashboard/employee#tasks", icon: Layers },
          { name: "Notices & Logs", href: "/dashboard/employee#notices", icon: Bell },
        ];
      case "student":
      default:
        return [
          { name: "Student Portal", href: "/dashboard/student", icon: LayoutDashboard },
          { name: "Academic Profile", href: "/dashboard/student#profile", icon: GraduationCap },
          { name: "Attendance & Roll", href: "/dashboard/student#attendance", icon: UserCheck },
          { name: "Class Routine", href: "/dashboard/student#routine", icon: Clock },
        ];
    }
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    switch (role) {
      case "admin":
        return { label: "Department Admin", bg: "bg-purple-50 text-purple-700 ring-purple-200" };
      case "teacher":
        return { label: "Faculty Member", bg: "bg-sky-50 text-sky-700 ring-sky-200" };
      case "employee":
        return { label: "Staff / Officer", bg: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
      case "student":
      default:
        return { label: "Student", bg: "bg-indigo-50 text-indigo-700 ring-indigo-200" };
    }
  };

  const badge = getRoleBadge();

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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white font-bold text-sm shadow-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {user?.name || "User"}
                </span>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate">
                  {user?.email}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-200/50 dark:border-slate-700/50">
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md ring-1 ${badge.bg}`}>
                {badge.label}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                user?.status === "approved" 
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400" 
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
              }`}>
                {user?.status === "approved" ? "Verified" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href.includes("#") && pathname.startsWith(item.href.split("#")[0]));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${isActive 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/60 dark:shadow-indigo-900/40" 
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400 dark:text-slate-400"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
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
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main Site</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl font-medium text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
