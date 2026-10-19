"use client";

import React, { useState } from "react";
import {
  Download,
  ExternalLink,
  Eye,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  X,
} from "lucide-react";

export const formatFileSize = (size) => {
  const bytes = Number(size || 0);
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isImageAttachment = (notice) => {
  const name = notice?.originalName || "";
  const mime = notice?.fileMime || "";
  return (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)
  );
};

export function AttachmentIcon({ notice, className = "h-4 w-4" }) {
  const name = notice?.originalName || "";
  const mime = notice?.fileMime || "";

  if (isImageAttachment(notice)) {
    return <FileImage className={`${className} text-sky-500`} />;
  }
  if (mime.includes("pdf") || /\.pdf$/i.test(name)) {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) {
    return <FileArchive className={`${className} text-amber-500`} />;
  }
  if (/\.(xls|xlsx|csv)$/i.test(name)) {
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  }
  if (/\.(doc|docx|txt|rtf|ppt|pptx)$/i.test(name)) {
    return <FileText className={`${className} text-indigo-500`} />;
  }
  return <File className={`${className} text-slate-500`} />;
}

const resolveUrl = (rawUrl) => {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("/uploads")) return `/backend${rawUrl}`;
  return rawUrl;
};

export default function NoticeAttachment({
  notice,
  compact = false,
  showPreview = true,
}) {
  const [lightboxImg, setLightboxImg] = useState(null);

  // Collect all attachments
  let items = [];
  if (Array.isArray(notice?.attachments) && notice.attachments.length > 0) {
    items = notice.attachments;
  } else if (notice?.filePath) {
    items = [
      {
        filePath: notice.filePath,
        originalName: notice.originalName,
        fileMime: notice.fileMime,
        fileSize: notice.fileSize,
      },
    ];
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const fileUrl = resolveUrl(item.filePath);
        const isImg = isImageAttachment(item);
        const isPdf = item.fileMime?.includes("pdf") || /\.pdf$/i.test(item.originalName || "");
        const shouldShowImage = showPreview && isImg;

        return (
          <div key={item.filePath || idx} className="space-y-2">
            {/* Image Preview Banner */}
            {shouldShowImage && (
              <div
                onClick={() => setLightboxImg(fileUrl)}
                className="group/img relative block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shadow-2xs"
                title="Click to expand preview"
              >
                <img
                  src={fileUrl}
                  alt={item.originalName || "Notice attachment"}
                  className="h-44 w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs backdrop-blur-2xs">
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </div>
              </div>
            )}

            {/* Document / File card matching main project materials card */}
            <div className="flex min-w-0 items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                  <AttachmentIcon notice={item} />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-xs font-bold text-slate-800 dark:text-white"
                    title={item.originalName}
                  >
                    {item.originalName || "Attached file"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(item.fileSize)} {isPdf ? "• PDF" : ""}
                  </p>
                </div>
              </div>

              {/* Action buttons (Preview, Download) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                  title="Open file in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={item.originalName || true}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                  title="Download attachment"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        );
      })}

      {/* Lightbox Modal for images */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden bg-slate-900 p-2 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImg}
              alt="Notice Attachment Preview"
              className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
