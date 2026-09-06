"use client";

import { motion } from "framer-motion";
import { ArrowRight, Calendar, MapPin, BellRing, Sparkles, Clock } from "lucide-react";
import { Button } from "@heroui/react";
import Link from "next/link";

const FEATURED_EVENT = {
  title: "National Hackathon & TechFest 2026",
  date: "15",
  month: "NOV",
  time: "09:00 AM - 08:00 PM",
  location: "Main Auditorium, Block C",
  description: "Join the biggest tech event of the year. Showcase your coding skills, win amazing prizes, and network with top industry leaders.",
  tags: ["Competition", "TechFest"],
};

const NOTICES = [
  { date: "24", month: "OCT", title: "Midterm Examination Schedule Published for Fall 2026", type: "Academic", color: "text-sky-600 bg-sky-100", dot: "bg-sky-500" },
  { date: "20", month: "OCT", title: "Course Registration for Upcoming Semester is Now Open", type: "Urgent", color: "text-rose-600 bg-rose-100", dot: "bg-rose-500" },
  { date: "15", month: "OCT", title: "Guest Lecture: AI & Machine Learning in Healthcare", type: "Event", color: "text-purple-600 bg-purple-100", dot: "bg-purple-500" },
  { date: "10", month: "OCT", title: "Deadline for Final Year Project Proposal Submission", type: "Academic", color: "text-sky-600 bg-sky-100", dot: "bg-sky-500" },
];

export function EventsNotices() {
  return (
    <div id="notices" className="py-24 relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[10px] font-black tracking-[0.3em] text-indigo-600 uppercase mb-3 flex items-center gap-2"
          >
            <BellRing className="h-4 w-4" /> Stay Updated
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900"
          >
            Notices & Events
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <Button 
            as={Link}
            href="/notices"
            variant="flat" 
            color="primary" 
            className="font-bold rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            View All Board
          </Button>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Featured Event (Left side) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-7 relative rounded-[2rem] overflow-hidden group"
        >
          {/* Deep vibrant gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 z-0"></div>
          
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-purple-500/30 transition-colors duration-700 z-0"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-rose-500/20 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 z-0"></div>

          <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-between min-h-[400px]">
            <div className="flex justify-between items-start">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                Featured Event
              </div>
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-white text-indigo-900 shadow-xl shadow-black/20">
                <span className="text-2xl font-black leading-none">{FEATURED_EVENT.date}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">{FEATURED_EVENT.month}</span>
              </div>
            </div>

            <div className="mt-12">
              <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
                {FEATURED_EVENT.title}
              </h3>
              <p className="text-indigo-100/80 font-medium mb-8 max-w-md leading-relaxed text-sm">
                {FEATURED_EVENT.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-6 mb-8 text-white/90 text-sm font-semibold">
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Clock className="h-4 w-4 text-indigo-300" />
                  {FEATURED_EVENT.time}
                </div>
                <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-indigo-300" />
                  {FEATURED_EVENT.location}
                </div>
              </div>

              <Button 
                color="primary" 
                className="font-bold bg-white text-indigo-900 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all h-12 px-8 rounded-xl"
              >
                Register Now
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Notices List (Right side) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {NOTICES.map((notice, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="group flex gap-5 p-5 rounded-3xl bg-white/60 backdrop-blur-lg border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_10px_40px_rgba(79,70,229,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer relative overflow-hidden"
            >
              {/* Subtle hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-indigo-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10 flex flex-col items-center justify-center shrink-0 w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-500 transition-colors duration-300 shadow-sm">
                <span className="text-xl font-black leading-none">{notice.date}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">{notice.month}</span>
              </div>
              
              <div className="relative z-10 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${notice.color}`}>
                    {notice.type}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-indigo-700 transition-colors line-clamp-2">
                  {notice.title}
                </h3>
              </div>
              
              <div className="relative z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                <ArrowRight className="h-5 w-5 text-indigo-500" />
              </div>
            </motion.div>
          ))}
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-2 text-center"
          >
            <Button 
              as={Link}
              href="/notices"
              variant="light" 
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              Explore Archive
            </Button>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
