"use client";

import React, { useState } from "react";
import {
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  File,
  Download,
  ExternalLink,
  Eye,
  X,
  Paperclip,
} from "lucide-react";

export const formatFileSize = (bytes) => {
  const b = Number(bytes || 0);
  if (!b) return "Unknown size";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileIcon = (fileType = "", originalName = "", className = "w-4 h-4") => {
  const ext = originalName.split(".").pop()?.toLowerCase() || "";
  const type = (fileType || "").toLowerCase();

  if (type === "pdf" || ext === "pdf") {
    return <FileText className={`${className} text-rose-500`} />;
  }
  if (type === "image" || ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return <FileImage className={`${className} text-sky-500`} />;
  }
  if (type === "archive" || ["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <FileArchive className={`${className} text-amber-500`} />;
  }
  if (type === "spreadsheet" || ["xls", "xlsx", "csv"].includes(ext)) {
    return <FileSpreadsheet className={`${className} text-emerald-500`} />;
  }
  if (type === "presentation" || ["ppt", "pptx"].includes(ext)) {
    return <FileText className={`${className} text-orange-500`} />;
  }
  if (type === "document" || ["doc", "docx", "rtf", "odt", "txt"].includes(ext)) {
    return <FileText className={`${className} text-indigo-500`} />;
  }
  if (["js", "jsx", "ts", "tsx", "py", "html", "css", "json", "c", "cpp", "java"].includes(ext)) {
    return <FileCode className={`${className} text-purple-500`} />;
  }
  return <File className={`${className} text-slate-500`} />;
};

export default function NoticeAttachment({ attachments, singleAttachment }) {
  const [lightboxImg, setLightboxImg] = useState(null);

  // Normalize attachments array
  let list = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    list = attachments;
  } else if (singleAttachment && singleAttachment.filePath) {
    list = [singleAttachment];
  }

  if (list.length === 0) return null;

  const resolveUrl = (rawUrl) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("http")) return rawUrl;
    if (rawUrl.startsWith("/uploads")) return `/backend${rawUrl}`;
    return rawUrl;
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Paperclip className="w-3.5 h-3.5" />
        <span>Attachments ({list.length})</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {list.map((att, idx) => {
          const fileUrl = resolveUrl(att.filePath);
          const isImg =
            att.fileType === "image" ||
            /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(att.originalName || "");
          const isPdf =
            att.fileType === "pdf" ||
            /\.pdf$/i.test(att.originalName || "");

          return (
            <div
              key={att.filePath || idx}
              className="group flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/70 hover:border-indigo-400 dark:hover:border-indigo-600 transition shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {isImg ? (
                  <button
                    type="button"
                    onClick={() => setLightboxImg(fileUrl)}
                    className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer group-hover:ring-2 ring-indigo-500/50"
                  >
                    <img
                      src={fileUrl}
                      alt={att.originalName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </div>
                  </button>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
                    {getFileIcon(att.fileType, att.originalName, "w-4 h-4")}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                    title={att.originalName}
                  >
                    {att.originalName || "Attached Document"}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {formatFileSize(att.fileSize)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {isPdf && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="View PDF in new tab"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {isImg && (
                  <button
                    type="button"
                    onClick={() => setLightboxImg(fileUrl)}
                    title="Preview Image"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <a
                  href={fileUrl}
                  download={att.originalName || "download"}
                  title="Download File"
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/80 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-600 dark:text-slate-300 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Preview Modal */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700"
          >
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImg}
              alt="Attachment Full View"
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
