import React from 'react';
import { Activity, User, FileText, RefreshCw, Stethoscope, Video, Settings } from 'lucide-react';

export default function Header({ 
  healthStatus, 
  onOpenPatientModal, 
  onToggleDrawer, 
  onOpenExportModal, 
  onResetChat,
  hasMessages,
  patientInfo
}) {
  const isConnected = healthStatus.status === 'connected' && healthStatus.model_available;

  return (
    <header className="px-6 py-4 flex items-center justify-between no-print">
      
      {/* Title & Avatar Stack */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-200 mb-8">
        <h1 className="text-3xl font-extrabold text-[#0369A1] tracking-tight flex items-center gap-3" style={{ letterSpacing: '-0.01em' }}>
          Medical Consultation
        </h1>

        {/* Avatars Stack */}
        <div className="flex items-center -space-x-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 border-2 border-white shadow-sm flex items-center justify-center text-white text-xs font-bold" title="BioMistral 7B AI">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-white shadow-sm flex items-center justify-center text-slate-200 text-xs font-bold" title="Patient Profile">
            <User className="w-4 h-4" />
          </div>
          <div className="w-7 h-7 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-purple-700 text-[10px] font-bold">
            +2
          </div>
        </div>

        {/* Status indicator pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-[0.05em] shadow-sm border border-purple-200/40">
          <span className={`w-2 h-2 rounded-full ${healthStatus.hf_available ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          <span>{healthStatus.hf_available ? 'BioMistral 7B Ready' : 'Connecting BioMistral...'}</span>
        </div>
      </div>

      {/* Right Icons */}
      <div className="flex items-center gap-3 text-slate-400">
        
        {/* Patient Context */}
        <button
          onClick={onOpenPatientModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-semibold transition-all border border-slate-200/60"
          title="Patient Background"
        >
          <User className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">
            {patientInfo.age !== 'Not specified' ? `${patientInfo.age}y / ${patientInfo.gender}` : 'Add Patient Context'}
          </span>
        </button>

        {/* Diagnosis Drawer Toggle */}
        <button
          onClick={onToggleDrawer}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Diagnosis Panel</span>
        </button>

        {/* Export Report */}
        {hasMessages && (
          <button
            onClick={onOpenExportModal}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-purple-600 transition-colors"
            title="Export Consultation Summary"
          >
            <FileText className="w-4 h-4" />
          </button>
        )}

        {/* New Chat */}
        <button
          onClick={onResetChat}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors"
          title="New Consultation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

      </div>

    </header>
  );
}
