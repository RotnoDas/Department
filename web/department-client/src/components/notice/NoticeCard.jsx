"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Calendar,
  Pencil,
  Trash2,
  Headphones,
  Paperclip,
  Globe,
  Lock,
  ExternalLink,
  ArrowRight,
  BookOpen,
  GraduationCap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import NoticeAudioPlayer from "./NoticeAudioPlayer";
import NoticeAttachment from "./NoticeAttachment";

export default function NoticeCard({
  notice,
  isAdmin = false,
  onEdit,
  onDelete,
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
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
    (notice.noticeType === "course" || notice.courseCode ? "Course Teacher" : "Department Administration");

  const isCourseNotice = notice.noticeType === "course" || Boolean(notice.courseCode);
  const isPublicNotice = Boolean(notice.isPublic);
  const isLockedForGuest = !isPublicNotice && !user;
  const noticeId = notice.id || notice._id;

  const canEdit =
    isAdmin ||
    Boolean(
      user &&
        ((notice.authorEmail && user.email?.toLowerCase() === notice.authorEmail.toLowerCase()) ||
          (notice.teacherEmail && user.email?.toLowerCase() === notice.teacherEmail.toLowerCase()) ||
          (user.role === "teacher" &&
            notice.authorRole === "teacher" &&
            user.name === notice.authorName))
    );

  const hasAudio = Boolean(notice.audio?.filePath);
  const hasAttachment = Boolean(
    notice.filePath || (notice.attachments && notice.attachments.length > 0)
  );

  const textContent = notice.content || "";
  const isLong = textContent.length > 260;
  const displayText = isLong && !isExpanded ? textContent.slice(0, 260) + "..." : textContent;

  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800/90 border transition-all shadow-sm hover:shadow-md flex flex-col justify-between space-y-4 ${
      isCourseNotice 
        ? "border-indigo-200/90 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500 ring-1 ring-indigo-500/10" 
        : "border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500/60"
    }`}>
      <div className="space-y-3.5">
        {/* Top line with course badge, author, date, and media badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {isCourseNotice ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>{notice.courseCode || "Course Notice"}</span>
                {notice.semester && <span>• Sem {notice.semester}</span>}
              </span>
            ) : isPublicNotice ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <Globe className="w-3 h-3 text-emerald-500" />
                <span>Public Notice</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Lock className="w-3 h-3 text-amber-500" />
                <span>Members Only</span>
              </span>
            )}

            {notice.category && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600">
                {notice.category}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isCourseNotice ? (
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
              ) : (
                <User className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>{isCourseNotice ? `Teacher: ${authorName}` : authorName}</span>
            </span>

            <span className="text-slate-300 dark:text-slate-600">•</span>

            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatDate(notice.createdAt || notice.date)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {notice.priority === "urgent" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 animate-pulse">
                Urgent
              </span>
            )}
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
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
            {notice.title}
          </h3>
          {notice.courseTitle && (
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
              Course: {notice.courseTitle}
            </p>
          )}
        </div>

        {/* Gated internal notice box for guests */}
        {isLockedForGuest ? (
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Restricted Department Document</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This notice contains internal circulars for registered students and faculty members. Please sign in to read the complete circular and access attached files.
            </p>
            <Link
              href={`/login?redirect=${encodeURIComponent(`/notices/${noticeId}`)}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 pt-0.5"
            >
              <span>Sign in to access document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Footer toolbar: link to dedicated page + admin controls */}
      <div className="pt-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-3 flex-wrap">
        <Link
          href={
            isPublicNotice || user
              ? `/notices/${noticeId}`
              : `/login?redirect=${encodeURIComponent(`/notices/${noticeId}`)}`
          }
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1 transition-colors"
        >
          <span>View Dedicated Notice Page</span>
          <ExternalLink className="w-3 h-3" />
        </Link>

        {canEdit && (
          <div className="flex items-center gap-3">
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
    </div>
  );
}
