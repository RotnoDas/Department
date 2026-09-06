"use client";

import { motion } from "framer-motion";
import { LifeBuoy, MessageSquareWarning, Mail, ArrowRight, Phone } from "lucide-react";
import { Button } from "@heroui/react";
import Link from "next/link";

export function HelpSupport() {
  return (
    <div id="support" className="py-24 relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[10px] font-black tracking-[0.3em] text-indigo-600 uppercase mb-3"
        >
          We Are Here To Help
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900"
        >
          Support & Complaints
        </motion.p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Technical Support Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4 }}
          className="group relative overflow-hidden bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_40px_rgba(14,165,233,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <LifeBuoy className="h-6 w-6 text-sky-500" />
          </div>
          <h3 className="font-extrabold text-xl text-slate-800 mb-3 tracking-tight">Technical Support</h3>
          <p className="text-slate-500 font-medium leading-relaxed text-sm mb-8 flex-1">
            Facing issues with portal login, course registration, or result processing? Our IT Helpdesk is ready to assist you.
          </p>
          <Button 
            as={Link}
            href="mailto:it-support@department.edu"
            variant="flat" 
            className="w-full font-bold bg-sky-50 text-sky-600 hover:bg-sky-100"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            Contact Helpdesk
          </Button>
        </motion.div>

        {/* Complaints Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="group relative overflow-hidden bg-rose-500 p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(244,63,94,0.3)] hover:shadow-[0_20px_40px_rgba(244,63,94,0.4)] hover:-translate-y-1 transition-all duration-300 flex flex-col text-white"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
          <div className="relative z-10 h-14 w-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <MessageSquareWarning className="h-6 w-6 text-white" />
          </div>
          <h3 className="relative z-10 font-extrabold text-xl mb-3 tracking-tight">Lodge a Complaint</h3>
          <p className="relative z-10 text-rose-100 font-medium leading-relaxed text-sm mb-8 flex-1">
            Have any academic, administrative, or disciplinary complaints? Drop it here securely. You can also submit anonymously.
          </p>
          <Button 
            as={Link}
            href="/complaints/new"
            className="relative z-10 w-full font-bold bg-white text-rose-600 shadow-xl"
            endContent={<ArrowRight className="h-4 w-4" />}
          >
            Submit Complaint
          </Button>
        </motion.div>

        {/* General Office Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="group relative overflow-hidden bg-white/70 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Mail className="h-6 w-6 text-emerald-500" />
          </div>
          <h3 className="font-extrabold text-xl text-slate-800 mb-3 tracking-tight">General Inquiry</h3>
          <p className="text-slate-500 font-medium leading-relaxed text-sm mb-8 flex-1">
            Need information regarding admissions, transcript verification, or event sponsorships? Reach out to the main office.
          </p>
          <div className="flex flex-col gap-2">
            <Button 
              as={Link}
              href="tel:+8801234567890"
              variant="flat" 
              className="w-full font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              startContent={<Phone className="h-4 w-4" />}
            >
              Call Office
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
