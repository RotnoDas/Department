"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  Calendar, 
  BellRing, 
  Sparkles, 
  Lock, 
  Globe, 
  Volume2, 
  Paperclip, 
  Search, 
  X,
  User,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

// Realistic fallback notices matching current university database
const DEFAULT_NOTICES = [
  { 
    id: "6ad60ad063a0abd764d6dd89", 
    date: "19", 
    month: "OCT", 
    year: "2026",
    title: "Undergraduate Admission & Open Day Orientation 2026", 
    content: "The Department of Computer Science & Engineering welcomes all prospective applicants and general public to the Annual Department Open Day. Campus tours, laboratory demonstrations, and faculty interactions will be hosted on Saturday at 10:00 AM.",
    authorName: "Dept Admission Desk",
    category: "Public Notice", 
    priority: "High",
    isPublic: true,
    hasAudio: false,
    hasAttachment: false,
  },
  { 
    id: "6acbef171f25736c01737187", 
    date: "25", 
    month: "OCT", 
    year: "2026",
    title: "Annual Department Programming Contest & Techfest 2026", 
    content: "Registration for the Inter-University Programming Contest (IUPC) 2026 is officially open. Enrolled student teams across all batches are encouraged to submit team rosters by October 25.",
    authorName: "CSE Club & Dept Admin",
    category: "Event", 
    priority: "Normal",
    isPublic: true,
    hasAudio: false,
    hasAttachment: false,
  },
  { 
    id: "6ad4ba0680a4267fb2860d69", 
    date: "18", 
    month: "OCT", 
    year: "2026",
    title: "Final Exam Schedule & Voice Note 2026", 
    content: "All students, invigilators, and faculty members must adhere to the newly published examination code of conduct and seating arrangements. Please listen to the attached voice memo.",
    authorName: "Department Administration",
    category: "Academic (Internal)", 
    priority: "High",
    isPublic: false,
    hasAudio: true,
    hasAttachment: true,
  },
  { 
    id: "6acbef171f25736c01737188", 
    date: "11", 
    month: "OCT", 
    year: "2026",
    title: "Software & Hardware Lab Maintenance Schedule", 
    content: "Routine operating system and AI/ML toolchain upgrades will be executed on Software Lab 1 workstations this weekend. Workstation access will resume on Monday.",
    authorName: "Lab System Admin",
    category: "Internal Dept", 
    priority: "Normal",
    isPublic: false,
    hasAudio: false,
    hasAttachment: false,
  },
  { 
    id: "6ad5877b17eeced103c29b15", 
    date: "19", 
    month: "OCT", 
    year: "2026",
    title: "Greetings & Semester Commencement Audio Broadcast", 
    content: "Official welcome broadcast from the department head for the new academic semester with attached presentation slides and voice note.",
    authorName: "Department Admin",
    category: "Public", 
    priority: "Normal",
    isPublic: true,
    hasAudio: true,
    hasAttachment: true,
  },
];

