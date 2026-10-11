"use client";

import React, { useState, useEffect } from "react";
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
  HardDrive
} from "lucide-react";
import toast from "react-hot-toast";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function EmployeeDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shiftLogged, setShiftLogged] = useState(false);

  // Initial maintenance tasks / work orders state
  const [tasks, setTasks] = useState([
    {
      id: "TK-101",
      title: "Software Lab 1 - Workstation GPU Drivers Update",
      category: "Software",
      location: "Room 301 (Software Lab 1)",
      priority: "High",
      status: "In Progress",
      assignedBy: "Chairman Office",
      date: "Today, 09:30 AM",
    },
    {
      id: "TK-102",
      title: "Networking Lab - Cisco 2960 Switch Port 14 Re-cabling",
      category: "Network",
      location: "Room 303 (Hardware Lab)",
      priority: "Medium",
      status: "Resolved",
      assignedBy: "Course Teacher",
      date: "Yesterday, 02:15 PM",
    },
    {
      id: "TK-103",
      title: "Smart Classroom 402 - 4K Laser Projector Lens Calibration",
      category: "Hardware",
      location: "Academic Bldg 2, Room 402",
      priority: "Low",
      status: "Pending",
      assignedBy: "Dept Secretary",
      date: "Oct 11, 2026",
    },
    {
      id: "TK-104",
      title: "Server Room - Central 10kVA UPS Battery Bank Load Test",
      category: "Power & Facility",
      location: "Server Room (Bldg 2, Rm 205)",
      priority: "High",
      status: "Resolved",
      assignedBy: "System Administrator",
      date: "Oct 10, 2026",
    },
  ]);

  // Load employee profile from backend
  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      try {
        const res = await fetch(`${SERVER_URL}/api/employees/email/${user.email}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error("Error loading employee profile:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user?.email]);

  const handleToggleTaskStatus = (taskId) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const nextStatus = t.status === "Pending" ? "In Progress" : t.status === "In Progress" ? "Resolved" : "Pending";
          toast.success(`Task ${t.id} status updated to: ${nextStatus}`);
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const handleLogShift = () => {
    setShiftLogged(true);
    toast.success("Shift duty logged successfully! Timestamp recorded with biometric sync.");
  };

  const handleNewTicket = () => {
    const title = prompt("Enter Maintenance Task / Equipment Issue Title:");
    if (!title) return;
    const location = prompt("Enter Location / Lab Name (e.g. Software Lab 2):") || "General Department";
    const newTask = {
      id: `TK-${Math.floor(100 + Math.random() * 900)}`,
      title,
      category: "Hardware",
      location,
      priority: "Medium",
      status: "Pending",
      assignedBy: user?.name || "Staff Officer",
      date: "Just now",
    };
    setTasks([newTask, ...tasks]);
    toast.success("New section ticket added successfully!");
  };

  const labFacilities = [
    {
      name: "Software Lab 1",
      room: "Room 301",
      systems: "45 / 45 PCs Online",
      status: "100% Operational",
      badgeColor: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      specs: "Intel Core i7 13th Gen, 32GB RAM, Gigabit LAN",
    },
    {
      name: "Networking & Hardware Lab",
      room: "Room 303",
      systems: "38 / 40 PCs Online",
      status: "95% Operational",
      badgeColor: "bg-indigo-50 text-indigo-700 ring-indigo-200",
      specs: "Cisco Switches, Patch Panels, Logic Analyzers",
    },
    {
      name: "AI & High Performance Lab",
      room: "Room 405",
      systems: "24 / 24 GPU Nodes",
      status: "100% Operational",
      badgeColor: "bg-purple-50 text-purple-700 ring-purple-200",
      specs: "RTX 4090 Workstations, Liquid Cooled, Linux Cluster",
    },
    {
      name: "Multimedia & Seminar Hall",
      room: "Room 501",
      systems: "Audio / Projection Suite",
      status: "Operational",
      badgeColor: "bg-sky-50 text-sky-700 ring-sky-200",
      specs: "4K Laser Projector, Smart Podium, Shure Wireless",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Employee Profile Hero Card */}
      <div id="profile" className="p-8 rounded-[2rem] bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 font-extrabold text-2xl border border-white/20 shadow-inner">
              {user?.name ? user.name.charAt(0).toUpperCase() : "E"}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-200 backdrop-blur-md mb-1">
                <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                <span>{profile?.designation || user?.designation || "Technical Officer / Staff"}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {user?.name || "Staff Member"}
              </h1>
              <p className="text-xs text-emerald-200/80 font-medium flex items-center gap-2">
                <span>Employee ID: {profile?.employeeId || user?.employeeId || "EMP-204"}</span>
                <span>•</span>
                <span>Section: {profile?.department || user?.department || "Computer Science & Engineering"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Office: Dept Admin Section, Rm 202
            </span>
            <span className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              {user?.email}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              {profile?.phone || user?.phone || "+8801700000000"}
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Joining Date: {profile?.joiningDate || user?.joiningDate || "2022-01-15"}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action & Shift Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Shift</span>
            <h4 className="text-lg font-bold text-slate-800">08:30 AM - 04:30 PM</h4>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Standard Day Duty
            </span>
          </div>
          <button
            onClick={handleLogShift}
            disabled={shiftLogged}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              shiftLogged
                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
            }`}
          >
            {shiftLogged ? "Shift Logged" : "Log Check-in"}
          </button>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitored Labs</span>
            <h4 className="text-2xl font-black text-slate-900">4 Labs</h4>
            <span className="text-[11px] text-slate-500 font-medium">147 Workstations</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Tickets</span>
            <h4 className="text-2xl font-black text-slate-900">
              {tasks.filter((t) => t.status !== "Resolved").length} Pending
            </h4>
            <span className="text-[11px] text-slate-500 font-medium">1 In Progress</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick Action</span>
            <h4 className="text-sm font-bold text-slate-800">Equipment Report</h4>
            <span className="text-[11px] text-slate-500 font-medium">Log new hardware task</span>
          </div>
          <button
            onClick={handleNewTicket}
            className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 transition-all"
            title="Create Ticket"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Lab Facilities & Workstation Live Status */}
      <div className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              Department Lab Infrastructure & Hardware Status
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Real-time monitoring of computer laboratories, server rooms, and lecture halls
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs ring-1 ring-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Normal
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {labFacilities.map((lab) => (
            <div
              key={lab.name}
              className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-indigo-200 transition-all hover:shadow-md space-y-3 group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {lab.name}
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">{lab.room}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ring-1 ${lab.badgeColor}`}>
                  {lab.status}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/50 space-y-1">
                <p className="text-xs font-semibold text-slate-700">{lab.systems}</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{lab.specs}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Tasks & Maintenance Tickets */}
      <div id="tasks" className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              Assigned Section Tasks & Maintenance Tickets
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Click any status button to toggle between Pending, In Progress, and Resolved
            </p>
          </div>
          <button
            onClick={handleNewTicket}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-slate-200"
          >
            <PlusCircle className="w-4 h-4" />
            Add Work Ticket
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-4">Ticket ID</th>
                <th className="pb-3 px-4">Task Description</th>
                <th className="pb-3 px-4">Location</th>
                <th className="pb-3 px-4">Priority</th>
                <th className="pb-3 px-4">Status (Click to Toggle)</th>
                <th className="pb-3 px-4 text-right">Reported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                    {task.id}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{task.title}</div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Category: {task.category} • Assigned By: {task.assignedBy}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600">
                    {task.location}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                      task.priority === "High"
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        : task.priority === "Medium"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleToggleTaskStatus(task.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                        task.status === "Resolved"
                          ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                          : task.status === "In Progress"
                          ? "bg-sky-100 hover:bg-sky-200 text-sky-800"
                          : "bg-amber-100 hover:bg-amber-200 text-amber-800"
                      }`}
                    >
                      {task.status === "Resolved" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : task.status === "In Progress" ? (
                        <Activity className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{task.status}</span>
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right text-slate-400 font-medium text-[11px]">
                    {task.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notices & Circulars */}
      <div id="notices" className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              Administrative Circulars & Department Notices
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Official circulars regarding staff duties, examination seating, and facility upkeep
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Examination Circular
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Oct 11, 2026</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              6th & 8th Semester Final Examination Lab Preparation
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              All technical staff are instructed to lock workstation USB ports and verify network firewalls in Software Labs 1 & 2 before upcoming semester finals.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Facility Maintenance
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Oct 09, 2026</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              Routine Campus Power Backup & Generator Test Notice
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scheduled power transfer testing will occur this Saturday between 06:00 AM - 07:30 AM. Kindly verify all server battery backups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
