"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bell, 
  Calendar, 
  User, 
  ArrowLeft, 
  Download, 
  Share2, 
  Printer, 
  CheckCircle, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  Lock,
  Headphones,
  Sparkles,
  ExternalLink,
  Globe
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { authClient } from "@/lib/auth-client";
import { Navbar } from "@/components/navbar/Navbar";
import { Footer } from "@/components/footer/Footer";
import NoticeAudioPlayer from "@/components/notice/NoticeAudioPlayer";
import NoticeAttachment from "@/components/notice/NoticeAttachment";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

// Fallback notices for local sample IDs
const SAMPLE_NOTICES = {
  "1": {
    _id: "1",
    title: "Semester Final Examination Seating & Schedule published",
    content: "The semester final examinations will commence from November 15, 2026. All batches must verify their exam roll and designated exam halls beforehand. Mobile phones, programmable calculators, and unauthorized materials are strictly prohibited in the examination hall.\n\nPlease reach the exam hall at least 15 minutes prior to the commencement of the exam. Admit cards must be presented upon entry.",
    authorName: "Department Head & Exam Committee",
    category: "Exam",
    priority: "High",
    isPublic: false,
    createdAt: new Date().toISOString(),
  },
  "2": {
    _id: "2",
    title: "Annual Department Programming Contest & TechFest 2026",
    content: "Registration for the Inter-University Programming Contest (IUPC) 2026 is officially open. Teams consisting of three enrolled students are eligible to participate. The preliminary round will take place online on Oct 25, followed by the on-site final contest at Software Lab 1.",
    authorName: "CSE Club & Dept Administration",
    category: "Event",
    priority: "Normal",
    isPublic: true,
    createdAt: new Date().toISOString(),
  },
  "3": {
    _id: "3",
    title: "Course Registration for Upcoming Semester Open",
    content: "Course registration for batches 8, 9, and 10 is now open on the academic portal. Students are advised to consult with their academic advisors before final submission. Late registration fees will be applicable after the deadline.",
    authorName: "Academic Section, CSE",
    category: "Academic",
    priority: "Normal",
    isPublic: false,
    createdAt: new Date().toISOString(),
  },
  "4": {
    _id: "4",
    title: "Software Lab 1 Workstation Upgrade Completed",
    content: "Routine operating system and GPU toolchain upgrades have been successfully deployed on all 60 workstations in Software Lab 1. Docker, PyTorch, TensorFlow, and VS Code devcontainers are pre-configured.",
    authorName: "Lab In-Charge & System Admin",
    category: "Lab",
    priority: "Normal",
    isPublic: false,
    createdAt: new Date().toISOString(),
  },
  "5": {
    _id: "5",
    title: "Guest Seminar on Large Language Models in Autonomous Systems",
    content: "A distinguished guest lecture on 'Large Language Models in Autonomous Systems' will be delivered this Friday at 3:00 PM in the CSE Seminar Room. Faculty members, researchers, and senior students are cordially invited to attend.",
    authorName: "Research & Seminar Committee",
    category: "Seminar",
    priority: "Normal",
    isPublic: true,
    createdAt: new Date().toISOString(),
  }
};

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeId = params?.id;

  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const user = session?.user;

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Notice fetch - runs unconditionally for all visitors
  useEffect(() => {
    if (!noticeId) return;

    let isMounted = true;
    async function fetchNotice() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/backend/api/notices/${noticeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.notice && isMounted) {
            setNotice(data.notice);
            setLoading(false);
            return;
          }
        }

        // Try direct SERVER_URL fallback
        const directRes = await fetch(`${SERVER_URL}/api/notices/${noticeId}`);
        if (directRes.ok) {
          const directData = await directRes.json();
          if (directData?.notice && isMounted) {
            setNotice(directData.notice);
            setLoading(false);
            return;
          }
        }

        // Fallback to sample notice if available
        if (SAMPLE_NOTICES[noticeId] && isMounted) {
          setNotice(SAMPLE_NOTICES[noticeId]);
          setLoading(false);
          return;
        }

        throw new Error("Notice not found or could not be loaded.");
      } catch (err) {
        if (isMounted) {
          if (SAMPLE_NOTICES[noticeId]) {
            setNotice(SAMPLE_NOTICES[noticeId]);
          } else {
            setError(err.message || "Failed to load notice.");
          }
          setLoading(false);
        }
      }
    }

    fetchNotice();
    return () => {
      isMounted = false;
    };
  }, [noticeId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Notice link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Recently Published";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return String(dateString);
    }
  };

  // Auth Loading State (only if notice is not yet resolved or if we need session for internal check)
  if (isAuthPending && loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // Members-only notice protection: if notice is NOT public and user is not signed in
  const isPublicNotice = notice ? Boolean(notice.isPublic) : false;
  if (!loading && notice && !isPublicNotice && !user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/80 px-3 py-1 rounded-full">
              Members Only Notice
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white pt-2">Sign In Required</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            This notice is an internal departmental circular intended for registered students, faculty members, and staff. Please sign in to view the full circular.
          </p>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href={`/login?redirect=${encodeURIComponent(`/notices/${noticeId}`)}`}
              className="inline-flex items-center justify-center w-full h-12 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 dark:shadow-none transition-all gap-2"
            >
              <span>Sign In to Read Notice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/notices"
              className="inline-flex items-center justify-center w-full h-11 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Explore Public Notices</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40 relative">
      <Navbar />

      {/* Dynamic Background Blur Gradients */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px]">
        <div className="absolute top-[5%] left-[20%] h-[400px] w-[400px] rounded-full bg-indigo-300/20 dark:bg-indigo-800/20 blur-[130px]" />
        <div className="absolute top-[40%] right-[10%] h-[450px] w-[450px] rounded-full bg-purple-300/20 dark:bg-purple-900/20 blur-[140px]" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto pt-36 pb-24 px-4 sm:px-6 lg:px-8">
        
        {/* Top Breadcrumb & Action Toolbar */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <Link
            href="/#notices"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs transition-all hover:-translate-x-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Notices</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              title="Copy notice URL"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Share"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
              title="Print official document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 sm:p-12 rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl space-y-6 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
            <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-full" />
            <div className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/10">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 rounded-[2rem] bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center space-y-4">
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Return to Homepage
            </Link>
          </div>
        )}

        {/* Notice Content Card */}
        {notice && !loading && (
          <article className="rounded-[2.5rem] bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
            
            {/* Official Department Letterhead Banner */}
            <div className="px-6 sm:px-10 py-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200/50 dark:shadow-none">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Department of Computer Science & Engineering
                  </h4>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Pabna University of Science & Technology
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                  Ref: PUST/CSE/{notice._id ? notice._id.slice(-6).toUpperCase() : `ID-${notice.id || '01'}`}
                </span>
              </div>
            </div>

            {/* Document Header & Meta */}
            <div className="p-6 sm:p-10 space-y-6">
              
              {/* Badge & Date Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {notice.isPublic ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Public Notice • Open to All</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Internal Circular • Members Only</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{notice.category || "Official Circular"}</span>
                  </span>
                  
                  {notice.priority === "High" && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60">
                      High Priority
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(notice.createdAt || notice.date)}</span>
                </div>
              </div>

              {/* Notice Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                {notice.title}
              </h1>

              {/* Author Info Bar */}
              <div className="flex items-center gap-3 py-3 px-4 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {notice.authorName || (typeof notice.author === "string" ? notice.author : notice.author?.name) || "Department Administration"}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    Official Signatory • Department of CSE
                  </span>
                </div>
              </div>

              {/* Body Content */}
              <div className="py-4 border-t border-slate-100 dark:border-white/10">
                <div className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-normal space-y-4">
                  {notice.content || "Please refer to the attached document or official announcement for details."}
                </div>
              </div>

              {/* Voice Announcement Audio Player (if attached) */}
              {notice.audio?.filePath && (
                <div className="pt-2">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-transparent border border-purple-200/80 dark:border-purple-800/50 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      <Headphones className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>Audio Announcement</span>
                    </div>
                    <NoticeAudioPlayer audio={notice.audio} />
                  </div>
                </div>
              )}

              {/* File Attachments (if attached) */}
              {(notice.filePath || (notice.attachments && notice.attachments.length > 0)) && (
                <div className="pt-2">
                  <NoticeAttachment 
                    attachments={notice.attachments}
                    filePath={notice.filePath}
                    originalName={notice.originalName}
                    fileMime={notice.fileMime}
                    fileSize={notice.fileSize}
                  />
                </div>
              )}

              {/* Official Seal / Signature Footer */}
              <div className="pt-8 border-t border-slate-100 dark:border-white/10 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Digitally verified circular from Pabna University of Science & Technology.</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 dark:text-slate-400">
                  Document ID: {notice._id || notice.id}
                </span>
              </div>

            </div>

          </article>
        )}

      </main>

      <Footer />
    </div>
  );
}
