import React, { useState } from 'react';
import { 
  SquarePen, Search, MoreHorizontal, MessageSquare, User, 
  Stethoscope, CheckCheck, Thermometer, Brain, Activity, ShieldAlert, Wind, X 
} from 'lucide-react';

export default function Sidebar({ 
  onSelectPrompt, 
  activePreset, 
  onOpenPatientModal, 
  patientInfo,
  onResetChat 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const sessions = [
    {
      id: 'cold-flu',
      name: 'Cold & Flu Check',
      subtext: 'Sore throat, fever, congestion...',
      time: 'Just now',
      unread: 1,
      icon: Thermometer,
      prompt: 'I have a sore throat, nasal congestion, runny nose, and a mild headache for 2 days.'
    },
    {
      id: 'headache',
      name: 'Headache & Fatigue',
      subtext: 'Throbbing headache behind eyes...',
      time: '12:35 AM',
      unread: 1,
      icon: Brain,
      prompt: "I'm experiencing a throbbing headache behind my eyes with fatigue and neck stiffness."
    },
    {
      id: 'digestive',
      name: 'Digestive Symptoms',
      subtext: 'Stomach cramps after dinner...',
      time: '11:48 PM',
      unread: null,
      icon: Activity,
      prompt: 'I have stomach cramps, bloating, and mild nausea after eating dinner last night.'
    },
    {
      id: 'skin',
      name: 'Skin & Rash Check',
      subtext: 'Red itchy bumps on arms...',
      time: '13 Nov',
      unread: null,
      icon: ShieldAlert,
      prompt: 'I noticed red itchy bumps on my arms after spending time outdoors yesterday.'
    },
    {
      id: 'allergies',
      name: 'Seasonal Allergies',
      subtext: 'Sneezing, watery eyes...',
      time: '28 Nov',
      unread: null,
      icon: Wind,
      prompt: "I've been sneezing constantly with itchy eyes and clear watery nasal discharge."
    }
  ];

  const filtered = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.subtext.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full lg:w-80 dark-sidebar flex flex-col h-full min-h-0 relative p-4 flex-shrink-0">
      
      {/* Top Section */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
        <button 
          onClick={onResetChat}
          className="w-9 h-9 rounded-2xl fab-purple flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
          title="New Consultation"
        >
          <SquarePen className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-purple-300 font-bold text-xs">
                <Stethoscope className="w-3.5 h-3.5 text-purple-300" />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#1f1730]"></span>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-100 truncate">MedicAI Assistant</h2>
            <p className="text-[10px] text-purple-300 font-semibold">BioMistral 7B • Online</p>
          </div>
        </div>

        <button 
          onClick={onOpenPatientModal}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Perfect Search Symptoms Bar */}
      <div className="my-3 relative flex-shrink-0">
        <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search symptoms or topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem', paddingRight: '2rem', paddingTop: '0.625rem', paddingBottom: '0.625rem', height: 'auto', minHeight: '40px', display: 'block' }}
          className="w-full bg-[#160f24] text-xs text-white placeholder-slate-400 rounded-xl focus:outline-none border border-white/10 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Vertical Presets List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            No matching symptoms found.
          </div>
        ) : (
          filtered.map((item) => {
            const IconComp = item.icon;
            const isActive = activePreset === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPrompt(item.prompt, item.id)}
                className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-center justify-between group ${
                  isActive ? 'sidebar-item-active' : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#1f1730]"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-slate-100 truncate">{item.name}</h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtext}</p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <span className="text-[9px] text-slate-400 block">{item.time}</span>
                  {item.unread ? (
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-500 text-white text-[9px] font-bold mt-0.5">
                      {item.unread}
                    </span>
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400 ml-auto mt-0.5" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Bottom Nav Bar */}
      <div className="pt-2 mt-auto border-t border-white/10 flex items-center justify-around text-slate-400 flex-shrink-0">
        <button 
          onClick={onOpenPatientModal}
          className="p-1.5 rounded-xl hover:text-purple-300 hover:bg-white/5 transition-colors"
          title="Patient Context"
        >
          <User className="w-4 h-4" />
        </button>
        <button 
          className="p-1.5 rounded-xl text-purple-400 bg-purple-950/80 border border-purple-800/50"
          title="Active Consultation"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button 
          className="p-1.5 rounded-xl hover:text-purple-300 hover:bg-white/5 transition-colors"
          title="Emergency Help"
        >
          <Stethoscope className="w-4 h-4" />
        </button>
      </div>

    </aside>
  );
}
