"use client";

export function HowItWorks() {
  return (
    <div className="py-24 relative z-10">
      <div className="text-center mb-16">
        <h2 className="text-xs font-bold tracking-[0.3em] text-indigo-600 uppercase mb-3">
          Simple Process
        </h2>
        <p className="text-4xl font-extrabold tracking-tight text-slate-900">
          How It Works
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 relative">
        {/* Connecting Line */}
        <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-indigo-100 via-indigo-300 to-indigo-100 -translate-y-1/2 z-0"></div>
        
        {[
          { step: "01", title: "Create Account", desc: "Sign up using your university provided student ID or faculty email." },
          { step: "02", title: "Wait for Approval", desc: "Admins review and verify your credentials before granting access." },
          { step: "03", title: "Explore Portal", desc: "Access personalized routines, submit assignments, and view notices." }
        ].map((item, idx) => (
          <div key={idx} className="relative z-10 flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-white border-4 border-indigo-50 shadow-xl flex items-center justify-center text-xl font-black text-indigo-600 mb-6">
              {item.step}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
            <p className="text-slate-500 font-medium px-4">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
