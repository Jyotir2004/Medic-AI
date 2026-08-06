import React from 'react';
import { Activity, Pill, HeartPulse, AlertTriangle, ShieldCheck, CheckCircle2, Info } from 'lucide-react';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Helper to highlight bold text inside strings
  const formatBold = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
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

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      renderedElements.push(<div key={`empty-${idx}`} className="h-2" />);
      return;
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
        </div>
      );
      return;
    }

    // Check for Disclaimer callout block
    if (trimmed.toLowerCase().includes('disclaimer:')) {
      renderedElements.push(
        <div key={idx} className="my-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 shadow-sm">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">{formatBold(trimmed)}</div>
        </div>
      );
      return;
    }

    // Check for Bullet point lines (* or - or 1.)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[\*\-\d\.]+\s*/, '');
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 my-1.5 pl-2 leading-relaxed">
          <CheckCircle2 className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{formatBold(bulletText)}</div>
        </div>
      );
      return;
    }

    // Regular text paragraph
    renderedElements.push(
      <p key={idx} className="text-xs sm:text-sm text-slate-800 leading-relaxed my-1.5">
        {formatBold(trimmed)}
      </p>
    );
  });

  return <div className="space-y-1">{renderedElements}</div>;
}
