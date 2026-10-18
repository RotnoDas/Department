"use client";

import React, { useState } from "react";
import {
  Pin,
  Calendar,
  User,
  Users,
  AlertTriangle,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import NoticeAudioPlayer from "./NoticeAudioPlayer";
import NoticeAttachment from "./NoticeAttachment";

export default function NoticeCard({
  notice,
  isAdmin = false,
  onEdit,
  onDelete,
  onTogglePin,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isPinned = Boolean(notice.pinned);
  const priority = notice.priority || "Normal";
  const category = notice.category || "General";
  const audience = notice.audience || "All Members";

  const getPriorityStyle = () => {
    switch (priority.toLowerCase()) {
      case "urgent":
        return "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800";
      case "important":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getCategoryStyle = () => {
    switch (category.toLowerCase()) {
      case "academic":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900";
      case "examination":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-900";
      case "events":
        return "bg-pink-50 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-200 dark:border-pink-900";
      case "urgent":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900";
      default:
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900";
    }
  };

  const contentText = notice.content || "";
  const shouldTruncate = contentText.length > 280;
  const displayContent = shouldTruncate && !isExpanded
    ? contentText.slice(0, 280) + "..."
    : contentText;

  // Extract author info
  const authorName =
    typeof notice.author === "string"
      ? notice.author
      : notice.author?.name || notice.authorName || "Department Office";

  return (
    <div
      className={`relative rounded-2xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border transition-all duration-300 flex flex-col justify-between p-6 shadow-sm hover:shadow-lg ${
        isPinned
          ? "border-amber-400 dark:border-amber-500/60 ring-2 ring-amber-400/20"
          : priority.toLowerCase() === "urgent"
          ? "border-rose-400 dark:border-rose-600/60 ring-2 ring-rose-500/20"
          : "border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-700/60"
      }`}
    >
      <div className="space-y-4">
        {/* Header Badges & Pin */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {isPinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30">
                <Pin className="w-3 h-3 fill-slate-950" />
                <span>Pinned</span>
              </span>
            )}

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyle()}`}
            >
              {category}
            </span>

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${getPriorityStyle()}`}
            >
              {priority === "Urgent" && <AlertTriangle className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {priority} Priority
            </span>

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
              <Users className="w-3 h-3" />
              <span>{audience}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>{notice.date || new Date(notice.createdAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug tracking-tight">
          {notice.title}
        </h3>

        {/* Content Body */}
        {contentText && (
          <div className="space-y-1">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {displayContent}
            </p>
            {shouldTruncate && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-1"
              >
                <span>{isExpanded ? "Show less" : "Read full notice"}</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {/* Audio Message / Voice Announcement */}
        {notice.audio?.filePath && (
          <NoticeAudioPlayer
            audio={notice.audio}
            title={`${notice.title} (Voice Note)`}
          />
        )}

        {/* Attachments */}
        {(notice.attachments?.length > 0 || notice.filePath) && (
          <NoticeAttachment
            attachments={notice.attachments}
            singleAttachment={
              notice.filePath
                ? {
                    filePath: notice.filePath,
                    originalName: notice.originalName,
                    fileMime: notice.fileMime,
                    fileSize: notice.fileSize,
                  }
                : null
            }
          />
        )}
      </div>

      {/* Footer: Author info & Admin Actions */}
      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <User className="w-3 h-3" />
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{authorName}</span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onTogglePin?.(notice)}
              title={isPinned ? "Unpin notice" : "Pin notice to top"}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                isPinned
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-200"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              <Pin className={`w-3 h-3 ${isPinned ? "fill-amber-600" : ""}`} />
              <span>{isPinned ? "Unpin" : "Pin"}</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit?.(notice)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete?.(notice._id)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
