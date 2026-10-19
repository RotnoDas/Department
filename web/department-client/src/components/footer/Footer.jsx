"use client";

import { useState, useEffect, useRef } from "react";
import { 
  GraduationCap, 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Share2, 
  Video, 
  ArrowUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  X,
  FileText,
  AlertTriangle,
  Send,
  Lock,
  LifeBuoy,
  PhoneCall,
  Compass
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";

export function Footer() {
  const containerRef = useRef(null);
  const leftBeam = useRef(null);
  const rightBeam = useRef(null);
  const centerPulse = useRef(null);
  const sweeper = useRef(null);

  // Functional States
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState(null); // 'phone' | 'email' | 'address' | number
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | 'emergency' | null

  // GSAP Animated Top Divider
  useEffect(() => {
    let ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1, repeatDelay: 1 });

      gsap.set(leftBeam.current, { scaleX: 0, opacity: 1, xPercent: 0 });
      gsap.set(rightBeam.current, { scaleX: 0, opacity: 1, xPercent: 0 });
      gsap.set(centerPulse.current, { scale: 0, opacity: 0 });
      gsap.set(sweeper.current, { x: "-50vw", opacity: 0 });

      tl.to(centerPulse.current, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" })
        .to(centerPulse.current, { scale: 0.6, duration: 0.2 })
        .to([leftBeam.current, rightBeam.current], {
          scaleX: 1,
          duration: 1.2,
          ease: "expo.out"
        }, "-=0.2")
        .to(leftBeam.current, { xPercent: -100, opacity: 0, duration: 0.8, ease: "power2.in" }, "+=0.3")
        .to(rightBeam.current, { xPercent: 100, opacity: 0, duration: 0.8, ease: "power2.in" }, "<")
        .to(centerPulse.current, { scale: 0, opacity: 0, duration: 0.5 }, "<")
        .to(sweeper.current, { opacity: 1, duration: 0.3 })
        .to(sweeper.current, {
          x: "100vw",
          duration: 2.5,
          ease: "power1.inOut"
        }, "<")
        .to(sweeper.current, { opacity: 0, duration: 0.5 }, "-=0.5");
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Copy to clipboard helper
  const handleCopy = (text, fieldName) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2500);
    }
  };

  // Smooth scroll to in-page anchor
  const handleSectionScroll = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = `/#${id}`;
    }
  };

  // Scroll to Top helper
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Newsletter subscription
  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return toast.error("Please enter a valid email address.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/backend/api/support/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Subscription failed.");
      }
      toast.success(data.message || "Subscribed to department circulars!");
      setEmail("");
    } catch (err) {
      toast.error(err.message || "Failed to subscribe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer ref={containerRef} className="relative w-full bg-white/70 dark:bg-slate-950/80 backdrop-blur-2xl pt-20 pb-10 overflow-hidden mt-20 transition-colors duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.03)] border-t border-slate-200/80 dark:border-white/10">
      
      {/* GSAP Animated Top Divider Container */}
      <div className="absolute top-0 left-0 w-full h-[4px] overflow-hidden pointer-events-none z-20">
        <div className="absolute top-[1px] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent opacity-50"></div>
        
        <div ref={sweeper} className="absolute top-0 h-[3px] w-[50vw] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent blur-[3px]"></div>
          <div className="absolute h-[2px] w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(34,211,238,1)]"></div>
          <div className="absolute h-[3px] w-16 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,1)]"></div>
        </div>

        <div ref={leftBeam} className="absolute top-[1px] right-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-indigo-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8)] origin-right"></div>
        <div ref={rightBeam} className="absolute top-[1px] left-1/2 w-1/2 h-[2px] bg-gradient-to-l from-transparent via-indigo-400 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.8)] origin-left"></div>
        <div ref={centerPulse} className="absolute top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[4px] w-24 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,1),0_0_30px_rgba(34,211,238,0.8)] blur-[0.5px]"></div>
      </div>
      
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* ── Top Feature: Circular & Emergency Alert Dispatcher Subscription ── */}
        <div className="mb-16 p-8 sm:p-10 rounded-[2.5rem] bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-sky-900/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-slate-900/60 backdrop-blur-2xl border border-indigo-100 dark:border-white/10 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Department Circular Dispatcher</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Stay Updated with Official CSE Circulars
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                Subscribe to receive university examination notifications, scholarship updates, seminar invites, and urgent administrative alerts in your inbox.
              </p>
            </div>

            <form onSubmit={handleNewsletterSubmit} className="w-full lg:w-auto flex-1 max-w-md flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto h-12 px-6 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Main Footer Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 mb-16">
          
          {/* Brand & Identity (Col span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_10px_25px_rgba(99,102,241,0.3)]">
                  <GraduationCap className="h-7 w-7 text-white" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 drop-shadow-md" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
                    CSE<span className="text-indigo-600">.</span>PUST
                  </span>
                  <span className="text-[10px] font-black tracking-[0.12em] text-indigo-600 dark:text-indigo-400 uppercase mt-1">
                    Dept. of Computer Science & Engineering
                  </span>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed max-w-sm font-medium">
                Pabna University of Science and Technology. Fostering excellence in computing education, scientific research, and ethical innovation since 2008.
              </p>
            </div>

            {/* Social & University Channels */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                Official Channels & Repositories
              </span>
              <div className="flex items-center gap-2.5">
                {[
                  { icon: Globe, href: "https://www.pust.ac.bd", label: "University Website" },
                  { icon: Share2, href: "https://github.com", label: "GitHub Department Hub" },
                  { icon: Video, href: "https://youtube.com", label: "CSE Video Lectures" },
                  { icon: ShieldCheck, href: "https://linkedin.com", label: "Alumni Network" },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white hover:border-indigo-600 shadow-2xs hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <item.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Department & Academic Links (Col span 3) */}
          <div className="lg:col-span-3 lg:col-start-6">
            <h4 className="text-slate-900 dark:text-white font-extrabold tracking-[0.1em] uppercase text-xs mb-5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              <span>Academics</span>
            </h4>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <a
                  href="#overview"
                  onClick={(e) => handleSectionScroll(e, "overview")}
                  className="text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors"></span>
                  <span>Overview</span>
                </a>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => handleSectionScroll(e, "features")}
                  className="text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors"></span>
                  <span>Core Facilities</span>
                </a>
              </li>
              <li>
                <Link
                  href="/notices"
                  className="text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors"></span>
                  <span>Circulars & Notices</span>
                </Link>
              </li>
              <li>
                <a
                  href="#support"
                  onClick={(e) => handleSectionScroll(e, "support")}
                  className="text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors"></span>
                  <span>Help & Grievance Box</span>
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveModal("emergency")}
                  className="text-slate-600 dark:text-slate-400 font-semibold hover:text-rose-600 dark:hover:text-rose-400 transition-colors inline-flex items-center gap-2 group cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 group-hover:scale-150 transition-all"></span>
                  <span>Emergency Helplines</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact & Office Desk (Col span 4) */}
          <div className="md:col-span-2 lg:col-span-4">
            <h4 className="text-slate-900 dark:text-white font-extrabold tracking-[0.1em] uppercase text-xs mb-5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              <span>Department Desk</span>
            </h4>
            <ul className="flex flex-col gap-4 text-xs sm:text-sm">
              {/* Address */}
              <li className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-semibold group">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 border border-indigo-100 dark:border-indigo-900/40">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="leading-snug block">
                    Dept. of CSE, Academic Building 1, Room 401
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    PUST, Pabna-6600, Bangladesh
                  </span>
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Pabna+University+of+Science+and+Technology"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold inline-flex items-center gap-1 mt-1"
                  >
                    <span>View Campus Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </li>

              {/* Phone */}
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                    <Phone className="h-4 w-4" />
                  </div>
                  <a href="tel:+8801712345678" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-mono">
                    +880 1712-345678
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("+880 1712-345678", "Hotline Phone")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Copy Phone"
                >
                  {copiedField === "Hotline Phone" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </li>

              {/* Email */}
              <li className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-900/40">
                    <Mail className="h-4 w-4" />
                  </div>
                  <a href="mailto:contact@cse.pust.ac.bd" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    contact@cse.pust.ac.bd
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("contact@cse.pust.ac.bd", "Department Email")}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Copy Email"
                >
                  {copiedField === "Department Email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom Bar ── */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 text-center md:text-left">
            &copy; {new Date().getFullYear()} Department of Computer Science & Engineering, PUST. All rights reserved.
          </div>

          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveModal("privacy")}
              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <button
              type="button"
              onClick={() => setActiveModal("terms")}
              className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            >
              Terms of Use
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <button
              type="button"
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
              title="Scroll to Top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span className="text-[11px] font-extrabold uppercase">Top</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── INTERACTIVE MODALS ────────────────────────────────────────── */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-white dark:border-white/10 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[85vh] overflow-y-auto"
            >
              {/* Privacy Policy Modal */}
              {activeModal === "privacy" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                          Privacy & Data Protection Policy
                        </h3>
                        <p className="text-xs text-slate-400">Department of Computer Science & Engineering, PUST</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">1. Academic & Student Data</h4>
                      <p>All student records, course registrations, semester batches, and session records are stored in high-security, role-isolated database clusters. No academic record is exposed to unauthenticated parties.</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">2. Biometric & Facial Attendance Privacy</h4>
                      <p>Attendance face recognition embeddings are computed locally and matched with strict Euclidean vectors on secure campus server nodes. No facial image files are exported or shared externally.</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">3. Grievance Anonymity Protection</h4>
                      <p>When selecting Anonymous Mode in the Complaints desk, reporter identification (name, student ID, personal email) is completely stripped and shielded before reaching administrative review.</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">4. Zero Third-Party Commercial Sharing</h4>
                      <p>The department does not monetize, sell, or share student, faculty, or staff records with third-party vendors or commercial ad trackers.</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                    >
                      Understood & Close
                    </button>
                  </div>
                </div>
              )}

              {/* Terms of Use Modal */}
              {activeModal === "terms" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                          Terms of Use & IT Acceptable Policy
                        </h3>
                        <p className="text-xs text-slate-400">Department Computing Facilities & Portals</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">1. Authorized Academic Use</h4>
                      <p>The CSE portal and its integrated sub-modules are restricted to active university students, registered faculty members, administrative staff, and verified university applicants.</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">2. Credential Security & RBAC</h4>
                      <p>Users must not share authentication credentials. Any unauthorized privilege elevation attempt, session hijacking, or credential stuffing will trigger an immediate administrative security freeze.</p>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-white">3. Lab Toolchains & HPC Ethics</h4>
                      <p>Software laboratories, GPU rigs, and department compute servers must only be utilized for approved academic coursework, computational research, thesis projects, and educational development.</p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                    >
                      Acknowledge & Close
                    </button>
                  </div>
                </div>
              )}

              {/* Emergency Helplines Modal */}
              {activeModal === "emergency" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                          Campus Emergency Helplines
                        </h3>
                        <p className="text-xs text-slate-400">Pabna University of Science & Technology</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveModal(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {[
                      { name: "Department Office Desk", role: "Chairman / Academic Admin", phone: "+880 1712-345678" },
                      { name: "Proctorial Body Desk", role: "Campus Security & Discipline", phone: "+880 1712-000001" },
                      { name: "PUST Medical Center", role: "Campus Ambulance & Emergency Care", phone: "+880 1712-000002" },
                      { name: "Campus Central Security Post", role: "24/7 Security Gate & Surveillance", phone: "+880 1712-000003" },
                    ].map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{item.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.role}</div>
                          <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{item.phone}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${item.phone.replace(/[\s-]/g, "")}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.phone, item.name)}
                            className="p-1.5 rounded-xl bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 transition cursor-pointer"
                            title="Copy Number"
                          >
                            {copiedField === item.name ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}

