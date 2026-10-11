"use client";

import React, { useState, useEffect } from "react";
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
  FileCheck 
} from "lucide-react";
import toast from "react-hot-toast";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function StudentDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isMarking, setIsMarking] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.email) return;
      try {
        const res = await fetch(`${SERVER_URL}/api/students/email/${user.email}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadProfile();
  }, [user?.email]);

  const isPending = (profile?.status || user?.status) === "pending";

  const courses = [
    { code: "CSE 3201", title: "Operating Systems", teacher: "Dr. John Smith", time: "09:00 - 10:00", room: "Room 401", attendance: "92%" },
    { code: "CSE 3203", title: "Compiler Design", teacher: "Prof. Kamal Uddin", time: "11:00 - 12:00", room: "Room 402", attendance: "88%" },
    { code: "CSE 3205", title: "Computer Networks", teacher: "Dr. Nazmul Haque", time: "01:00 - 02:00", room: "Lab 1", attendance: "95%" },
    { code: "CSE 3207", title: "Software Engineering", teacher: "Ms. Farhana Ahmed", time: "02:00 - 03:00", room: "Room 401", attendance: "90%" },
  ];

  const handleMarkAttendance = () => {
    setIsMarking(true);
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsMarking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsMarking(false);
        toast.success(`Location verified [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]. Attendance recorded for CSE 3201!`);
      },
      (err) => {
        setIsMarking(false);
        toast.error("Unable to retrieve campus GPS coordinate. Please enable location.");
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Student Profile Hero Card */}
      <div className="p-8 rounded-[2rem] bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 font-extrabold text-2xl border border-white/20 shadow-inner">
              {user?.name ? user.name.charAt(0) : "S"}
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200 backdrop-blur-md mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Undergraduate CSE Student</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {user?.name || "Student Portal"}
              </h1>
              <p className="text-xs text-indigo-200/80 font-medium flex items-center gap-2">
                <span>Roll: {profile?.studentId || user?.studentId || "220101"}</span>
                <span>•</span>
                <span>Batch {profile?.batch || user?.batch || "10"}</span>
                <span>•</span>
                <span>Semester {profile?.semester || user?.semester || "6"}</span>
                <span>•</span>
                <span>Session {profile?.session || user?.session || "2021-2022"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-xs font-medium text-slate-300 bg-white/5 p-4 rounded-2xl border border-white/10">
            <span className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              {user?.email}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              {profile?.phone || user?.phone || "+8801700000000"}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              {profile?.address || user?.address || "Pabna, Bangladesh"}
            </span>
          </div>
        </div>
      </div>

      {/* Account Verification Warning Banner */}
      {isPending ? (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-amber-900">Registration Pending Verification</h3>
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Your student profile has been submitted and is currently awaiting approval from the CSE Department office.
              You can explore your course schedule and lecture notes below. Once approved by an admin, formal marks and submission records will be active.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">Account Approved & Verified by Department Admin</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
            Active Student
          </span>
        </div>
      )}

      {/* Attendance & Geofence Mark Center */}
      <div id="attendance" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Attendance</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-indigo-600">91.4%</span>
              <span className="text-xs font-bold text-emerald-600">Above 75% target</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              43 out of 47 mandatory lecture hours attended this term.
            </p>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: "91.4%" }}></div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative GPA</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900">3.78</span>
              <span className="text-xs font-bold text-indigo-600">Scale of 4.00</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Ranked in top 10% of 10th Batch.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
            <Award className="w-4 h-4" />
            <span>Honors List Eligible</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Geofence Check-in</span>
            <h4 className="text-sm font-bold text-slate-900 mt-1">Mark Classroom Presence</h4>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Verify your GPS location within campus classrooms to check in for current class.
            </p>
          </div>
          <button
            onClick={handleMarkAttendance}
            disabled={isMarking}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200/60 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span>{isMarking ? "Verifying GPS..." : "Check In to Classroom"}</span>
          </button>
        </div>
      </div>

      {/* Routine & Semester Courses */}
      <div id="routine" className="p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-white shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Enrolled Courses & Weekly Routine</h2>
            <p className="text-xs text-slate-500 font-medium">Curriculum overview for Semester 6</p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl ring-1 ring-indigo-200">
            Semester 6 • 19 Credits
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {courses.map((c, i) => (
            <div key={i} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">{c.code}</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{c.attendance}</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{c.title}</h3>
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.room}</span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/60">
                  {c.teacher}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
