import React from 'react';
import { 
  X, Activity, Pill, HeartPulse, AlertTriangle, ShieldCheck, 
  Stethoscope, Info, Sparkles, CheckCircle2, ChevronRight 
} from 'lucide-react';

export default function SymptomDrawer({ isOpen, onClose, analysisData, isAnalyzing }) {
  if (!isOpen) return null;

  const urgencyConfig = {
    Low: {
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-800/80',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
      label: 'Low Urgency (Self-Care & Home Remedies)',
      icon: ShieldCheck
    },
    Moderate: {
      bg: 'bg-amber-950/80',
      border: 'border-amber-800/80',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
      label: 'Moderate Urgency (Schedule GP Consultation)',
      icon: AlertTriangle
    },
    High: {
      bg: 'bg-rose-950/90',
      border: 'border-rose-700/80',
      text: 'text-rose-300',
      badgeBg: 'bg-rose-900/80 text-rose-200 border-rose-600/50',
      label: 'High Urgency (Seek Emergency Care)',
      icon: AlertTriangle
    }
  };

  const urgencyKey = analysisData?.urgency_level || 'Low';
  const currentUrgency = urgencyConfig[urgencyKey] || urgencyConfig.Low;
  const UrgencyIcon = currentUrgency.icon;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-slate-950/95 border-l border-slate-800 shadow-2xl backdrop-blur-xl flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Diagnostic Breakdown
              {isAnalyzing && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Extracted from BioMistral 7B Analysis</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {isAnalyzing ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-300">Analyzing symptoms & cross-referencing medical guidelines...</p>
            <p className="text-xs text-slate-500">Extracting conditions, OTC medicines, and curing steps</p>
          </div>
        ) : !analysisData ? (
          <div className="py-16 text-center space-y-3 px-6">
            <Stethoscope className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No active breakdown yet</p>
            <p className="text-xs text-slate-400">
              Start chatting about your symptoms or click "Analyze Symptoms" on any bot message to generate a structured medical summary.
            </p>
          </div>
        ) : (
          <>
            {/* Triage Urgency Level */}
            <div className={`p-3.5 rounded-xl border ${currentUrgency.bg} ${currentUrgency.border} flex items-start gap-3`}>
              <UrgencyIcon className={`w-5 h-5 ${currentUrgency.text} flex-shrink-0 mt-0.5`} />
              <div>
                <span className={`text-xs font-bold uppercase tracking-wider ${currentUrgency.text}`}>
                  {currentUrgency.label}
                </span>
                <p className="text-xs text-slate-300 mt-1">
                  {urgencyKey === 'High' 
                    ? 'Your reported symptoms indicate potential severity. Please contact emergency services or visit the nearest clinic.'
                    : urgencyKey === 'Moderate'
                    ? 'Symptom patterns suggest consulting a primary care doctor if no improvement in 24-48 hours.'
                    : 'Symptoms appear manageable with standard OTC remedies and restful self-care.'}
                </p>
              </div>
            </div>

            {/* Identified Symptoms */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                Identified Symptoms
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysisData.symptoms?.map((sym, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-xs font-medium text-cyan-300">
                    {sym}
                  </span>
                ))}
              </div>
            </div>

            {/* Predicted Conditions / Diseases */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
                Predicted Disease / Conditions
              </h3>
              <div className="space-y-2">
                {analysisData.possible_diseases?.map((dis, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-100">{dis.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${
                        dis.likelihood === 'High' ? 'bg-rose-950/80 text-rose-300 border-rose-800' :
                        dis.likelihood === 'Moderate' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {dis.likelihood} Likelihood
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{dis.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested OTC Medicines */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-emerald-400" />
                Suggested Medicines (OTC)
              </h3>
              <div className="space-y-2">
                {analysisData.suggested_medicines?.map((med, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-emerald-300">{med.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {med.type || 'OTC'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mb-1.5"><strong className="text-slate-200">Purpose:</strong> {med.purpose}</p>
                    <div className="p-2 rounded bg-slate-950/60 text-xs text-slate-300 border border-slate-800 space-y-1">
                      <p><span className="text-cyan-400 font-semibold">Dosage:</span> {med.dosage_note}</p>
                      {med.precautions && (
                        <p><span className="text-amber-400 font-semibold">Precaution:</span> {med.precautions}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curing & Recovery Techniques */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-cyan-400" />
                Curing & Home Recovery Techniques
              </h3>
              <ul className="space-y-2">
                {analysisData.curing_techniques?.map((tech, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300 p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{tech}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags Alert */}
            {analysisData.red_flags && analysisData.red_flags.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 space-y-2">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Red Flag Warning Signs
                </h3>
                <ul className="space-y-1">
                  {analysisData.red_flags.map((flag, i) => (
                    <li key={i} className="text-xs text-rose-200 flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p>{analysisData.disclaimer || 'Information generated by BioMistral 7B is for education only. Consult a doctor for medical emergencies.'}</p>
            </div>
          </>
        )}

      </div>

    </div>
  );
}
