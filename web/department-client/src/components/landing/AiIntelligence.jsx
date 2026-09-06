"use client";

import { Sparkles, BrainCircuit, LineChart } from "lucide-react";

export function AiIntelligence() {
  return (
    <div className="py-24 relative z-10">
      <div className="gsap-ai-section rounded-[3rem] bg-[#0A0F1C] p-10 md:p-16 overflow-hidden relative shadow-2xl border border-white/5">
        <div className="gsap-scrub absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
        <div className="gsap-scrub absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 blur-[100px] rounded-full -translate-x-1/2 translate-y-1/2" style={{ animationDelay: '0.5s' }}></div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 border border-white/10 mb-6 backdrop-blur-md shadow-lg shadow-black/20">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-300 uppercase">
                Machine Learning Powered
              </span>
            </div>
            <h2 className="text-4xl md:text-[3.5rem] font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-6 leading-[1.1] tracking-tight">
              Predictive Insights for Better Outcomes
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Our advanced ML models analyze academic performance, attendance, and engagement to identify students who need support before they fall behind.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <BrainCircuit className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Dropout Risk Detection</h4>
                  <p className="text-slate-400 text-sm">Early warning system based on historical data patterns.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                  <LineChart className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">Performance Forecasting</h4>
                  <p className="text-slate-400 text-sm">Predict final semester CGPA based on midterm metrics.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative h-full min-h-[300px] rounded-3xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10 backdrop-blur-lg flex items-center justify-center">
            {/* Placeholder for a chart or 3D graphic */}
            <div className="text-center">
              <BrainCircuit className="h-24 w-24 text-indigo-400/50 mx-auto mb-4 animate-pulse" />
              <p className="text-indigo-300/70 font-semibold tracking-widest text-sm uppercase">AI Model Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
