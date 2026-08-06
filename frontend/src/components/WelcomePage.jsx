import React from 'react';
import { Stethoscope, ArrowRight, ShieldCheck, Activity, Mic, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

export default function WelcomePage({ onContinue }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden bg-gradient-to-br from-[#f3ebfc] via-[#e5d4fa] to-[#dbc6f8]">
      
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Floating Welcome Card */}
      <div className="max-w-3xl w-full bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl shadow-2xl p-8 sm:p-12 relative z-10 text-center space-y-8 my-auto">
        
        {/* Brand Logo & Model Pill */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 p-1 shadow-xl shadow-purple-600/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-purple-300">
              <Stethoscope className="w-10 h-10 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider border border-purple-200">
              MedGemma 4B AI
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ElevenLabs Voice AI
            </span>
          </div>
        </div>

        {/* Hero Title & Description */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Welcome to <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">MedicAI</span> Clinical Platform
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Your intelligent medical chatbot assistant. Describe symptoms verbally or in text to receive instant disease predictions, suggested OTC medicines, curing techniques, and triage guidance.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-left">
          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-100 space-y-1.5">
            <Activity className="w-6 h-6 text-purple-600" />
            <h3 className="text-xs font-bold text-slate-900">Symptom Prediction</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Cross-references symptoms with MedGemma 4B guidelines.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 space-y-1.5">
            <Mic className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900">ElevenLabs Voice AI</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Scribe v2 speech-to-text dictation & Multilingual v2 voice audio.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-100 space-y-1.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-900">Triage Safety</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Categorizes urgency into Low, Moderate, and High emergency risk.
            </p>
          </div>
        </div>

        {/* Action Button: Continue */}
        <div className="pt-4">
          <button
            onClick={onContinue}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-800 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center justify-center gap-3 shadow-xl shadow-purple-600/30 transition-all hover:scale-105 active:scale-95 mx-auto"
          >
            <span>Continue to Consultation</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </div>

      <p className="text-xs text-slate-500 text-center mt-6 relative z-10">
        AI medical assistance for informational & clinical preparation purposes.
      </p>

    </div>
  );
}
