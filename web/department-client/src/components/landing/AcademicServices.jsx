"use client";

import { BookOpen, FileText, Beaker } from "lucide-react";

export function AcademicServices() {
  return (
    <div className="py-24 relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-xs font-bold tracking-[0.3em] text-indigo-600 uppercase mb-3">
          Beyond the Classroom
        </h2>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          Academic Services
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100">
          <BookOpen className="h-8 w-8 text-indigo-600 mb-6" />
          <h3 className="text-xl font-bold text-slate-800 mb-3">Digital Library</h3>
          <p className="text-slate-600">Access thousands of e-books, research papers, and previous year question banks directly from your portal.</p>
        </div>
        <div className="bg-sky-50/50 rounded-3xl p-8 border border-sky-100">
          <FileText className="h-8 w-8 text-sky-600 mb-6" />
          <h3 className="text-xl font-bold text-slate-800 mb-3">Thesis Management</h3>
          <p className="text-slate-600">Streamline your final year project submissions, supervisor allocations, and progress tracking.</p>
        </div>
        <div className="bg-purple-50/50 rounded-3xl p-8 border border-purple-100">
          <Beaker className="h-8 w-8 text-purple-600 mb-6" />
          <h3 className="text-xl font-bold text-slate-800 mb-3">Lab Resources</h3>
          <p className="text-slate-600">Book lab slots, access software keys, and read lab manuals before attending your practical sessions.</p>
        </div>
      </div>
    </div>
  );
}
