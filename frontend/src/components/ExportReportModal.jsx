import React from 'react';
import { X, Printer, Download, Stethoscope, FileText, CheckCircle2 } from 'lucide-react';

export default function ExportReportModal({ isOpen, onClose, messages, analysisData, patientInfo }) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    let reportText = `MEDICAI CLINICAL CONSULTATION SUMMARY\n`;
    reportText += `Generated: ${new Date().toLocaleString()}\n`;
    reportText += `Model: medgemma:4b via Ollama\n`;
    reportText += `----------------------------------------\n\n`;
    
    reportText += `PATIENT BACKGROUND:\n`;
    reportText += `Age: ${patientInfo.age}\n`;
    reportText += `Gender: ${patientInfo.gender}\n`;
    reportText += `Allergies: ${patientInfo.allergies}\n`;
    reportText += `Chronic Conditions: ${patientInfo.conditions}\n\n`;

    if (analysisData) {
      reportText += `DIAGNOSTIC ANALYSIS SUMMARY:\n`;
      reportText += `Urgency Level: ${analysisData.urgency_level || 'Low'}\n`;
      reportText += `Identified Symptoms: ${analysisData.symptoms?.join(', ')}\n\n`;

      reportText += `POSSIBLE CONDITIONS:\n`;
      analysisData.possible_diseases?.forEach(d => {
        reportText += `- ${d.name} (${d.likelihood} Likelihood): ${d.description}\n`;
      });
      reportText += `\nSUGGESTED OTC MEDICATIONS:\n`;
      analysisData.suggested_medicines?.forEach(m => {
        reportText += `- ${m.name} (${m.type}): ${m.purpose} | Dosage: ${m.dosage_note}\n`;
      });
      reportText += `\nCURING & HOME RECOVERY STEPS:\n`;
      analysisData.curing_techniques?.forEach(c => {
        reportText += `- ${c}\n`;
      });
      reportText += `\n`;
    }

    reportText += `FULL CONVERSATION HISTORY:\n`;
    messages.forEach(m => {
      reportText += `[${m.role.toUpperCase()}]: ${m.content}\n\n`;
    });

    reportText += `\nDISCLAIMER: This document contains AI-generated medical assistance for clinical preparation. It is not an official medical prescription.\n`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MedicAI_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700/80 shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between no-print bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Consultation Summary Report</h2>
              <p className="text-xs text-slate-400">Ready for clinical review or doctor visits</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Text</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-sm font-sans" id="printable-report">
          
          <div className="border-b border-slate-700 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <Stethoscope className="w-6 h-6" /> MedicAI Clinical Assessment
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Powered by MedGemma 4B • Ollama LLM</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Date: {new Date().toLocaleDateString()}</p>
              <p>Time: {new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block">Age</span>
              <span className="font-semibold text-slate-200">{patientInfo.age}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Gender</span>
              <span className="font-semibold text-slate-200">{patientInfo.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Allergies</span>
              <span className="font-semibold text-rose-300">{patientInfo.allergies}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Conditions</span>
              <span className="font-semibold text-amber-300">{patientInfo.conditions}</span>
            </div>
          </div>

          {/* Diagnostic Breakdown */}
          {analysisData && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Primary Assessment & Recommendations
              </h3>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Possible Conditions:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysisData.possible_diseases?.map((d, i) => (
                    <div key={i} className="p-2.5 rounded bg-slate-900 border border-slate-800 text-xs">
                      <div className="font-bold text-slate-100">{d.name}</div>
                      <div className="text-slate-400 text-[11px] mt-0.5">{d.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Suggested OTC Medications:</h4>
                <div className="space-y-1.5">
                  {analysisData.suggested_medicines?.map((m, i) => (
                    <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800 text-xs flex justify-between">
                      <div>
                        <span className="font-bold text-emerald-300">{m.name}</span> ({m.purpose})
                        <p className="text-[11px] text-slate-400 mt-0.5">Dosage: {m.dosage_note}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">{m.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">Curing & Recovery Steps:</h4>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {analysisData.curing_techniques?.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Consultation Transcript
            </h3>
            <div className="space-y-2 text-xs">
              {messages.map((m, idx) => (
                <div key={idx} className={`p-2.5 rounded-lg ${m.role === 'user' ? 'bg-slate-900 text-cyan-200' : 'bg-slate-900/60 border border-slate-800 text-slate-300'}`}>
                  <span className="font-bold uppercase text-[10px] text-slate-500 block mb-0.5">
                    {m.role === 'user' ? 'Patient' : 'MedicAI (MedGemma:4b)'}
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
