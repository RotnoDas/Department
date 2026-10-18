"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Upload,
  FilePlus,
  Trash2,
  Paperclip,
  Check,
  AlertCircle,
  Pin,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import VoiceRecorder from "./VoiceRecorder";
import { getFileIcon, formatFileSize } from "./NoticeAttachment";

export default function NoticeModal({
  isOpen,
  onClose,
  onNoticeSaved,
  editingNotice = null,
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Academic");
  const [audience, setAudience] = useState("All Members");
  const [priority, setPriority] = useState("Normal");
  const [pinned, setPinned] = useState(false);

  // Attachments state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removedAttachmentPaths, setRemovedAttachmentPaths] = useState([]);

  // Audio note state
  const [audioData, setAudioData] = useState(null); // { file, duration }
  const [existingAudio, setExistingAudio] = useState(null);
  const [removeExistingAudio, setRemoveExistingAudio] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize or reset form when modal opens or editingNotice changes
  useEffect(() => {
    if (editingNotice) {
      setTitle(editingNotice.title || "");
      setContent(editingNotice.content || "");
      setCategory(editingNotice.category || "Academic");
      setAudience(editingNotice.audience || "All Members");
      setPriority(editingNotice.priority || "Normal");
      setPinned(Boolean(editingNotice.pinned));

      // Attachments
      const existing = [];
      if (Array.isArray(editingNotice.attachments)) {
        existing.push(...editingNotice.attachments);
      } else if (editingNotice.filePath) {
        existing.push({
          filePath: editingNotice.filePath,
          originalName: editingNotice.originalName,
          fileMime: editingNotice.fileMime,
          fileSize: editingNotice.fileSize,
        });
      }
      setExistingAttachments(existing);
      setRemovedAttachmentPaths([]);

      // Audio
      setExistingAudio(editingNotice.audio || null);
      setRemoveExistingAudio(false);
      setAudioData(null);
    } else {
      setTitle("");
      setContent("");
      setCategory("Academic");
      setAudience("All Members");
      setPriority("Normal");
      setPinned(false);
      setSelectedFiles([]);
      setExistingAttachments([]);
      setRemovedAttachmentPaths([]);
      setAudioData(null);
      setExistingAudio(null);
      setRemoveExistingAudio(false);
    }
  }, [editingNotice, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const markExistingAttachmentForRemoval = (filePath) => {
    setRemovedAttachmentPaths((prev) => [...prev, filePath]);
    setExistingAttachments((prev) => prev.filter((a) => a.filePath !== filePath));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a notice title.");
      return;
    }

    const hasAttachment =
      selectedFiles.length > 0 ||
      existingAttachments.length > 0 ||
      Boolean(audioData?.file) ||
      Boolean(existingAudio && !removeExistingAudio);

    if (!content.trim() && !hasAttachment) {
      toast.error("Please enter notice content, attach files, or provide an audio message.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("category", category);
      formData.append("audience", audience);
      formData.append("priority", priority);
      formData.append("pinned", pinned ? "true" : "false");

      // Append new file attachments
      selectedFiles.forEach((file) => {
        formData.append("attachments", file);
      });

      // Append new audio file if present
      if (audioData?.file) {
        formData.append("audio", audioData.file);
        if (audioData.duration) {
          formData.append("audioDuration", String(audioData.duration));
        }
      }

      // In edit mode: pass removed attachments and audio removal flag
      if (editingNotice) {
        if (removedAttachmentPaths.length > 0) {
          formData.append("removedAttachmentPaths", JSON.stringify(removedAttachmentPaths));
        }
        if (removeExistingAudio) {
          formData.append("removeAudio", "true");
        }
      }

      const url = editingNotice
        ? `/backend/api/notices/${editingNotice._id}`
        : "/backend/api/notices";
      const method = editingNotice ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to publish notice.");
      }

      toast.success(
        editingNotice
          ? "Notice updated successfully!"
          : "Official notice published to department boards!"
      );

      onNoticeSaved(data.notice);
      onClose();
    } catch (err) {
      console.error("[NoticeModal] Submission error:", err);
      toast.error(err.message || "Failed to save notice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 my-8 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{editingNotice ? "Edit Department Notice" : "Dispatch Official Notice"}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Publish circulars, file attachments, and voice notes to student & faculty dashboards.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-5">
          {/* Notice Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Notice Title <span className="text-rose-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. 6th Semester Final Practical Exam Schedule & Seating"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            />
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Academic">Academic</option>
                <option value="Examination">Examination</option>
                <option value="Events">Events</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Urgent">Urgent Circular</option>
                <option value="Administrative">Administrative</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Target Audience
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="All Members">All Members</option>
                <option value="All Students">All Students</option>
                <option value="Faculty Only">Faculty Only</option>
                <option value="Staff Only">Staff Only</option>
                <option value="Batch 11">Batch 11</option>
                <option value="Batch 12">Batch 12</option>
                <option value="Batch 13">Batch 13</option>
                <option value="Batch 14">Batch 14</option>
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="Normal">Normal</option>
                <option value="Important">Important</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Pin to Top Checkbox */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50">
            <input
              type="checkbox"
              id="pinnedNotice"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label
              htmlFor="pinnedNotice"
              className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Pin className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              <span>Pin this notice to the top of boards</span>
            </label>
          </div>

          {/* Notice Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Notice Text / Description
            </label>
            <textarea
              rows={4}
              placeholder="Enter detailed announcements, schedule, or instructions..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition leading-relaxed"
            />
          </div>

          {/* ── AUDIO VOICE ANNOUNCEMENT ── */}
          <VoiceRecorder
            onAudioReady={(data) => {
              setAudioData(data);
              setRemoveExistingAudio(false);
            }}
            onAudioRemoved={() => {
              setAudioData(null);
              setRemoveExistingAudio(true);
            }}
            existingAudio={!removeExistingAudio ? existingAudio : null}
          />

          {/* ── FILE ATTACHMENTS (ANY KIND OF FILES) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Upload Documents & Files (Any kind: PDF, Word, Excel, Images, ZIP)</span>
              </label>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition cursor-pointer"
              >
                <FilePlus className="w-4 h-4" />
                <span>Add Files</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Selected New Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  New files to upload ({selectedFiles.length}):
                </p>
                <div className="space-y-1">
                  {selectedFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon("", f.name, "w-4 h-4")}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({formatFileSize(f.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Attachments in Edit Mode */}
            {existingAttachments.length > 0 && (
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Existing attachments ({existingAttachments.length}):
                </p>
                <div className="space-y-1">
                  {existingAttachments.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(a.fileType, a.originalName, "w-4 h-4")}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {a.originalName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({formatFileSize(a.fileSize)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => markExistingAttachmentForRemoval(a.filePath)}
                        title="Remove existing file"
                        className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty dropzone state if no files selected */}
            {selectedFiles.length === 0 && existingAttachments.length === 0 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-800/40 text-center cursor-pointer transition"
              >
                <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Click to attach files from your computer
                </p>
                <p className="text-[10px] text-slate-400">
                  PDF, Word, Excel, PowerPoint, Zip, JPEG, PNG, or any documents (Up to 100MB)
                </p>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingNotice ? "Update Notice" : "Publish Notice"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
