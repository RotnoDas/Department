"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Bell,
  Search,
  Filter,
  Plus,
  Pin,
  Headphones,
  Paperclip,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import NoticeCard from "./NoticeCard";
import NoticeModal from "./NoticeModal";

export default function NoticeBoardSection({
  audience = "all", // "student" | "teacher" | "staff" | "all"
  isAdmin = false,
  title = "Department Notice Board & Circulars",
  subtitle = "Official circulars, academic notices, and audio announcements",
}) {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");

  // Admin modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  const fetchNotices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (audience && audience !== "all") {
        params.append("audience", audience);
      }
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/backend/api/notices${queryString}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok && data?.notices) {
        setNotices(data.notices);
      } else {
        throw new Error(data.error || "Failed to load notices.");
      }
    } catch (err) {
      console.warn("[NoticeBoardSection] Fetch error:", err.message);
      toast.error("Could not load latest notices.");
    } finally {
      setIsLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // Handle Pin toggle
  const handleTogglePin = async (notice) => {
    try {
      const res = await fetch(`/backend/api/notices/${notice._id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !notice.pinned }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message);
        setNotices((prev) =>
          prev.map((n) => (n._id === notice._id ? { ...n, pinned: data.pinned } : n))
        );
      } else {
        toast.error(data.error || "Failed to update pin state.");
      }
    } catch {
      toast.error("Network error toggling pin state.");
    }
  };

  // Handle Delete
  const handleDelete = async (noticeId) => {
    if (!confirm("Are you sure you want to permanently delete this notice and its attachments?")) {
      return;
    }
    try {
      const res = await fetch(`/backend/api/notices/${noticeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Notice deleted.");
        setNotices((prev) => prev.filter((n) => n._id !== noticeId));
      } else {
        toast.error(data.error || "Failed to delete notice.");
      }
    } catch {
      toast.error("Error deleting notice.");
    }
  };

  const handleEdit = (notice) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  const handleNoticeSaved = (savedNotice) => {
    if (editingNotice) {
      setNotices((prev) =>
        prev.map((n) => (n._id === savedNotice._id ? savedNotice : n))
      );
    } else {
      setNotices((prev) => [savedNotice, ...prev]);
    }
  };

  // Filter categories
  const categories = useMemo(() => {
    const cats = new Set(["All"]);
    notices.forEach((n) => {
      if (n.category) cats.add(n.category);
    });
    return Array.from(cats);
  }, [notices]);

  // Filtered notices
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchesSearch =
        !searchQuery.trim() ||
        n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" ||
        n.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesPriority =
        selectedPriority === "All" ||
        n.priority?.toLowerCase() === selectedPriority.toLowerCase();

      return matchesSearch && matchesCategory && matchesPriority;
    });
  }, [notices, searchQuery, selectedCategory, selectedPriority]);

  // Stats
  const pinnedCount = notices.filter((n) => n.pinned).length;
  const audioCount = notices.filter((n) => n.audio?.filePath).length;
  const attachmentsCount = notices.filter(
    (n) => (n.attachments && n.attachments.length > 0) || n.filePath
  ).length;

  return (
    <div
      id="notices"
      className="p-6 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <Bell className="w-3.5 h-3.5" />
            <span>Official Announcements</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{title}</span>
            {notices.length > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold">
                {notices.length} Active
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={fetchNotices}
            disabled={isLoading}
            title="Refresh notices"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingNotice(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch New Notice</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick stats pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Notices</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{notices.length}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Pin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Pinned Top</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{pinnedCount}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Voice Notes</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{audioCount}</p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <Paperclip className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">File Documents</p>
            <p className="text-sm font-extrabold text-slate-900 dark:text-white">{attachmentsCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars, title, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
        </div>

        {/* Priority & Category dropdowns */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent Only</option>
            <option value="Important">Important Only</option>
            <option value="Normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === cat
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notices Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-16 w-full rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : filteredNotices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((notice) => (
            <NoticeCard
              key={notice._id}
              notice={notice}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No notices match your criteria
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery || selectedCategory !== "All"
              ? "Try resetting your search query or category filters."
              : "Check back later for official departmental circulars and announcements."}
          </p>
        </div>
      )}

      {/* Admin Notice Create/Edit Modal */}
      {isAdmin && (
        <NoticeModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingNotice(null);
          }}
          onNoticeSaved={handleNoticeSaved}
          editingNotice={editingNotice}
        />
      )}
    </div>
  );
}
