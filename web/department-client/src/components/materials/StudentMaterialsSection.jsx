"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  BookOpen,
  Download,
  ExternalLink,
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Calendar,
  User,
  RefreshCw,
  FolderOpen,
  GraduationCap,
  Filter,
} from "lucide-react";
import { SEMESTER_COURSES, SEMESTER_LABELS } from "@/data/courses";

export default function StudentMaterialsSection({
  student,
  semester,
}) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("all");
  const [selectedType, setSelectedType] = useState("all");

  // Listen for custom course filter event from sidebar
  useEffect(() => {
    const handleCourseFilter = (e) => {
      if (e.detail?.courseCode) {
        setSelectedCourse(e.detail.courseCode);
      }
    };
    window.addEventListener("dashboard-filter-course", handleCourseFilter);
    return () => window.removeEventListener("dashboard-filter-course", handleCourseFilter);
  }, []);

  // Determine student's enrolled semester strictly from their registration data
  const studentSemester = useMemo(() => {
    const raw = semester ?? student?.semester;
    if (!raw) return "";
    const match = String(raw).match(/(\d+)/);
    return match ? match[1] : String(raw);
  }, [semester, student?.semester]);

  // List of courses belonging specifically to the student's semester
  const semesterCourses = useMemo(() => {
    if (!studentSemester) return [];
    return SEMESTER_COURSES[studentSemester] || [];
  }, [studentSemester]);

  const fetchMaterials = useCallback(async () => {
    if (!studentSemester) {
      setMaterials([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/backend/api/materials?semester=${encodeURIComponent(studentSemester)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data.materials) {
        setMaterials(data.materials);
      } else {
        setMaterials([]);
      }
    } catch (err) {
      console.warn("Error fetching study materials:", err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [studentSemester]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Reset selected course if semester changes
  useEffect(() => {
    setSelectedCourse("all");
  }, [studentSemester]);

  // Helper file size
  const formatFileSize = (bytes) => {
    const b = Number(bytes || 0);
    if (!b) return "";
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFormatIcon = (type = "", name = "") => {
    const lower = (type + " " + name).toLowerCase();
    if (lower.includes("slide") || lower.includes("pdf")) {
      return <FileText className="w-5 h-5 text-rose-500" />;
    }
    if (lower.includes("lab") || lower.includes("code")) {
      return <FileCode className="w-5 h-5 text-indigo-500" />;
    }
    if (lower.includes("sheet") || lower.includes("xls")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (lower.includes("zip") || lower.includes("rar")) {
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    }
    return <BookOpen className="w-5 h-5 text-sky-500" />;
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchesSearch =
        !searchQuery.trim() ||
        m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.course?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType =
        selectedType === "all" ||
        m.type?.toLowerCase().includes(selectedType.toLowerCase());

      const matchesCourse =
        selectedCourse === "all" ||
        m.course?.toLowerCase().replace(/[\s-]/g, "") === selectedCourse.toLowerCase().replace(/[\s-]/g, "");

      return matchesSearch && matchesType && matchesCourse;
    });
  }, [materials, searchQuery, selectedType, selectedCourse]);

  return (
    <div
      id="materials"
      className="p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Academic Learning Repository</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Course Materials & Lecture Notes</span>
            {materials.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {materials.length} Available
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Official slides, lab manuals, and handouts published by your course instructors for Semester {studentSemester || "your semester"}.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMaterials}
          disabled={loading}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          title="Refresh materials"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
        </button>
      </div>

      {/* Filter Bar: Semester Badge + Course Filter + Type Filter + Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Locked Semester Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Semester {studentSemester || "Enrolled"}</span>
            {SEMESTER_LABELS[studentSemester] && (
              <span className="text-[11px] font-normal text-indigo-600/80 dark:text-indigo-400/80">
                • {SEMESTER_LABELS[studentSemester]}
              </span>
            )}
          </div>

          {/* Filter by Course in This Semester */}
          {semesterCourses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              aria-label="Filter by course"
              className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Semester {studentSemester} Courses</option>
              {semesterCourses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Filter by Type */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter by material type"
            className="px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Material Types</option>
            <option value="slide">Slides & Lectures</option>
            <option value="lab">Lab Manuals & Code</option>
            <option value="sheet">Spreadsheets & Data</option>
            <option value="notes">Notes & Handouts</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search slides, notes, instructors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="py-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700/80 space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {searchQuery || selectedCourse !== "all" || selectedType !== "all"
                ? "No study materials match your active filters"
                : `No study materials uploaded for Semester ${studentSemester || "your semester"} yet`}
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              When course instructors publish lecture slides, lab manuals, or reference materials for your semester, they will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div
          data-lenis-prevent
          className="max-h-[620px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat, idx) => {
            const matId = mat._id || mat.id || `mat-${idx}`;
            const fileUrl = mat.filePath?.startsWith("http")
              ? mat.filePath
              : mat.filePath
              ? `/backend${mat.filePath}`
              : null;

            return (
              <div
                key={matId}
                className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all hover:shadow-md flex flex-col justify-between space-y-3.5"
              >
                <div className="space-y-2.5">
                  {/* Top Bar with Course and Format */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md">
                      {mat.course}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md truncate max-w-36">
                      {mat.type}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-700/80 shadow-xs border border-slate-200/80 dark:border-slate-600 shrink-0 mt-0.5">
                      {getFormatIcon(mat.type, mat.title || mat.originalName)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                        {mat.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{mat.teacherName || "Assigned Faculty"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Date & Size */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{mat.date || "Recent"}</span>
                    </span>
                    {mat.fileSize > 0 && (
                      <span className="font-mono font-medium">
                        {formatFileSize(mat.fileSize)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  {fileUrl ? (
                    <>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={mat.originalName || `${mat.title}.pdf`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                        title="Open file preview in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No file attachment</span>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
