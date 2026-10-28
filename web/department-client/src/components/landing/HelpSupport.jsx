"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LifeBuoy, 
  MessageSquareWarning, 
  Mail, 
  ArrowRight, 
  Phone,
  Search,
  X,
  Copy,
  Check,
  Lock,
  Globe,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Send,
  Building2,
  FileQuestion,
  ExternalLink,
  ChevronRight,
  Inbox,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Activity
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";

export function HelpSupport() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  // Live submissions state - strictly live data, ZERO hardcoded defaults
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'complaint' | 'technical_support' | 'general_inquiry'
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Quick Tracking ID direct search state
  const [trackingCodeInput, setTrackingCodeInput] = useState("");
  const [trackLookupLoading, setTrackLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);

  // Modal states: 'complaint' | 'tech_support' | 'inquiry' | null
  const [activeModal, setActiveModal] = useState(null);

  // Submission success state
  const [submittedResult, setSubmittedResult] = useState(null); // { trackingId, type, message }
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch real submissions from database (public, sanitized)
  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      const res = await fetch("/backend/api/support/public");
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setSubmissions(data.items);
      }
    } catch (err) {
      console.warn("[HelpSupport] Failed to fetch submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Form states - Complaint
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    category: "academic",
    priority: "Normal",
    isAnonymous: false,
    authorName: "",
    authorEmail: "",
  });
  const [complaintLoading, setComplaintLoading] = useState(false);

  // Form states - Technical Support
  const [techForm, setTechForm] = useState({
    title: "",
    description: "",
    category: "portal_login",
    priority: "Medium",
    authorName: "",
    authorEmail: "",
  });
  const [techLoading, setTechLoading] = useState(false);

  // Form states - General Inquiry
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    topic: "admissions",
    message: "",
  });
  const [inquiryLoading, setInquiryLoading] = useState(false);

  // Pre-fill user data when opening modal
  const openModal = (type) => {
    if (type === "complaint" && isAdmin) {
      toast.error("Administrators cannot lodge complaints. You have resolving authority in the Admin Hub.");
      return;
    }

    setActiveModal(type);
    setSubmittedResult(null);

    const userName = user?.name || "";
    const userEmail = user?.email || "";

    if (type === "complaint") {
      setComplaintForm((prev) => ({
        ...prev,
        authorName: userName,
        authorEmail: userEmail,
      }));
    } else if (type === "tech_support") {
      setTechForm((prev) => ({
        ...prev,
        authorName: userName,
        authorEmail: userEmail,
      }));
    } else if (type === "inquiry") {
      setInquiryForm((prev) => ({
        ...prev,
        name: userName,
        email: userEmail,
      }));
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSubmittedResult(null);
  };

  const handleCopy = (text) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedCode(true);
      toast.success("Tracking ID copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Submit Complaint Handler
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    if (isAdmin) {
      toast.error("Administrators cannot lodge complaints. Please use the Admin Hub to review and resolve grievances.");
      return;
    }
    if (!complaintForm.title.trim()) return toast.error("Please enter a complaint subject.");
    if (!complaintForm.description.trim()) return toast.error("Please describe your grievance in detail.");

    setComplaintLoading(true);
    try {
      const res = await fetch("/backend/api/support/complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...complaintForm,
          authorRole: user?.role || "guest",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit complaint.");
      }

      setSubmittedResult({
        trackingId: data.trackingId,
        type: "complaint",
        message: data.message || "Complaint registered securely.",
      });
      toast.success("Complaint submitted successfully!");
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || "Failed to submit complaint.");
    } finally {
      setComplaintLoading(false);
    }
  };

  // Submit Technical Support Ticket Handler
  const handleTechSubmit = async (e) => {
    e.preventDefault();
    if (!techForm.title.trim()) return toast.error("Please enter the issue subject.");
    if (!techForm.description.trim()) return toast.error("Please describe the technical error.");
    if (!techForm.authorEmail.trim()) return toast.error("Please provide your contact email.");

    setTechLoading(true);
    try {
      const res = await fetch("/backend/api/support/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...techForm,
          authorRole: user?.role || "student",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create support ticket.");
      }

      setSubmittedResult({
        trackingId: data.trackingId,
        type: "technical_support",
        message: data.message || "Support ticket created.",
      });
      toast.success("IT Helpdesk ticket created!");
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || "Failed to create ticket.");
    } finally {
      setTechLoading(false);
    }
  };

  // Submit General Inquiry Handler
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (!inquiryForm.name.trim()) return toast.error("Please enter your name.");
    if (!inquiryForm.email.trim()) return toast.error("Please enter your email.");
    if (!inquiryForm.message.trim()) return toast.error("Please enter your inquiry message.");

    setInquiryLoading(true);
    try {
      const res = await fetch("/backend/api/support/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inquiryForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send inquiry.");
      }

      setSubmittedResult({
        trackingId: data.trackingId,
        type: "general_inquiry",
        message: data.message || "Inquiry sent to Department Office.",
      });
      toast.success("Inquiry sent successfully!");
      fetchSubmissions();
    } catch (err) {
      toast.error(err.message || "Failed to send inquiry.");
    } finally {
      setInquiryLoading(false);
    }
  };

  // Track code direct query lookup
  const handleTrackLookup = async (e) => {
    e?.preventDefault();
    const code = trackingCodeInput.trim().toUpperCase();
    if (!code) return toast.error("Please enter a tracking reference code.");

    setTrackLookupLoading(true);
    try {
      const res = await fetch(`/backend/api/support/track/${encodeURIComponent(code)}`);
      const data = await res.json();
      if (!res.ok || !data.success || !data.found) {
        throw new Error(data.error || `No record found for "${code}".`);
      }
      setLookupResult(data.data);
      toast.success("Submission record located!");
    } catch (err) {
      setLookupResult(null);
      toast.error(err.message || "Record not found.");
    } finally {
      setTrackLookupLoading(false);
    }
  };

  // Filtered submissions for display
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      if (activeFilter !== "all" && item.type !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (item.title || "").toLowerCase().includes(q);
        const matchesCode = (item.trackingId || "").toLowerCase().includes(q);
        const matchesCategory = (item.category || "").toLowerCase().includes(q);
        const matchesAuthor = (item.authorName || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesCode && !matchesCategory && !matchesAuthor) {
          return false;
        }
      }
      return true;
    });
  }, [submissions, activeFilter, searchQuery]);

  const counts = useMemo(() => ({
    all: submissions.length,
    complaint: submissions.filter((s) => s.type === "complaint").length,
    technical_support: submissions.filter((s) => s.type === "technical_support").length,
    general_inquiry: submissions.filter((s) => s.type === "general_inquiry").length,
  }), [submissions]);

  return (
    <div id="support" className="py-24 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
      
      {/* Background Decorative Blur */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-sky-500/10 via-rose-500/10 to-emerald-500/10 blur-[130px] rounded-full -z-10" />

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Student & Public Assistance</span>
        </motion.div>
        
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white"
        >
          Support & Complaints Desk
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal leading-relaxed"
        >
          Resolve academic inquiries, report technical portal errors, or lodge confidential grievances directly to department administration.
        </motion.p>
      </div>

      {/* 3 Main Interactive Support Action Cards */}
      <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-16">
        
        {/* 1. Technical Support Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4 }}
          className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-7 sm:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200/80 dark:border-white/10 hover:border-sky-400 dark:hover:border-sky-500/60 hover:shadow-[0_20px_45px_rgba(14,165,233,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-100 dark:border-sky-900/40 flex items-center justify-center text-sky-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <LifeBuoy className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800/50">
                IT & Portal Helpdesk
              </div>
              <h3 className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                Technical Support
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-normal leading-relaxed text-xs sm:text-sm">
                Facing issues with student/teacher login, attendance scanning, course registration, or lab toolchains? Submit a support ticket for immediate helpdesk review.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/10 space-y-3">
            <button
              type="button"
              onClick={() => openModal("tech_support")}
              className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Create Support Ticket</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Direct assistance • Response within 24h
            </p>
          </div>
        </motion.div>

        {/* 2. Lodge a Grievance & Complaint Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="group relative overflow-hidden bg-gradient-to-br from-rose-600 to-rose-700 dark:from-rose-600 dark:to-rose-800 p-7 sm:p-8 rounded-[2.5rem] shadow-[0_15px_35px_rgba(244,63,94,0.3)] hover:shadow-[0_25px_50px_rgba(244,63,94,0.45)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between text-white"
        >
          {/* Subtle pattern background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

          <div className="relative z-10 space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform duration-300">
              <MessageSquareWarning className="h-7 w-7 text-white" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-rose-100 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20 backdrop-blur-xs">
                {isAdmin ? "Admin Resolving Authority" : "Confidential Grievance Box"}
              </div>
              <h3 className="font-extrabold text-xl text-white tracking-tight">
                {isAdmin ? "Grievance Resolution Desk" : "Lodge a Complaint"}
              </h3>
              <p className="text-rose-100 font-normal leading-relaxed text-xs sm:text-sm">
                {isAdmin
                  ? "As an administrator, you have full authority to investigate, assign, and resolve student and faculty grievances directly in the Admin Hub."
                  : "Have any academic, administrative, facility, or disciplinary grievances? Drop them here securely. 100% anonymous submission is supported and protected."}
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/20 space-y-3">
            {isAdmin ? (
              <>
                <Link
                  href="/dashboard/admin"
                  className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm text-rose-700 bg-white hover:bg-rose-50 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="h-4 w-4 text-rose-700" />
                  <span>Review & Solve Grievances</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-[11px] text-center text-amber-200 font-semibold">
                  Admin Privileges • Manage & Solve in Admin Portal
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openModal("complaint")}
                  className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm text-rose-700 bg-white hover:bg-rose-50 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Submit Official Complaint</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-[11px] text-center text-rose-100/90 font-medium">
                  Confidential • Sent to Administration
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* 3. General Office Inquiry Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-7 sm:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-slate-200/80 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500/60 hover:shadow-[0_20px_45px_rgba(16,185,129,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
        >
          <div className="space-y-5">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
              <Mail className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                Department Office
              </div>
              <h3 className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">
                General Inquiry
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-normal leading-relaxed text-xs sm:text-sm">
                Need information regarding admissions, transcript verification, department tours, or sponsorships? Reach out to the department main office.
              </p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/10 space-y-3">
            <button
              type="button"
              onClick={() => openModal("inquiry")}
              className="w-full h-12 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Send General Inquiry</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Hotline: +880 1712-345678</span>
              <a href="tel:+8801712345678" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">
                Call Now
              </a>
            </div>
          </div>
        </motion.div>

      </div>

      {/* ── LIVE DESK SUBMISSIONS & REAL-TIME TRACKING ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="mt-4 mb-16 rounded-[2.5rem] bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-none p-6 sm:p-10 space-y-8"
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-white/10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span>Real-Time Support Desk Log</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Recent Submissions & Tracking
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Live transparency registry of grievances, technical helpdesk requests, and official inquiries. Only real submissions appear here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSubmissions}
              disabled={loadingSubmissions}
              title="Refresh submissions"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loadingSubmissions ? "animate-spin text-indigo-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* Toolbar: Filter Pills & Search */}
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "All Submissions", count: counts.all },
              { key: "complaint", label: "Grievances", count: counts.complaint },
              { key: "technical_support", label: "IT Helpdesk", count: counts.technical_support },
              { key: "general_inquiry", label: "Inquiries", count: counts.general_inquiry },
            ].map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Track by Reference Code Form */}
          <form onSubmit={handleTrackLookup} className="flex items-center gap-2 max-w-md w-full lg:w-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Track by Code (e.g. CMP-...)"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={trackLookupLoading}
              className="h-10 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm cursor-pointer disabled:opacity-50 transition whitespace-nowrap"
            >
              {trackLookupLoading ? "Tracking..." : "Track Status"}
            </button>
          </form>
        </div>

        {/* Real-time Tracking Code Result Modal/Card (if user queried a code) */}
        {lookupResult && (
          <div className="p-5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-3 relative">
            <button
              type="button"
              onClick={() => setLookupResult(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Tracking Details for {lookupResult.trackingId}
              </span>
            </div>
            <h4 className="font-bold text-base text-slate-900 dark:text-white">
              {lookupResult.title}
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Status: <strong className="text-indigo-600 dark:text-indigo-400">{lookupResult.status}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Category: {lookupResult.category}
              </span>
            </div>
            {lookupResult.adminResponse && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Administration Note: </span>
                {lookupResult.adminResponse}
              </div>
            )}
          </div>
        )}

        {/* Submissions Content */}
        {loadingSubmissions ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          /* Empty State - STRICTLY ZERO DEFAULT MOCK DATA */
          <div className="text-center py-12 px-4 rounded-3xl bg-slate-50/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-base font-extrabold text-slate-800 dark:text-slate-200">
              No Complaints or Inquiries Logged Yet
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              The departmental support registry is clean. When a student, teacher, or visitor submits a grievance or inquiry using the forms above, it will be automatically registered and displayed here in real time.
            </p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No submissions found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubmissions.map((item) => {
              const isExpanded = expandedId === item.id;
              const isResolved = ["resolved", "closed"].includes(String(item.status || "").toLowerCase());
              const isInProgress = ["in progress", "under review", "investigating"].includes(String(item.status || "").toLowerCase());

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-800/80 p-4 sm:p-5 transition hover:border-slate-300 dark:hover:border-white/20 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Tracking ID with copy */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.trackingId)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 cursor-pointer transition"
                        title="Copy Reference Code"
                      >
                        <span>{item.trackingId}</span>
                        <Copy className="w-3 h-3 opacity-60" />
                      </button>

                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          item.type === "complaint"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                            : item.type === "technical_support"
                            ? "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                        }`}
                      >
                        {item.type === "complaint"
                          ? "Grievance"
                          : item.type === "technical_support"
                          ? "IT Support"
                          : "Inquiry"}
                      </span>

                      {/* Category Badge */}
                      {item.category && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md capitalize">
                          {item.category.replace("_", " ")}
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <Link
                          href="/dashboard/admin"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 text-[11px] font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                          title="Open Admin Hub to Resolve"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Solve</span>
                        </Link>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          isResolved
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                            : isInProgress
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                        }`}
                      >
                        {isResolved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{item.status || "Submitted"}</span>
                      </span>

                      {/* Accordion toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        {item.isAnonymous ? (
                          <>
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Anonymous</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.authorName || "Department Member"}</span>
                          </>
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "Recently"}
                      </span>
                    </div>
                  </div>

                  {/* Admin Response Note Callout (if available) */}
                  {item.adminResponse && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black">Administrative Response: </span>
                        <span>{item.adminResponse}</span>
                      </div>
                    </div>
                  )}

                  {/* Expanded Description & Timeline */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-white/10 space-y-3 text-xs">
                      {item.description && (
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Description:</span>
                          <p className="text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                            {item.description}
                          </p>
                        </div>
                      )}

                      {/* Timeline */}
                      {Array.isArray(item.timeline) && item.timeline.length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Status Timeline:</span>
                          <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                            {item.timeline.map((step, sIdx) => (
                              <div key={sIdx} className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                <span>{step.note || step.status}</span>
                                <span className="text-[10px] text-slate-400">
                                  {step.at ? new Date(step.at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              
              {/* Submission Success State */}
              {submittedResult ? (
                <div className="text-center py-6 space-y-5">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-md">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      Delivered to Administration!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Your submission has been securely registered and routed directly to the Department Administration office. An administrator will review your case shortly.
                    </p>
                  </div>

                  {/* Reference ID Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 max-w-sm mx-auto">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Administrative Reference Code
                    </span>
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-mono text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
                        {submittedResult.trackingId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(submittedResult.trackingId)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 cursor-pointer transition"
                        title="Copy Reference Code"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-8 py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md cursor-pointer transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-2xl flex items-center justify-center text-white ${
                        activeModal === "complaint" 
                          ? "bg-rose-600" 
                          : activeModal === "tech_support" 
                          ? "bg-sky-600" 
                          : "bg-emerald-600"
                      }`}>
                        {activeModal === "complaint" && <MessageSquareWarning className="w-6 h-6" />}
                        {activeModal === "tech_support" && <LifeBuoy className="w-6 h-6" />}
                        {activeModal === "inquiry" && <Mail className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                          {activeModal === "complaint" && "Lodge a Formal Grievance"}
                          {activeModal === "tech_support" && "Create Technical Helpdesk Ticket"}
                          {activeModal === "inquiry" && "Submit Department Inquiry"}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Department of Computer Science & Engineering
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeModal}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* ── COMPLAINT FORM ───────────────────────────────────── */}
                  {activeModal === "complaint" && (
                    <form onSubmit={handleComplaintSubmit} className="space-y-4">
                      {/* Anonymous Protection Switch */}
                      <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <label 
                            htmlFor="anonymous-complaint-toggle"
                            className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                            <span>100% Anonymous Grievance</span>
                          </label>
                          <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                            Your name, email, and identity will not be logged in the public records.
                          </p>
                        </div>
                        <input
                          id="anonymous-complaint-toggle"
                          type="checkbox"
                          checked={complaintForm.isAnonymous}
                          onChange={(e) => setComplaintForm((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
                          className="h-5 w-5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Complaint Category
                          </label>
                          <select
                            value={complaintForm.category}
                            onChange={(e) => setComplaintForm((prev) => ({ ...prev, category: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            <option value="academic">Academic & Grading</option>
                            <option value="administrative">Administrative & Office</option>
                            <option value="facility">Labs, Equipment & WiFi</option>
                            <option value="disciplinary">Disciplinary & Conduct</option>
                            <option value="other">Other Grievance</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Urgency Level
                          </label>
                          <select
                            value={complaintForm.priority}
                            onChange={(e) => setComplaintForm((prev) => ({ ...prev, priority: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Critical">Critical Issue</option>
                          </select>
                        </div>
                      </div>

                      {/* Name / Email if NOT anonymous */}
                      {!complaintForm.isAnonymous && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Your Name
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. John Doe"
                              value={complaintForm.authorName}
                              onChange={(e) => setComplaintForm((prev) => ({ ...prev, authorName: e.target.value }))}
                              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Your Email (for updates)
                            </label>
                            <input
                              type="email"
                              placeholder="student@cse.pust.ac.bd"
                              value={complaintForm.authorEmail}
                              onChange={(e) => setComplaintForm((prev) => ({ ...prev, authorEmail: e.target.value }))}
                              className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Grievance Subject <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Software Lab 2 projector display failure during practical exam"
                          value={complaintForm.title}
                          onChange={(e) => setComplaintForm((prev) => ({ ...prev, title: e.target.value }))}
                          required
                          className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Detailed Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Please provide full details, dates, parties involved, or any previous attempts to resolve..."
                          value={complaintForm.description}
                          onChange={(e) => setComplaintForm((prev) => ({ ...prev, description: e.target.value }))}
                          required
                          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-rose-500 leading-relaxed resize-y"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={complaintLoading}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30 cursor-pointer disabled:opacity-50 transition flex items-center gap-1.5"
                        >
                          {complaintLoading ? "Submitting..." : "Submit Grievance"}
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ── TECHNICAL SUPPORT FORM ───────────────────────────── */}
                  {activeModal === "tech_support" && (
                    <form onSubmit={handleTechSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Problem Category
                          </label>
                          <select
                            value={techForm.category}
                            onChange={(e) => setTechForm((prev) => ({ ...prev, category: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="portal_login">Portal Login & Auth</option>
                            <option value="course_reg">Course Registration</option>
                            <option value="attendance_geofence">Attendance & Face Scan</option>
                            <option value="lab_workstation">Lab Workstation Setup</option>
                            <option value="result_marks">Result & Marks Calculation</option>
                            <option value="other">Other Technical Bug</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Severity
                          </label>
                          <select
                            value={techForm.priority}
                            onChange={(e) => setTechForm((prev) => ({ ...prev, priority: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="Low">Low (General Query)</option>
                            <option value="Medium">Medium (Feature blocked)</option>
                            <option value="High">High (Cannot attend/login)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Your Name
                          </label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={techForm.authorName}
                            onChange={(e) => setTechForm((prev) => ({ ...prev, authorName: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Contact Email <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            placeholder="student@cse.pust.ac.bd"
                            value={techForm.authorEmail}
                            onChange={(e) => setTechForm((prev) => ({ ...prev, authorEmail: e.target.value }))}
                            required
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Issue Subject <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Smart geofence shows 'Out of Range' inside Room 302"
                          value={techForm.title}
                          onChange={(e) => setTechForm((prev) => ({ ...prev, title: e.target.value }))}
                          required
                          className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Description of Issue <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Please describe error messages, device model, or steps to reproduce the issue..."
                          value={techForm.description}
                          onChange={(e) => setTechForm((prev) => ({ ...prev, description: e.target.value }))}
                          required
                          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed resize-y"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={techLoading}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 shadow-md shadow-sky-600/30 cursor-pointer disabled:opacity-50 transition flex items-center gap-1.5"
                        >
                          {techLoading ? "Submitting..." : "Submit IT Ticket"}
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* ── GENERAL INQUIRY FORM ─────────────────────────────── */}
                  {activeModal === "inquiry" && (
                    <form onSubmit={handleInquirySubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Inquiry Topic
                        </label>
                        <select
                          value={inquiryForm.topic}
                          onChange={(e) => setInquiryForm((prev) => ({ ...prev, topic: e.target.value }))}
                          className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="admissions">Undergraduate Admissions & Intake</option>
                          <option value="transcripts">Transcripts & Degree Certificates</option>
                          <option value="campus_visit">Campus & Lab Demonstration Visit</option>
                          <option value="sponsorship">Event & TechFest Sponsorship</option>
                          <option value="general">General Administrative Question</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={inquiryForm.name}
                            onChange={(e) => setInquiryForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            placeholder="+880 1712-345678"
                            value={inquiryForm.phone}
                            onChange={(e) => setInquiryForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="visitor@gmail.com"
                          value={inquiryForm.email}
                          onChange={(e) => setInquiryForm((prev) => ({ ...prev, email: e.target.value }))}
                          required
                          className="w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Message / Questions <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={4}
                          placeholder="How can the department office assist you? Please write your questions..."
                          value={inquiryForm.message}
                          onChange={(e) => setInquiryForm((prev) => ({ ...prev, message: e.target.value }))}
                          required
                          className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={inquiryLoading}
                          className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50 transition flex items-center gap-1.5"
                        >
                          {inquiryLoading ? "Sending..." : "Send Inquiry"}
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
