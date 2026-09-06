"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <div className="py-24 relative z-10">
      <div className="gsap-cta rounded-[3rem] bg-indigo-600 p-12 text-center shadow-2xl shadow-indigo-200/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
            Ready to Experience the Future of Education?
          </h2>
          <p className="text-indigo-100 text-lg mb-10">
            Join thousands of students and faculty members already using the Next-Gen Academic Hub to streamline their daily workflows.
          </p>
          <Button 
            as={Link} 
            href="/student/signup" 
            size="lg" 
            className="font-bold text-base h-14 px-10 bg-white text-indigo-600 hover:bg-slate-50 shadow-xl rounded-2xl"
            endContent={<ArrowRight className="h-5 w-5" />}
          >
            Create Your Account
          </Button>
        </div>
      </div>
    </div>
  );
}
