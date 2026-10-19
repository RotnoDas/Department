"use client";

import React, { useState } from "react";
import {
  User,
  Calendar,
  Pencil,
  Trash2,
  Headphones,
  Paperclip,
} from "lucide-react";
import NoticeAudioPlayer from "./NoticeAudioPlayer";
import NoticeAttachment from "./NoticeAttachment";

export default function NoticeCard({
  notice,
  isAdmin = false,
  onEdit,
  onDelete,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const options = {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      };
      return new Date(dateString).toLocaleDateString("en-US", options);
    } catch {
      return String(dateString);
    }
  };

  const authorName =
    notice.authorName ||
    (typeof notice.author === "string" ? notice.author : notice.author?.name) ||
    "Department Administration";

  const hasAudio = Boolean(notice.audio?.filePath);
  const hasAttachment = Boolean(
    notice.filePath || (notice.attachments && notice.attachments.length > 0)
  );

  const textContent = notice.content || "";
  const isLong = textContent.length > 260;
  const displayText = isLong && !isExpanded ? textContent.slice(0, 260) + "..." : textContent;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/60 transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4">
      <div className="space-y-3.5">
        {/* Top line with author, date, and media badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <User className="w-3.5 h-3.5 text-indigo-500" />
              <span>{authorName}</span>
            </span>

            <span className="text-slate-300 dark:text-slate-600">•</span>

            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(notice.createdAt || notice.date)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {hasAudio && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                <Headphones className="w-3 h-3" />
                <span>Voice</span>
              </span>
            )}
            {hasAttachment && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50">
                <Paperclip className="w-3 h-3" />
                <span>Files</span>
              </span>
            )}
          </div>
        </div>

        {/* Notice Headline */}
        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
          {notice.title}
        </h3>

        {/* Notice text body */}
        {textContent && (
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            <p>{displayText}</p>
            {isLong && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer block"
              >
                {isExpanded ? "Show less" : "Read full notice"}
              </button>
            )}
          </div>
        )}

        {/* Voice Announcement Player */}
        {hasAudio && (
          <div className="pt-1">
            <NoticeAudioPlayer audio={notice.audio} />
          </div>
        )}

        {/* File Attachments */}
        {hasAttachment && (
          <div className="pt-1">
            <NoticeAttachment notice={notice} />
          </div>
        )}
      </div>

      {/* Admin Action Bar matching main project table & card actions */}
      {isAdmin && (
        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onEdit?.(notice)}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(notice)}
            className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove</span>
          </button>
        </div>
      )}
    </div>
  );
}
