import React from 'react';
import { Thermometer, Activity, Brain, ShieldAlert, Wind, Sparkles } from 'lucide-react';

const ICON_MAP = {
  Thermometer: Thermometer,
  Activity: Activity,
  Brain: Brain,
  ShieldAlert: ShieldAlert,
  Wind: Wind,
};

export default function QuickPrompts({ categories, onSelectPrompt }) {
  if (!categories || categories.length === 0) return null;

  return (
    <div className="my-3">
      <div className="flex items-center justify-center gap-1.5 mb-2.5">
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Suggested Symptoms
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat, idx) => {
          const IconComp = ICON_MAP[cat.icon] || Activity;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(cat.prompt)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200/60 text-xs font-medium text-purple-700 transition-all hover:scale-105 active:scale-95 shadow-sm"
            >
              <IconComp className="w-3.5 h-3.5 text-purple-600" />
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
