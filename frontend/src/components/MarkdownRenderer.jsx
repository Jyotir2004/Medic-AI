import React from 'react';
import { Activity, Pill, HeartPulse, AlertTriangle, ShieldCheck, CheckCircle2, Info, ChevronRight, Stethoscope } from 'lucide-react';

export default function MarkdownRenderer({ content, onSelectDisease, isStreaming = false }) {
  if (!content) {
    if (isStreaming) {
      return (
        <div className="flex items-center gap-2 py-1 text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse [animation-delay:200ms]"></span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse [animation-delay:400ms]"></span>
          </div>
          <span className="text-xs font-semibold text-purple-700/80 animate-pulse">MedicAI is thinking...</span>
        </div>
      );
    }
    return null;
  }

  // Cursor element
  const cursor = isStreaming ? (
    <span className="chatgpt-cursor" aria-hidden="true" />
  ) : null;

  // Helper to highlight bold text inside strings
  const formatBold = (text) => {
    let processed = text;
    // Temporarily close unclosed ** while streaming to prevent flickering
    const count = (processed.match(/\*\*/g) || []).length;
    if (count % 2 !== 0) {
      processed += '**';
    }

    const parts = processed.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const clean = part.slice(2, -2);
        return (
          <span key={i} className="font-extrabold text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded-md border border-purple-200 text-[13px] mx-0.5">
            {clean}
          </span>
        );
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const renderedElements = [];
  const lastLineIdx = lines.length - 1;

  lines.forEach((line, idx) => {
    const isLast = idx === lastLineIdx;
    const trimmed = line.trim();
    if (!trimmed) {
      renderedElements.push(
        <div key={`empty-${idx}`} className="h-2">
          {isLast && cursor}
        </div>
      );
      return;
    }

    // Check for interactive disease selection tag: [SELECT_DISEASE: Disease Name]
    if (trimmed.includes('[SELECT_DISEASE:') || trimmed.startsWith('SELECT_DISEASE:')) {
      const match = trimmed.match(/\[?SELECT_DISEASE:\s*([^\]\n]+)\]?/i);
      if (match && match[1]) {
        const diseaseName = match[1].trim();
        renderedElements.push(
          <div key={`select-disease-${idx}`} className="my-2 flex items-center">
            <button
              onClick={() => onSelectDisease && onSelectDisease(diseaseName)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer group"
              title={`View OTC medications & curing techniques for ${diseaseName}`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-purple-200 group-hover:scale-110 transition-transform" />
              <span>Select {diseaseName} for Medication & Recovery Plan</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
            </button>
            {isLast && cursor}
          </div>
        );
        return;
      }
    }

    // Check for Section Headers (### or **Header:**)
    if (
      trimmed.startsWith('#') || 
      trimmed.startsWith('###') || 
      trimmed.startsWith('##') ||
      (trimmed.startsWith('**') && (trimmed.includes('Condition') || trimmed.includes('Medicines') || trimmed.includes('Techniques') || trimmed.includes('Red Flags') || trimmed.includes('Disclaimer')))
    ) {
      const titleText = trimmed.replace(/^#+\s*/, '').replace(/^\*\*/, '').replace(/\*\*:?$/, '');

      let icon = <Activity className="w-4 h-4 text-purple-600" />;
      let badgeStyle = "bg-purple-100/80 text-purple-900 border-purple-300";

      if (titleText.toLowerCase().includes('condition') || titleText.toLowerCase().includes('disease')) {
        icon = <Activity className="w-4 h-4 text-purple-600" />;
        badgeStyle = "bg-purple-100 text-purple-900 border-purple-300";
      } else if (titleText.toLowerCase().includes('medicine') || titleText.toLowerCase().includes('otc')) {
        icon = <Pill className="w-4 h-4 text-emerald-600" />;
        badgeStyle = "bg-emerald-100 text-emerald-900 border-emerald-300";
      } else if (titleText.toLowerCase().includes('curing') || titleText.toLowerCase().includes('technique') || titleText.toLowerCase().includes('recovery')) {
        icon = <HeartPulse className="w-4 h-4 text-cyan-600" />;
        badgeStyle = "bg-cyan-100 text-cyan-900 border-cyan-300";
      } else if (titleText.toLowerCase().includes('red flag') || titleText.toLowerCase().includes('doctor') || titleText.toLowerCase().includes('warning')) {
        icon = <AlertTriangle className="w-4 h-4 text-rose-600" />;
        badgeStyle = "bg-rose-100 text-rose-900 border-rose-300";
      } else if (titleText.toLowerCase().includes('disclaimer')) {
        icon = <Info className="w-4 h-4 text-amber-600" />;
        badgeStyle = "bg-amber-100 text-amber-900 border-amber-300";
      }

      renderedElements.push(
        <div key={idx} className="my-3">
          <h3 className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider shadow-sm ${badgeStyle}`}>
            {icon}
            <span>{titleText}</span>
          </h3>
          {isLast && cursor}
        </div>
      );
      return;
    }

    // Check for Disclaimer callout block
    if (trimmed.toLowerCase().includes('disclaimer:')) {
      renderedElements.push(
        <div key={idx} className="my-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 shadow-sm">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {formatBold(trimmed)}
            {isLast && cursor}
          </div>
        </div>
      );
      return;
    }

    // Check for Bullet point lines (* or - or 1.)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[\*\-\d\.]+\s*/, '');
      
      // Extract disease name if bullet point contains disease prediction
      const diseaseMatch = bulletText.match(/\*\*([^*]+)\*\*\s*\[(High|Moderate|Low)\s+Likelihood\]/i);

      renderedElements.push(
        <div key={idx} className="flex flex-col gap-1.5 my-1.5 pl-1">
          <div className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {formatBold(bulletText)}
              {isLast && cursor}
            </div>
          </div>

          {diseaseMatch && diseaseMatch[1] && (
            <div className="pl-6">
              <button
                onClick={() => onSelectDisease && onSelectDisease(diseaseMatch[1])}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] border border-purple-200 hover:border-purple-300 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <Stethoscope className="w-3 h-3 text-purple-600" />
                <span>Select {diseaseMatch[1]} → View Medicines & Treatment</span>
              </button>
            </div>
          )}
        </div>
      );
      return;
    }

    // Regular text paragraph
    renderedElements.push(
      <p key={idx} className="text-xs sm:text-sm text-slate-800 leading-relaxed my-1.5">
        {formatBold(trimmed)}
        {isLast && cursor}
      </p>
    );
  });

  return <div className="space-y-1">{renderedElements}</div>;
}
