"use client";

import React, { useState, useEffect } from "react";
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
  Layers 
} from "lucide-react";
import toast from "react-hot-toast";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function TeacherDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      try {
        const res = await fetch(`${SERVER_URL}/api/teachers/email/${user.email}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user?.email]);

  const teacherSchedule = [
    { code: "CSE 3201", title: "Operating Systems", room: "Room 401", time: "09:00 - 10:00", semester: "6th Semester", enrolled: 48 },
    { code: "CSE 3203", title: "Compiler Design", room: "Room 402", time: "11:00 - 12:00", semester: "6th Semester", enrolled: 52 },
    { code: "CSE 4101", title: "Distributed Systems", room: "Lab 2", time: "02:00 - 04:00", semester: "7th Semester", enrolled: 45 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Faculty Profile Hero Card */}
      <div className="p-8 rounded-[2rem] bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-sky-300 font-extrabold text-2xl border border-white/20 shadow-inner">
              {user?.name ? user.name.charAt(0) : "T"}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200 backdrop-blur-md mb-1">
                <Presentation className="w-3.5 h-3.5 text-sky-400" />
                <span>{profile?.designation || user?.designation || "Faculty Member"}</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {user?.name || "Faculty Portal"}
              </h1>
              <p className="text-xs text-sky-200/80 font-medium flex items-center gap-2">
                <span>ID: {profile?.teacherId || user?.teacherId || "T-101"}</span>
                <span>•</span>
                <span>Specialization: {profile?.specialization || user?.specialization || "Computer Science & Engineering"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              Office: {profile?.officeRoom || user?.officeRoom || "Academic Bldg 2, Room 402"}
            </span>
            <span className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-sky-400" />
              {user?.email}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-sky-400" />
              {profile?.phone || user?.phone || "+8801700000000"}
            </span>
          </div>
        </div>
      </div>

      {/* Routine & Today's Classes */}
      <div id="routine" className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Today's Class Schedule</h2>
            <p className="text-xs text-slate-500 font-medium">Courses assigned for your faculty instruction</p>
          </div>
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-xl ring-1 ring-sky-200">
            3 Lectures Scheduled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {teacherSchedule.map((cls, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-sky-300 transition-all space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">{cls.code}</span>
                  <h3 className="font-bold text-slate-900 text-base">{cls.title}</h3>
                </div>
                <div className="h-8 w-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Time Slot:</span>
                  <span className="font-semibold text-slate-800">{cls.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Classroom:</span>
                  <span className="font-semibold text-slate-800">{cls.room}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Target Class:</span>
                  <span className="font-semibold text-slate-800">{cls.semester}</span>
                </div>
              </div>

              <button 
                onClick={() => toast.success(`Attendance session active for ${cls.code}`)}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-200/60 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Attendance Session</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Materials & Assignment Center */}
      <div id="materials" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Published Study Materials</span>
            </h3>
            <button 
              onClick={() => toast.success("Upload modal will open")}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              + Upload Material
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: "Module 1 - Process Management & Threads", course: "CSE 3201", type: "PDF (2.4 MB)", date: "Yesterday" },
              { title: "Lexical Analysis & Syntax Trees", course: "CSE 3203", type: "Slides (5.1 MB)", date: "3 days ago" },
              { title: "CAP Theorem and Consensus Protocols", course: "CSE 4101", type: "Notes (1.2 MB)", date: "Oct 5, 2026" },
            ].map((mat, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{mat.title}</div>
                  <div className="text-slate-400">{mat.course} • {mat.type}</div>
                </div>
                <span className="text-slate-400 font-medium">{mat.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div id="attendance" className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <span>Attendance History</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
              94% Average Presence
            </span>
          </div>
          <div className="space-y-3">
            {[
              { course: "CSE 3201", date: "Today, 09:00 AM", present: 45, absent: 3, percentage: "93.7%" },
              { course: "CSE 3203", date: "Oct 10, 11:00 AM", present: 49, absent: 3, percentage: "94.2%" },
              { course: "CSE 4101", date: "Oct 08, 02:00 PM", present: 43, absent: 2, percentage: "95.5%" },
            ].map((att, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-800">{att.course} Attendance</div>
                  <div className="text-slate-400">{att.date} • {att.present} Present, {att.absent} Absent</div>
                </div>
                <span className="font-bold text-emerald-600 text-sm">{att.percentage}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
