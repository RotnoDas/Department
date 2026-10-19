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
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";
import VoiceRecorder from "./VoiceRecorder";
import { AttachmentIcon, formatFileSize } from "./NoticeAttachment";

export default function NoticeModal({
  isOpen,
  onClose,
  onNoticeSaved,
  editingNotice = null,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [file, setFile] = useState(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  // Audio message
  const [audioData, setAudioData] = useState(null); // { file, duration }
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (editingNotice) {
      setTitle(editingNotice.title || "");
      setContent(editingNotice.content || "");
      setIsPublic(editingNotice.isPublic !== undefined ? Boolean(editingNotice.isPublic) : true);
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);
    } else {
      setTitle("");
      setContent("");
      setIsPublic(true);
      setFile(null);
      setRemoveExistingFile(false);
      setAudioData(null);
      setRemoveExistingAudio(false);
    }
  }, [editingNotice, isOpen]);

  // Support Ctrl+Enter keyboard submission
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        const submitBtn = document.getElementById("notice-submit-button");
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
      return toast.error("Write notice text, attach a file, or provide an audio message.");
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("isPublic", isPublic ? "true" : "false");

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
        throw new Error(data.error || "Failed to save notice.");
      }

      toast.success(
        editingNotice
          ? "Notice updated successfully."
          : "Notice published to all members!"
      );

      onNoticeSaved?.(data.notice);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to save notice.");
    } finally {
      setSaving(false);
    }
  };

  const selectedFileNotice = file
    ? {
        originalName: file.name,
        fileMime: file.type,
        fileSize: file.size,
      }
    : null;

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overscroll-contain"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2rem] border border-white dark:border-white/10 p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto overscroll-contain scrollbar-thin">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              {editingNotice ? <Pencil className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                {editingNotice ? "Edit Notice" : "Publish Notice"}
              </h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Official Broadcast • All Members
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Headline */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Notice Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mid-Term Examination Schedule & Room Allocations"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
              required
              disabled={saving}
            />
          </div>

          {/* Details / Text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Announcement Details
            </label>
            <textarea
              placeholder="Enter the full announcement text, instructions, or notes..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
              disabled={saving}
            />
          </div>

          {/* Public Notice Visibility Toggle */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label 
                htmlFor="notice-is-public-toggle"
                className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span>Make Public Notice (Open to All Visitors)</span>
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Visible to everyone without login on the homepage and dedicated notices page. Uncheck for internal member circulars.
              </p>
            </div>
            <input
              id="notice-is-public-toggle"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={saving}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                <span>File Attachment (Optional)</span>
              </span>
              <span className="text-[11px] font-normal text-slate-400">PDF, Docs, Images, ZIP</span>
            </label>

            {/* Selected File */}
            {selectedFileNotice ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    <AttachmentIcon notice={selectedFileNotice} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetFileInput}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                  title="Remove file"
                  disabled={saving}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : editingNotice?.filePath && !removeExistingFile ? (
              /* Existing attachment in edit mode */
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-800 dark:text-white">
                      {editingNotice.originalName || "Attached File"}
                    </p>
                    <p className="text-[10px] text-slate-400">Currently attached</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                  disabled={saving}
                >
                  Remove
                </button>
              </div>
            ) : (
              /* File upload drop button */
              <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 hover:text-indigo-600 text-xs font-semibold cursor-pointer transition">
                <Paperclip className="w-4 h-4 text-indigo-500" />
                <span>Choose a file or click to upload</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] || null);
                    setRemoveExistingFile(false);
                  }}
                  disabled={saving}
                />
              </label>
            )}

            {removeExistingFile && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Existing file will be removed when saved.</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(false)}
                  className="underline ml-1 hover:text-rose-700"
                >
                  Undo
                </button>
              </p>
            )}
          </div>

          {/* Voice Announcement */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mic className="w-3.5 h-3.5 text-indigo-500" />
              <span>Voice Note (Optional)</span>
            </label>

            {editingNotice?.audio?.filePath && !removeExistingAudio && !audioData ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">
                    Existing Voice Note
                  </p>
                  <p className="text-[10px] text-slate-400">Attached to this circular</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveExistingAudio(true)}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                  disabled={saving}
                >
                  Remove Audio
                </button>
              </div>
            ) : (
              <VoiceRecorder
                onAudioReady={(data) => {
                  setAudioData(data);
                  setRemoveExistingAudio(false);
                }}
                onAudioRemoved={() => setAudioData(null)}
              />
            )}

            {removeExistingAudio && (
              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 pt-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Existing voice note will be removed when saved.</span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingAudio(false)}
                  className="underline ml-1 hover:text-rose-700"
                >
                  Undo
                </button>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="notice-submit-button"
              disabled={saving || !title.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none cursor-pointer disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? "Saving..."
                  : editingNotice
                  ? "Save Changes"
                  : "Publish Notice"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
