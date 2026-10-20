"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Bell,
  Send,
  Paperclip,
  Mic,
  AlertCircle,
  FileText,
  BookOpen,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  AlertTriangle,
  UploadCloud,
} from "lucide-react";
import toast from "react-hot-toast";
import VoiceRecorder from "./VoiceRecorder";
import { AttachmentIcon, formatFileSize } from "./NoticeAttachment";

const NOTICE_CATEGORIES = [
  "Class Update",
  "Lab Announcement",
  "Assignment / Exam",
  "Reschedule Notice",
  "Class Test / Quiz",
  "Emergency Alert",
  "Course Syllabus",
];

export default function CourseNoticeModal({
  isOpen,
  onClose,
  onNoticeSaved,
  teacherCourses = [],
  currentTeacher = null,
  editingNotice = null,
  defaultCourseCode = "",
}) {
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [semester, setSemester] = useState("");
  const [isCustomCourse, setIsCustomCourse] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Class Update");
  const [priority, setPriority] = useState("normal"); // "normal" | "important" | "urgent"

  const [file, setFile] = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  // Audio message
  const [audioData, setAudioData] = useState(null); // { file, duration }
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize or reset form
  useEffect(() => {
    if (!isOpen) return;

    if (editingNotice) {
      setTitle(editingNotice.title || "");
      setContent(editingNotice.content || "");
      setCategory(editingNotice.category || "Class Update");
      setPriority(editingNotice.priority || "normal");
      setCourseCode(editingNotice.courseCode || "");
      setCourseTitle(editingNotice.courseTitle || "");
      setSemester(editingNotice.semester || "");
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);

      // Check if course matches assigned list
      const matched = teacherCourses.some(
        (c) => c.code?.toUpperCase() === editingNotice.courseCode?.toUpperCase()
      );
      setIsCustomCourse(!matched && Boolean(editingNotice.courseCode));
    } else {
      // New notice: select first assigned course or defaultCourseCode
      const initialCourse = defaultCourseCode
        ? teacherCourses.find((c) => c.code?.toUpperCase() === defaultCourseCode.toUpperCase())
        : teacherCourses[0];

      if (initialCourse) {
        setCourseCode(initialCourse.code || "");
        setCourseTitle(initialCourse.title || "");
        setSemester(initialCourse.semester || initialCourse.semesterNum || "7");
        setIsCustomCourse(false);
      } else {
        setCourseCode("");
        setCourseTitle("");
        setSemester("7");
        setIsCustomCourse(true);
      }

      setTitle("");
      setContent("");
      setCategory("Class Update");
      setPriority("normal");
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);
    }
  }, [editingNotice, isOpen, teacherCourses, defaultCourseCode]);

  // Handle course dropdown change
  const handleCourseSelect = (e) => {
    const val = e.target.value;
    if (val === "__custom__") {
      setIsCustomCourse(true);
      setCourseCode("");
      setCourseTitle("");
      return;
    }

    setIsCustomCourse(false);
    const selected = teacherCourses.find((c) => c.code === val);
    if (selected) {
      setCourseCode(selected.code || "");
      setCourseTitle(selected.title || "");
      setSemester(selected.semester || selected.semesterNum || "7");
    }
  };

  // Keyboard shortcut Ctrl+Enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("course-notice-submit-button");
        if (submitBtn) submitBtn.click();
      }
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const resetFileInput = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasExistingAttachment =
    (editingNotice?.filePath || editingNotice?.attachments?.length > 0) &&
    !removeExistingFile &&
    !file;

  const hasExistingAudio =
    editingNotice?.audio?.filePath && !removeExistingAudio && !audioData;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!courseCode.trim()) {
      return toast.error("Please specify a course code for this course notice.");
    }
    if (!title.trim()) {
      return toast.error("Please enter a notice headline.");
    }
    if (
      !content.trim() &&
      !file &&
      !hasExistingAttachment &&
      !audioData &&
      !hasExistingAudio
    ) {
      return toast.error("Write notice text, attach a document, or record a voice announcement.");
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("noticeType", "course");
      formData.append("courseCode", courseCode.trim().toUpperCase());
      formData.append("courseTitle", courseTitle.trim());
      formData.append("semester", String(semester || "7").trim());
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("isPublic", "false"); // Course notices are internal to members/course students

      const authorName = currentTeacher?.name || "Course Teacher";
      const teacherEmail = currentTeacher?.email || "";
      formData.append("authorName", authorName);
      formData.append("authorRole", "teacher");
      formData.append("teacherEmail", teacherEmail);
      formData.append("authorEmail", teacherEmail);

      // File attachment
      if (file) {
        formData.append("file", file);
      }
      if (removeExistingFile) {
        formData.append("removeFile", "true");
      }

      // Audio message
      if (audioData?.file) {
        formData.append("audio", audioData.file);
        if (audioData.duration) {
          formData.append("audioDuration", String(audioData.duration));
        }
      }
      if (removeExistingAudio) {
        formData.append("removeAudio", "true");
      }

      const noticeId = editingNotice?.id || editingNotice?._id;
      const url = editingNotice
        ? `/backend/api/notices/${noticeId}`
        : "/backend/api/notices";
      const method = editingNotice ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish course notice.");
      }

      toast.success(
        editingNotice
          ? `Notice for ${courseCode} updated!`
          : `Course notice for ${courseCode} published!`
      );
      onNoticeSaved?.();
      onClose();
    } catch (err) {
      console.error("[CourseNoticeModal] Error:", err);
      toast.error(err.message || "Failed to publish course notice.");
    } finally {
      setSaving(false);
    }
  };

  const teacherDisplayName = currentTeacher?.name || "Course Instructor";
  const teacherDesignation = currentTeacher?.designation || "Faculty Member";

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden my-6 transition-all">
        {/* Decorative Top Accent Banner */}
        <div className="h-2 w-full bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600" />

        {/* Modal Header */}
        <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-white/10 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-sky-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center shrink-0 shadow-xs">
              <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                <span>Course Faculty Notice • Student Broadcast</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {editingNotice ? "Edit Course Notice" : "Give Course Notice"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Publish a direct course notice or academic alert to students enrolled in this course (given by course teacher).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Course Teacher Identity Bar */}
        <div className="px-6 py-3 bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900/40 border-b border-indigo-100 dark:border-white/5 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Notice Issuer:</span>
            <span className="font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <span>{teacherDisplayName}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {teacherDesignation}
              </span>
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Course Teacher Verified</span>
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 max-h-[72vh] overflow-y-auto overscroll-contain scrollbar-thin">
          {/* Course Selection */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span>Select Target Course *</span>
              </label>
              {semester && (
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300">
                  Semester {semester}
                </span>
              )}
            </div>

            {teacherCourses.length > 0 && !isCustomCourse ? (
              <div className="space-y-2">
                <select
                  value={courseCode}
                  onChange={handleCourseSelect}
                  className="w-full h-11 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  required
                >
                  <option value="" disabled>-- Select one of your assigned courses --</option>
                  {teacherCourses.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} • {c.title} (Semester {c.semester || c.semesterNum || "7"})
                    </option>
                  ))}
                  <option value="__custom__">+ Other / Custom Course Code...</option>
                </select>

                {courseTitle && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-1">
                    Course: <span className="font-bold">{courseTitle}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Course Code *</span>
                  <input
                    type="text"
                    placeholder="e.g. CSE 4102"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Course Title</span>
                    {teacherCourses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCourse(false);
                          if (teacherCourses[0]) {
                            setCourseCode(teacherCourses[0].code);
                            setCourseTitle(teacherCourses[0].title);
                            setSemester(teacherCourses[0].semester || "7");
                          }
                        }}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Choose from assigned list
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Software Project III"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Headline & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Notice Headline *</span>
                <span className="text-[11px] text-slate-400 font-normal">{title.length}/140</span>
              </label>
              <input
                type="text"
                maxLength={140}
                placeholder="e.g. Lab Report 2 Submission Deadline & Format"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notice Tag / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {NOTICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority Pills & Target Semester */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Notice Priority:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { id: "normal", label: "Normal", bg: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300" },
                  { id: "important", label: "Important", bg: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" },
                  { id: "urgent", label: "Urgent Alert", bg: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      priority === p.id
                        ? `${p.bg} shadow-xs ring-1 ring-indigo-500/50`
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">Target Term:</span>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                {["1", "2", "3", "4", "5", "6", "7", "8"].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notice Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Notice Body / Instructions *</span>
              <span className="text-[11px] text-slate-400 font-normal">
                {content.length} characters
              </span>
            </label>
            <textarea
              rows={5}
              placeholder="Write detailed announcements, lab directions, homework guidelines, or classroom changes for your students..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Attachments & Voice Announcement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* File Attachment */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Document / Slide Attachment</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Max 50MB</span>
              </div>

              {hasExistingAttachment && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                    {editingNotice.originalName || "Existing File"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingFile(true)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              {file ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60">
                  <div className="flex items-center gap-2 truncate">
                    <AttachmentIcon mime={file.type} />
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 truncate">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-indigo-600/80 shrink-0">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={resetFileInput}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-3.5 text-center cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-800/80 group"
                >
                  <UploadCloud className="w-5 h-5 mx-auto text-slate-400 group-hover:text-indigo-500 transition-colors mb-1" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Click to attach file
                  </p>
                  <p className="text-[10px] text-slate-400">PDF, DOCX, PPTX, XLSX, Images, ZIP</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setRemoveExistingFile(false);
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Voice Announcement */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-500" />
                  <span>Faculty Audio Announcement</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>

              {hasExistingAudio && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    Existing Voice Note
                  </span>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingAudio(true)}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}

              <VoiceRecorder
                onAudioReady={(data) => {
                  setAudioData(data);
                  setRemoveExistingAudio(false);
                }}
                onAudioRemoved={() => {
                  setAudioData(null);
                  setRemoveExistingAudio(true);
                }}
                existingAudio={editingNotice?.audio}
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              Cancel
            </button>
            <button
              id="course-notice-submit-button"
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? "Publishing..." : editingNotice ? "Save Notice Changes" : "Publish Course Notice"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
