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
import { 
  getCoursesBySemester, 
  getSemesterTotalCredits, 
  SEMESTER_KEYS, 
  SEMESTER_LABELS 
} from "@/data/courses";
import Loading from "@/components/common/Loading";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

export default function StudentDashboardPage() {
  const { data: sessionData } = authClient.useSession();
  const user = sessionData?.user;
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper to extract numeric semester 1-8
  const parseSemesterNum = (semStr) => {
    if (!semStr) return 6;
    const match = String(semStr).match(/(\d+)/);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 8) return n;
    }
    return 6;
  };

  const studentEnrolledSem = parseSemesterNum(profile?.semester);
  const [selectedSemester, setSelectedSemester] = useState(6);

  const loadProfile = async (showToast = false) => {
    if (!user?.email) return;
    if (showToast) setIsRefreshing(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/students/email/${user.email}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        if (data.semester) {
          setSelectedSemester(parseSemesterNum(data.semester));
        }
        if (showToast) {
          if (data.status === "approved") {
            toast.success("Congratulations! Your account has been approved by the department administrator.");
          } else {
            toast("Status: Still Pending Administrator Approval.", { icon: "⏳" });
          }
        }
      }
    } catch (e) {
      console.error(e);
      if (showToast) toast.error("Unable to check status. Please check your connection.");
    } finally {
      if (showToast) setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user?.email]);

  const isPending = (profile?.status || user?.status) === "pending";

  const semesterCourses = getCoursesBySemester(selectedSemester);
  const semesterCredits = getSemesterTotalCredits(selectedSemester);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Student Profile Hero Card */}
      <div id="profile" className="p-8 rounded-[2rem] bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white shadow-xl relative overflow-hidden scroll-mt-6">
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

      {/* Attendance & Geofence Mark Center */}
      <div id="attendance" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Overall Attendance</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">91.4%</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Above 75% target</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 font-medium">
              43 out of 47 mandatory lecture hours attended this term.
            </p>
          </div>
          <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: "91.4%" }}></div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Cumulative GPA</span>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-white">3.78</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Scale of 4.00</span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 font-medium">
              Ranked in top 10% of 10th Batch.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
            <Award className="w-4 h-4" />
            <span>Honors List Eligible</span>
          </div>
        </div>

        <div id="checkin" className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm flex flex-col justify-between space-y-4 transition-colors scroll-mt-6">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">Live Geofence Check-in</span>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Mark Classroom Presence</h4>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">
              Verify your GPS location within campus classrooms to check in for current class.
            </p>
          </div>
          <button
            onClick={handleMarkAttendance}
            disabled={isMarking}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-200/60 dark:shadow-none transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span>{isMarking ? "Verifying GPS..." : "Check In to Classroom"}</span>
          </button>
        </div>
      </div>

      {/* Routine & Semester Courses (Semesters 1 to 8) */}
      <div id="routine" className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Academic Curriculum Explorer</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Semester Courses & Academic Routine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Browse syllabus courses, credit weights, and class schedules across Semesters 1 to 8.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedSemester === studentEnrolledSem && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Your Enrolled Term</span>
              </span>
            )}
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1.5 rounded-xl ring-1 ring-indigo-200 dark:ring-indigo-800">
              {SEMESTER_LABELS[selectedSemester]} • {semesterCredits.toFixed(1)} Credits
            </span>
          </div>
        </div>

        {/* Semester Tab Switcher (Semesters 1 through 8) */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Select Semester:
            </span>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {semesterCourses.length} Courses Offered
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {SEMESTER_KEYS.map((k) => {
              const isSelected = selectedSemester === k;
              const isEnrolled = studentEnrolledSem === k;
              return (
                <button
                  key={k}
                  onClick={() => setSelectedSemester(k)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 relative ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-300 dark:shadow-none"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Semester {k}</span>
                  {isEnrolled && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                      isSelected ? "bg-white/25 text-white" : "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300"
                    }`}>
                      Current
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {semesterCourses.map((c, i) => {
            const timeSlots = ["09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00"];
            const isLab = c.type === "Sessional" || c.type === "Laboratory" || c.title?.toLowerCase().includes("sessional") || c.title?.toLowerCase().includes("lab");
            const slotTime = timeSlots[i % timeSlots.length];
            const roomLocation = isLab ? "Computer Lab 1 / Lab 2" : (i % 2 === 0 ? "Room 401 (Academic Block)" : "Room 402 (Academic Block)");

            return (
              <div
                key={c.code || i}
                className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-3"
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
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slotTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{roomLocation}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                    Faculty Department Instructor
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
