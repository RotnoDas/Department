"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Bell,
  Send,
  Paperclip,
  Mic,
  BookOpen,
  ChevronDown,
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
  "General Announcement",
];

const PRIORITIES = [
  { id: "normal", label: "Normal" },
  { id: "important", label: "Important" },
  { id: "urgent", label: "Urgent" },
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
  const [semester, setSemester] = useState("7");
  const [isCustomCourse, setIsCustomCourse] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Class Update");
  const [priority, setPriority] = useState("normal");

  const [file, setFile] = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  // Audio announcement
  const [audioData, setAudioData] = useState(null);
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Reset or initialize on open
  useEffect(() => {
    if (!isOpen) return;

    if (editingNotice) {
      setTitle(editingNotice.title || "");
      setContent(editingNotice.content || "");
      setCategory(editingNotice.category || "Class Update");
      setPriority(editingNotice.priority || "normal");
      setCourseCode(editingNotice.courseCode || "");
      setCourseTitle(editingNotice.courseTitle || "");
      setSemester(String(editingNotice.semester || "7"));
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);
      setShowVoiceRecorder(Boolean(editingNotice?.audio?.filePath));

      const matched = teacherCourses.some(
        (c) => c.code?.toUpperCase() === editingNotice.courseCode?.toUpperCase()
      );
      setIsCustomCourse(!matched && Boolean(editingNotice.courseCode));
    } else {
      const targetCode = defaultCourseCode || "";
      const initialCourse = targetCode
        ? teacherCourses.find((c) => c.code?.toUpperCase() === targetCode.toUpperCase())
        : teacherCourses[0];

      if (initialCourse) {
        setCourseCode(initialCourse.code || "");
        setCourseTitle(initialCourse.title || "");
        const semNum = String(initialCourse.semester || initialCourse.semesterNum || "7").replace(/\D/g, "") || "7";
        setSemester(semNum);
        setIsCustomCourse(false);
      } else if (targetCode) {
        setCourseCode(targetCode);
        setCourseTitle("");
        setSemester("7");
        setIsCustomCourse(true);
      } else {
        setCourseCode("");
        setCourseTitle("");
        setSemester("7");
        setIsCustomCourse(false);
      }

      setTitle("");
      setContent("");
      setCategory("Class Update");
      setPriority("normal");
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);
      setShowVoiceRecorder(false);
    }
  }, [editingNotice, isOpen, teacherCourses, defaultCourseCode]);

  // Handle dropdown course select
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
      const semNum = String(selected.semester || selected.semesterNum || "7").replace(/\D/g, "") || "7";
      setSemester(semNum);
    }
  };

  // Keyboard shortcut Ctrl+Enter to publish
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

  const hasExistingAttachment =
    (editingNotice?.filePath || editingNotice?.attachments?.length > 0) &&
    !removeExistingFile &&
    !file;

  const hasExistingAudio =
    editingNotice?.audio?.filePath && !removeExistingAudio && !audioData;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!courseCode.trim()) {
      return toast.error("Please specify a course code for this notice.");
    }
    if (!title.trim()) {
      return toast.error("Please enter a notice title.");
    }
    if (!content.trim() && !file && !hasExistingAttachment && !audioData && !hasExistingAudio) {
      return toast.error("Please provide notice details, attach a document, or record audio.");
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("noticeType", "course");
      formData.append("courseCode", courseCode.trim().toUpperCase());
      formData.append("courseTitle", courseTitle.trim() || `${courseCode.trim().toUpperCase()} Course`);
      formData.append("semester", String(semester || "7").trim());
      formData.append("category", category);
      formData.append("priority", priority);
      formData.append("isPublic", "false");

      const authorName = currentTeacher?.name || "Course Teacher";
      const teacherEmail = currentTeacher?.email || "";
      formData.append("authorName", authorName);
      formData.append("authorRole", "teacher");
      formData.append("teacherEmail", teacherEmail);
      formData.append("authorEmail", teacherEmail);

      if (file) {
        formData.append("file", file);
      }
      if (removeExistingFile) {
        formData.append("removeFile", "true");
      }

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

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-6 transition-all">
        {/* Solid Single-Color Top Line */}
        <div className="h-1 w-full bg-indigo-600" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingNotice ? "Edit Course Notice" : "Give Course Notice"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Publish a direct notice for students enrolled in this course
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto overscroll-contain scrollbar-thin">
          {/* Target Course & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Target Course */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Target Course *</span>
                </label>
                {semester && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Sem {semester}
                  </span>
                )}
              </div>

              {teacherCourses.length > 0 && !isCustomCourse ? (
                <div className="relative">
                  <select
                    value={courseCode}
                    onChange={handleCourseSelect}
                    className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-600 appearance-none cursor-pointer"
                    required
                  >
                    <option value="" disabled>-- Select Course --</option>
                    {teacherCourses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} • {c.title}
                      </option>
                    ))}
                    <option value="__custom__">+ Other Course Code...</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. CSE 4104"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-600"
                    required
                  />
                  {teacherCourses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(false)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 shrink-0"
                    >
                      List
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Notice Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:border-indigo-600 appearance-none cursor-pointer"
                >
                  {NOTICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Headline / Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Notice Title *</span>
              <span className="text-[11px] text-slate-400 font-normal">{title.length}/120</span>
            </label>
            <input
              type="text"
              maxLength={120}
              placeholder="e.g. Lab 2 Submission Guidelines & Rubric"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600 transition-all"
              required
            />
          </div>

          {/* Priority Selection (Solid Indigo & Slate) */}
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">Priority:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notice Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Notice Instructions / Details *
            </label>
            <textarea
              rows={4}
              placeholder="Write announcement details, room changes, quiz coverage, homework instructions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-600 leading-relaxed transition-all resize-y"
            />
          </div>

          {/* Attachments & Voice Note Toolbar (Clean Slate + Indigo) */}
          <div className="pt-1 space-y-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* File Attachment Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                <span>{file || hasExistingAttachment ? "Change Document" : "Attach Document"}</span>
              </button>

              {/* Voice Note Toggle Button */}
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  showVoiceRecorder || audioData || hasExistingAudio
                    ? "bg-indigo-600 text-white font-bold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{audioData || hasExistingAudio ? "Voice Note Attached" : "Voice Announcement"}</span>
              </button>

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

            {/* Attached File Preview Pill */}
            {hasExistingAttachment && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[260px]">
                  📎 {editingNotice.originalName || "Existing File"}
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(true)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer ml-2"
                >
                  Remove
                </button>
              </div>
            )}

            {file && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <AttachmentIcon mime={file.type} />
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[260px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0 ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Expandable Voice Recorder */}
            {showVoiceRecorder && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Faculty Voice Note</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowVoiceRecorder(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-600"
                  >
                    Hide
                  </button>
                </div>
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
            )}
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border text-[10px] font-mono">Ctrl+Enter</kbd> to publish
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="course-notice-submit-button"
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{saving ? "Publishing..." : editingNotice ? "Save Notice" : "Publish Course Notice"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
