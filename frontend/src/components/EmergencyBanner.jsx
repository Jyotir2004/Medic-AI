import React, { useState } from 'react';
import { AlertOctagon, X, PhoneCall } from 'lucide-react';

export default function EmergencyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 border-b border-rose-800/60 px-4 py-2 text-xs text-rose-200 no-print flex items-center justify-between shadow-md">
      <div className="max-w-7xl mx-auto flex items-center gap-2 flex-1">
        <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
        <p className="flex-1">
          <strong className="text-rose-300">EMERGENCY NOTICE:</strong> If experiencing severe chest pain, shortness of breath, sudden facial drooping, or uncontrolled bleeding, call local emergency services immediately!
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-slate-400 hover:text-slate-200 transition-colors ml-2"
        title="Dismiss emergency banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