export function EventsNotices() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [notices, setNotices] = useState(DEFAULT_NOTICES);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "public" | "internal"
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadNotices() {
      try {
        setLoading(true);
        const res = await fetch("/backend/api/notices");
        if (res.ok) {
          const data = await res.json();
          if (data?.notices && data.notices.length > 0) {
            // Exclude course-specific classroom notices from the public landing showcase
            const publicDeptNotices = data.notices.filter((n) => n.noticeType !== "course" && !n.courseCode);
            if (publicDeptNotices.length > 0) {
              const mapped = publicDeptNotices.map((n, i) => {
                const d = n.createdAt ? new Date(n.createdAt) : new Date();
                const isPub = Boolean(n.isPublic);
                return {
                  id: String(n._id || n.id || i + 1),
                  date: String(d.getDate()).padStart(2, "0"),
                  month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
                  year: String(d.getFullYear()),
                  title: n.title,
                  content: n.content || "",
                  authorName: n.authorName || n.author?.name || "Department Admin",
                  category: n.category || (isPub ? "Public Notice" : "Academic"),
                  priority: n.priority || "Normal",
                  isPublic: isPub,
                  hasAudio: Boolean(n.audio?.filePath),
                  hasAttachment: Boolean(n.filePath || (n.attachments && n.attachments.length > 0)),
                };
              });
              setNotices(mapped);
            }
          }
        }
      } catch {
        // Silently use realistic defaults on network disruption
      } finally {
        setLoading(false);
      }
    }
    loadNotices();
  }, []);

  const handleNoticeClick = (e, notice) => {
    e.preventDefault();
    const targetUrl = `/notices/${notice.id}`;
    if (notice.isPublic || user) {
      router.push(targetUrl);
    } else {
      toast("Please sign in to read this internal department notice", { icon: "🔒" });
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
    }
  };

  const publicCount = useMemo(() => notices.filter((n) => n.isPublic).length, [notices]);
  const internalCount = useMemo(() => notices.filter((n) => !n.isPublic).length, [notices]);

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      // Visibility filter
      if (filterTab === "public" && !n.isPublic) return false;
      if (filterTab === "internal" && n.isPublic) return false;

      // Keyword search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title?.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q) ||
        n.authorName?.toLowerCase().includes(q) ||
        n.category?.toLowerCase().includes(q)
      );
    });
  }, [notices, filterTab, searchQuery]);

  return (
    <div id="notices" className="py-20 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      
      {/* Dynamic Ambient Blur Orbs */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 blur-[120px] rounded-full -z-10" />

      {/* Section Header with Refined Department Branding */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6 pb-6 border-b border-slate-200/70 dark:border-white/10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            <BellRing className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>Official Circulars & Broadcasts</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Department Notices & Circulars
          </h2>
          
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
            Real-time circulars, public university announcements, examination schedules, and voice notes. Public notices are openly accessible to all guests and applicants.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
              filterTab === "all"
                ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Broadcasts ({notices.length})
          </button>
          
          <button
            type="button"
            onClick={() => setFilterTab("public")}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              filterTab === "public"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Notices ({publicCount})</span>
          </button>
          
          <button
            type="button"
            onClick={() => setFilterTab("internal")}
            className={`py-2 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              filterTab === "internal"
                ? "bg-amber-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Members Only ({internalCount})</span>
          </button>
        </div>

        {/* Real-time Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search circulars by headline, keywords, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-9 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-xl transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Guest Notice Callout Bar (when not signed in) */}
      {!user && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-purple-500/10 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                <span>Public Notice Section is Open to All Visitors</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                  Guest Accessible
                </span>
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                Prospective students and public visitors can click and read any public notice directly. Internal academic circulars require student or teacher sign in.
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

      {/* Notices Grid: Responsive 3-Column State-of-the-art Cards */}
      {filteredNotices.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-300 dark:border-slate-700 backdrop-blur-xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 mx-auto flex items-center justify-center">
            <BellRing className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {searchQuery ? "No circulars found matching your search" : "No notices available in this category"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No circulars match "${searchQuery}". Try clearing search or selecting another category.`
              : "Check back later for newly published departmental circulars and voice announcements."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer transition"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotices.map((notice, idx) => {
            const isPublicNotice = Boolean(notice.isPublic);
            const isRestrictedGuest = !isPublicNotice && !user;

            return (
              <motion.div
                key={notice.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: idx * 0.06 }}
                onClick={(e) => handleNoticeClick(e, notice)}
                className="group flex flex-col justify-between p-6 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/60 shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(79,70,229,0.12)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                title={
                  isPublicNotice
                    ? "Public Notice • Click to view dedicated page"
                    : (user ? "Internal Circular • Click to view" : "Members Only • Sign in required")
                }
              >
                {/* Ambient Top Glow Line */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isPublicNotice 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                    : "bg-gradient-to-r from-amber-500 to-indigo-500"
                } opacity-80 group-hover:h-1.5 transition-all duration-300`} />

                {/* Subtle Inner Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 dark:from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  {/* Card Meta Top Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    
                    {/* Public or Members Badge */}
                    {isPublicNotice ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                        <Globe className="w-3 h-3 text-emerald-500" />
                        <span>Public Notice</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Members Only</span>
                      </span>
                    )}

                    {/* Date Pill & Media Badges */}
                    <div className="flex items-center gap-2">
                      {notice.hasAudio && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50"
                          title="Contains audio announcement"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Voice</span>
                        </span>
                      )}
                      
                      {notice.hasAttachment && (
                        <span 
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50"
                          title="Contains attachments"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>File</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{notice.month} {notice.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {notice.title}
                  </h3>

                  {/* Content Preview or Restricted Lock Banner */}
                  {isRestrictedGuest ? (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>Restricted Academic Document</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        Internal departmental circular. Sign in to view full instructions, syllabus plans, and audio notes.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {notice.content || "Click to inspect the complete announcement details on the official notice page."}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="relative z-10 pt-4 mt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 text-xs">
                  
                  {/* Author Signatory */}
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate text-[11px] font-medium">
                    <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate">{notice.authorName}</span>
                  </div>

                  {/* Action Link Text */}
                  <div className="flex items-center gap-1 font-bold shrink-0 transition-transform duration-200 group-hover:translate-x-1">
                    {isPublicNotice ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span>Read Notice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      user ? (
                        <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <span>View Circular</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-extrabold">
                          <span>Sign In</span>
                          <Lock className="w-3.5 h-3.5" />
                        </span>
                      )
                    )}
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Bottom Archive Banner */}
      <div className="mt-12 p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Looking for older departmental records or semester archives?
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Browse our complete searchable archive with voice memos, downloadable circular PDFs, and official digital letterheads.
            </p>
          </div>
        </div>

        <Link
          href="/notices"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700/80 shadow-xs transition shrink-0"
        >
          <span>Open Full Notice Board</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
