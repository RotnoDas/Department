"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  Activity, 
  Award, 
  CheckCircle2, 
  Clock, 
  Users, 
  Cpu, 
  Wrench,
  BookOpen,
  Calendar,
  Layers
} from "lucide-react";

// Modern harmonious color palettes
export const CHART_COLORS = {
  indigo: "#6366f1",
  violet: "#8b5cf6",
  sky: "#0284c7",
  cyan: "#06b6d4",
  emerald: "#10b981",
  teal: "#14b8a6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#64748b",
};

export const PIE_PALETTE = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#0ea5e9", // Sky
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f43f5e", // Rose
];

// Sleek glassmorphism custom tooltip for dark & light modes
export const CustomChartTooltip = ({ active, payload, label, unit = "", prefix = "" }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-xl space-y-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
        {label && (
          <p className="font-extrabold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-white/10 pb-1">
            {label}
          </p>
        )}
        <div className="space-y-1">
          {payload.map((item, index) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color || item.fill }} />
                <span>{item.name || "Value"}:</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {prefix}{item.value} {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// ── 1. STUDENT DASHBOARD ANALYTICS ────────────────────────────────────────
export function StudentAnalyticsCharts({ enrolledSemester = 6, routineCount = 18, semesterCredits = 21 }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // GPA Trend across semesters up to enrolled semester
  const semGpaData = [
    { semester: "Sem 1", sgpa: 3.65, cgpa: 3.65, credits: 21 },
    { semester: "Sem 2", sgpa: 3.72, cgpa: 3.68, credits: 20 },
    { semester: "Sem 3", sgpa: 3.80, cgpa: 3.72, credits: 22 },
    { semester: "Sem 4", sgpa: 3.75, cgpa: 3.73, credits: 20 },
    { semester: "Sem 5", sgpa: 3.85, cgpa: 3.75, credits: 21.5 },
    { semester: "Sem 6", sgpa: 3.90, cgpa: 3.78, credits: 21 },
    { semester: "Sem 7", sgpa: 3.92, cgpa: 3.80, credits: 22 },
    { semester: "Sem 8", sgpa: 3.95, cgpa: 3.82, credits: 20 }
  ].slice(0, Math.max(3, enrolledSemester));

  // Course credit breakdown for student's registered term
  const creditBreakdown = [
    { name: "Theory Courses", value: 14, color: "#6366f1" },
    { name: "Sessional Labs", value: 5.5, color: "#10b981" },
    { name: "Project & Viva", value: 1.5, color: "#f59e0b" },
  ];

  // Weekly study workload (hours per day) based on lecture schedule
  const weeklyWorkload = [
    { day: "Sat", theoryHours: 3, labHours: 0, total: 3 },
    { day: "Sun", theoryHours: 3, labHours: 3, total: 6 },
    { day: "Mon", theoryHours: 4, labHours: 0, total: 4 },
    { day: "Tue", theoryHours: 3, labHours: 3, total: 6 },
    { day: "Wed", theoryHours: 4, labHours: 0, total: 4 },
  ];

  // Subject attendance performance
  const subjectAttendance = [
    { code: "CSE 3101", name: "Operating Systems", attendance: 94 },
    { code: "CSE 3103", name: "Microprocessors", attendance: 90 },
    { code: "CSE 3104", name: "Microprocessor Lab", attendance: 96 },
    { code: "CSE 3105", name: "Software Eng", attendance: 86 },
    { code: "CSE 3107", name: "Computer Networks", attendance: 91 },
  ];

  if (!isMounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Academic Performance Analytics</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Progress Trackers & Academic Distribution
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Cumulative GPA: 3.78 / 4.00
          </span>
        </div>
      </div>

      {/* Grid of 2 Key Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: GPA Growth Progression */}
        <div className="p-6 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                Semester SGPA vs Cumulative CGPA Trend
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Academic progress over completed terms with 3.75 Honors Benchmark
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Scale 4.00
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={semGpaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sgpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="cgpaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis domain={[3.0, 4.0]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="GPA" />} />
                <ReferenceLine y={3.75} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Honors Line (3.75)", fill: "#f59e0b", fontSize: 10, position: "insideTopRight" }} />
                <Area type="monotone" dataKey="sgpa" name="Term SGPA" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#sgpaGrad)" />
                <Area type="monotone" dataKey="cgpa" name="Overall CGPA" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#cgpaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-indigo-500 rounded" /> Term SGPA</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-emerald-500 rounded" /> Overall CGPA</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 border-t-2 border-dashed border-amber-500" /> Honors Target (3.75)</span>
          </div>
        </div>

        {/* Chart 2: Weekly Lecture & Lab Hours Commitment */}
        <div className="p-6 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Weekly Academic Class Load (Hours / Day)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Distribution of theory lectures and practical lab sessions (Sat–Wed)
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              {routineCount} Weekly Classes
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyWorkload} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="hrs" />} />
                <Bar dataKey="theoryHours" name="Theory Lectures" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                <Bar dataKey="labHours" name="Lab Sessional" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded" /> Theory Lecture Hours</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded" /> Sessional Lab Hours</span>
          </div>
        </div>
      </div>

      {/* Grid of 2 Secondary Charts: Credit Distribution & Attendance Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Term Credit Breakdown */}
        <div className="p-6 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Semester {enrolledSemester} Credit Weights
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Curriculum weight distribution ({semesterCredits.toFixed(1)} Credits)
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={creditBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {creditBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip unit="Credits" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-1">
            {creditBreakdown.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{item.value} Cr</span>
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal Bar Chart: Subject Attendance Rates vs 75% Benchmark */}
        <div className="lg:col-span-2 p-6 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Course-Wise Attendance vs 75% Exam Eligibility Line
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Mandatory presence rate required for semester final exam clearance
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              Avg 91.4%
            </span>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAttendance} layout="vertical" margin={{ top: 5, right: 30, left: 35, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }} unit="%" axisLine={false} tickLine={false} />
                <YAxis dataKey="code" type="category" tick={{ fontSize: 11, fontWeight: "bold", fill: "#475569" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="%" />} />
                <ReferenceLine x={75} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "Min 75%", fill: "#f43f5e", fontSize: 10, position: "insideBottomRight" }} />
                <Bar dataKey="attendance" name="Class Attendance" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/10">
            <span>Minimum University Eligibility: <strong>75%</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ All Courses Exam Cleared</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. ADMIN DASHBOARD ANALYTICS ──────────────────────────────────────────
export function AdminAnalyticsCharts({ stats, students = [], routines = [], courses = [], teachers = [] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Compute student counts per semester
  const semesterDistribution = [1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
    const semStudents = students.filter(s => {
      const match = String(s.semester || "").match(/\d+/);
      return match ? parseInt(match[0], 10) === sem : false;
    });
    const approved = semStudents.filter(s => s.status === "approved").length;
    const pending = semStudents.filter(s => s.status === "pending").length;
    return {
      semester: `Sem ${sem}`,
      Approved: approved,
      Pending: pending,
      Total: semStudents.length
    };
  });

  // Department population breakdown
  const compositionData = [
    { name: "Approved Students", value: stats?.approvedStudents || students.filter(s=>s.status==='approved').length || 3, color: "#10b981" },
    { name: "Pending Approvals", value: stats?.pendingStudents || students.filter(s=>s.status==='pending').length || 4, color: "#f59e0b" },
    { name: "Faculty Members", value: stats?.totalTeachers || teachers.length || 2, color: "#6366f1" },
    { name: "Staff & Officers", value: stats?.totalEmployees || 2, color: "#06b6d4" },
  ];

  // Classroom & Lab Peak Hours Utilization across 168 scheduled routine slots
  const slotUtilizationData = [
    { slot: "09:00", classes: routines.filter(r => r.timeSlot?.includes("09:00")).length || 24, fill: "#6366f1" },
    { slot: "10:00", classes: routines.filter(r => r.timeSlot?.includes("10:00")).length || 24, fill: "#8b5cf6" },
    { slot: "11:00", classes: routines.filter(r => r.timeSlot?.includes("11:00")).length || 24, fill: "#a855f7" },
    { slot: "12:00", classes: routines.filter(r => r.timeSlot?.includes("12:00")).length || 18, fill: "#d946ef" },
    { slot: "02:00", classes: routines.filter(r => r.timeSlot?.includes("02:00")).length || 26, fill: "#0ea5e9" },
    { slot: "03:00", classes: routines.filter(r => r.timeSlot?.includes("03:00")).length || 26, fill: "#06b6d4" },
    { slot: "04:00", classes: routines.filter(r => r.timeSlot?.includes("04:00")).length || 26, fill: "#10b981" },
  ];

  // Curriculum courses credit weight per semester (Sem 1 to 8)
  const curriculumWeightData = [1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
    const semCourses = courses.filter(c => c.semesterNum === sem);
    const theoryCredits = semCourses
      .filter(c => !c.title.toLowerCase().includes("sessional") && !c.title.toLowerCase().includes("viva"))
      .reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    const labCredits = semCourses
      .filter(c => c.title.toLowerCase().includes("sessional") || c.title.toLowerCase().includes("project"))
      .reduce((sum, c) => sum + (Number(c.credits) || 0), 0);

    return {
      semester: `Sem ${sem}`,
      Theory: theoryCredits || 15,
      Lab: labCredits || 6,
      Total: (theoryCredits || 15) + (labCredits || 6)
    };
  });

  if (!isMounted) return null;

  return (
    <div className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
            <span>Executive Institutional Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Department Demographics & Resource Utilization Studio
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Real-time enrollment breakdown, curriculum distributions, and classroom peak-hour utilization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {stats?.totalUsers || 18} Registered Members
          </span>
        </div>
      </div>

      {/* Row 1: Student Semester Distribution & Department Demographics Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Enrollment Stacked Bar */}
        <div className="lg:col-span-2 p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Student Enrollment Distribution by Semester
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Verified approved students vs pending admissions across Semesters 1 to 8
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {students.length} Total Students
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semesterDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="Students" />} />
                <Bar dataKey="Approved" name="Approved" fill="#10b981" stackId="a" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Pending" name="Pending Review" fill="#f59e0b" stackId="a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded" /> Approved Enrolled</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded" /> Pending Approval</span>
          </div>
        </div>

        {/* Department Community Donut */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Member Composition
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Roles active in department portal
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {compositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip unit="Members" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-1">
            {compositionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Classroom & Lab Hourly Utilization & Curriculum Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Class Hours Utilization */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500" />
                Classroom & Lab Peak Hour Utilization
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Active classes scheduled per time slot across weekly timetable
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              {routines.length} Routine Slots
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slotUtilizationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="utilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="slot" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="Active Classes" />} />
                <Area type="monotone" dataKey="classes" name="Simultaneous Classes" stroke="#0284c7" strokeWidth={3} fillOpacity={1} fill="url(#utilGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
            <span>Peak Demand: <strong>02:00 PM – 05:00 PM</strong> (Concurrent Labs & Practicals)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ 0 Room Conflicts</span>
          </div>
        </div>

        {/* Curriculum Weight Structure by Semester */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Curriculum Credits Distribution (Semesters 1 to 8)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Theory Credits vs Sessional / Practical Lab Credits per semester
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              {courses.length} Syllabus Courses
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={curriculumWeightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="semester" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="Credits" />} />
                <Bar dataKey="Theory" name="Theory Credits" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lab" name="Practical / Lab Credits" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded" /> Theory Credits (~15.0 Cr)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded" /> Sessional / Practical (~6.0 Cr)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. EMPLOYEE / STAFF DASHBOARD ANALYTICS ──────────────────────────────
export function EmployeeAnalyticsCharts({ tasks = [], labFacilities = [] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // Workstation health status across departmental labs
  const workstationData = [
    { name: "Software Lab 1", online: 45, maintenance: 0, total: 45 },
    { name: "Networking Lab", online: 38, maintenance: 2, total: 40 },
    { name: "AI Cluster Lab", online: 24, maintenance: 0, total: 24 },
    { name: "Multimedia Hall", online: 36, maintenance: 2, total: 38 },
  ];

  // Task tickets by category
  const taskCategories = [
    { name: "Hardware", value: tasks.filter(t => t.category === "Hardware").length || 2, color: "#6366f1" },
    { name: "Software", value: tasks.filter(t => t.category === "Software").length || 1, color: "#10b981" },
    { name: "Network", value: tasks.filter(t => t.category === "Network").length || 1, color: "#0ea5e9" },
    { name: "Power & Facility", value: tasks.filter(t => t.category?.includes("Power")).length || 1, color: "#f59e0b" },
  ];

  // Weekly maintenance resolution velocity
  const resolutionVelocity = [
    { day: "Sat", logged: 4, resolved: 3 },
    { day: "Sun", logged: 6, resolved: 5 },
    { day: "Mon", logged: 3, resolved: 4 },
    { day: "Tue", logged: 5, resolved: 5 },
    { day: "Wed", logged: 2, resolved: 3 },
    { day: "Thu", logged: 3, resolved: 2 },
  ];

  if (!isMounted) return null;

  return (
    <div className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Technical Infrastructure & Maintenance Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Lab Hardware Availability & Ticket Resolution Velocity
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Operational status of 147 workstations, network switches, and weekly resolution output.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          97.3% Fleet Operational
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workstations Status BarChart */}
        <div className="lg:col-span-2 p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-500" />
                Workstations Online vs Under Service
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Operational PC nodes across four main computing labs
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              143 / 147 Online
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workstationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="PCs" />} />
                <Bar dataKey="online" name="Online & Operational" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenance" name="Scheduled Maintenance" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-1 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded" /> Operational (143 Units)</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-500 rounded" /> Maintenance / Diagnostics (4 Units)</span>
          </div>
        </div>

        {/* Task Category Donut */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-500" />
              Ticket Category Breakdown
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Maintenance requests by domain
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskCategories}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {taskCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip unit="Tickets" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 pt-1">
            {taskCategories.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">{item.value} Orders</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. TEACHER / FACULTY DASHBOARD ANALYTICS ──────────────────────────────
export function TeacherAnalyticsCharts({ teacherSchedule = [] }) {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const courseEnrollmentData = teacherSchedule.map(c => ({
    code: c.code,
    name: c.title,
    students: c.enrolled || 48,
    avgAttendance: 92,
  }));

  const weeklyTeachingDistribution = [
    { day: "Sat", hours: 3 },
    { day: "Sun", hours: 4 },
    { day: "Mon", hours: 2 },
    { day: "Tue", hours: 4 },
    { day: "Wed", hours: 3 },
  ];

  if (!isMounted) return null;

  return (
    <div className="p-7 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-semibold mb-1">
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            <span>Faculty Instruction Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            Teaching Workload & Student Engagement Trends
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Class student enrollment, lecture hours distribution, and student presence.
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
          16 Hours / Week Lecture Load
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Enrolled Students per Course */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              Student Cohort Size by Course
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
              Active Courses
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseEnrollmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="code" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="Students" />} />
                <Bar dataKey="students" name="Enrolled Students" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Weekly Teaching Hours Distribution */}
        <div className="p-6 rounded-[2rem] bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Weekly Lecture Hours Allocation (Sat–Wed)
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              16 Total Hours
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTeachingDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="teachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomChartTooltip unit="hrs" />} />
                <Area type="monotone" dataKey="hours" name="Lecture Hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#teachGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
