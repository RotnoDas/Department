"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Plus,
  RefreshCw,
  Search,
  X,
  Globe,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import NoticeCard from "./NoticeCard";
import NoticeModal from "./NoticeModal";
import { SectionCollapseToggle, CollapsibleBody } from "@/components/dashboard/CollapsibleSection";

export default function NoticeBoardSection({
  isAdmin = false,
  title = "Department Notice Board",
  subtitle = "Official circulars, academic notices, and audio announcements for all department members.",
  defaultFilter = "all",
  isCollapsed: controlledCollapsed,
  onToggle: controlledOnToggle,
  defaultCollapsed = false,
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = controlledOnToggle || (() => setInternalCollapsed(!internalCollapsed));

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState(defaultFilter); // "all" | "public" | "internal"

  // Admin modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  const fetchNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/backend/api/notices", {
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
      toast.error("Could not load notices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const openPublishModal = () => {
    setEditingNotice(null);
    setIsModalOpen(true);
  };

  const openEditModal = (notice) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNotice(null);
  };

  const handleDelete = async (notice) => {
    const noticeId = notice.id || notice._id;
    if (!window.confirm(`Delete "${notice.title}"?`)) return;

    try {
      const res = await fetch(`/backend/api/notices/${noticeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Notice deleted.");
        setNotices((prev) =>
          prev.filter((n) => (n.id || n._id) !== noticeId)
        );
      } else {
        toast.error(data.error || "Failed to delete notice.");
      }
    } catch {
      toast.error("Network error deleting notice.");
    }
  };

  const handleNoticeSaved = () => {
    fetchNotices();
  };

  const publicCount = useMemo(() => notices.filter((n) => n.isPublic).length, [notices]);
  const internalCount = useMemo(() => notices.filter((n) => !n.isPublic).length, [notices]);

  // Real-time keyword & category filter
  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      // Visibility filter
      if (filterType === "public" && !n.isPublic) return false;
      if (filterType === "internal" && n.isPublic) return false;

      // Keyword filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.authorName?.toLowerCase().includes(q) ||
        n.originalName?.toLowerCase().includes(q)
      );
    });
  }, [notices, searchQuery, filterType]);

  return (
    <div
      id="notices"
      className="p-6 sm:p-8 rounded-[2rem] bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-white dark:border-white/10 shadow-sm space-y-6 transition-colors scroll-mt-6"
    >
      {/* Section Header matching main project hub design */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">
            <Bell className="w-3.5 h-3.5 text-indigo-500" />
            <span>Official Broadcasts & Circulars</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5 flex-wrap">
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
            disabled={loading}
            title="Refresh notices"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openPublishModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Notice</span>
            </button>
          )}

          <SectionCollapseToggle
            isCollapsed={isCollapsed}
            onToggle={toggleCollapse}
            label={title}
          />
        </div>
      </div>

      <CollapsibleBody
        isCollapsed={isCollapsed}
        onExpand={toggleCollapse}
        sectionName={title}
      >
        {/* Guest Notice Callout Banner */}
      {!user && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Public Notice Board • Open to All</span>
                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  Guest Accessible
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                All public notices, event announcements, and admission circulars can be viewed by anyone without signing in. Internal notices require student or faculty sign in.
              </p>
            </div>
          </div>
          <Link
            href="/login?redirect=/notices"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition shrink-0"
          >
            <span>Sign In for Members Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Visibility Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
              filterType === "all"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Broadcasts ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("public")}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === "public"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Notices ({publicCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType("internal")}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterType === "internal"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Members Only ({internalCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars by headline, keywords, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {searchQuery && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 self-center">
            Found {filteredNotices.length} of {notices.length} circulars
          </span>
        )}
      </div>

      {/* Notices Grid matching main project card layout */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              </div>
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
              <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? "No circulars match your search" : "No Notices Published"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No circulars found matching "${searchQuery}". Try clearing your search query.`
              : "Check back later for departmental announcements, academic circulars, and audio updates."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer hover:bg-indigo-700 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div
          data-lenis-prevent
          className="max-h-[620px] overflow-y-auto overscroll-contain pr-1 scrollbar-thin"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotices.map((notice, idx) => (
              <NoticeCard
                key={notice._id || notice.id || `notice-${idx}`}
                notice={notice}
                isAdmin={isAdmin}
                onEdit={openEditModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}
      </CollapsibleBody>

      {/* Admin Publish/Edit Modal */}
      {isAdmin && (
        <NoticeModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onNoticeSaved={handleNoticeSaved}
          editingNotice={editingNotice}
        />
      )}
    </div>
  );
}
