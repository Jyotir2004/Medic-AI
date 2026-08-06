import React, { useState } from 'react';
import { 
  Plus, MessageSquare, Trash2, Edit2, User, Activity, 
  ShieldAlert, HeartPulse, Check, Sparkles, Clock, ChevronRight, LogOut
} from 'lucide-react';

export default function RightSidebar({ 
  chats, 
  activeChatId, 
  onSelectChat, 
  onNewChat, 
  onDeleteChat,
  onRenameChat,
  patientInfo,
  onSavePatientInfo,
  analysisData,
  currentUser,
  onLogout
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profileForm, setProfileForm] = useState({
    age: patientInfo.age === 'Not specified' ? '' : patientInfo.age,
    gender: patientInfo.gender === 'Not specified' ? 'Male' : patientInfo.gender,
    allergies: patientInfo.allergies === 'None' ? '' : patientInfo.allergies,
    conditions: patientInfo.conditions === 'None' ? '' : patientInfo.conditions,
  });

  const handleStartRename = (chat) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const handleSaveRename = (id) => {
    if (editTitle.trim()) {
      onRenameChat(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    onSavePatientInfo({
      age: profileForm.age || 'Not specified',
      gender: profileForm.gender || 'Not specified',
      allergies: profileForm.allergies || 'None',
      conditions: profileForm.conditions || 'None',
    });
    setIsEditingProfile(false);
  };

  return (
    <aside className="w-full lg:w-80 bg-white border border-slate-200/80 rounded-3xl shadow-lg p-3 sm:p-4 flex flex-col h-full min-h-0 flex-shrink-0 relative overflow-hidden">
      
      {/* Account Info Bar */}
      {currentUser && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {currentUser.full_name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-800 truncate">{currentUser.full_name}</h4>
              <span className="text-[9px] text-slate-400 block truncate">{currentUser.email}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top New Chat Action Button */}
      <button
        onClick={onNewChat}
        className="w-full py-2 px-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] mb-2 flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Consultation Chat</span>
      </button>

      {/* Patient Background Context Card */}
      <div className="bg-purple-50/70 border border-purple-200/60 rounded-2xl p-2.5 mb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-bold text-purple-900">Patient Context</h3>
          </div>
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="text-[10px] font-bold text-purple-700 hover:underline"
          >
            {isEditingProfile ? 'Close' : 'Edit'}
          </button>
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleProfileSubmit} className="space-y-1.5 mt-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                placeholder="Age"
                value={profileForm.age}
                onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
              />
              <select
                value={profileForm.gender}
                onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Allergies"
              value={profileForm.allergies}
              onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
              className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              placeholder="Conditions"
              value={profileForm.conditions}
              onChange={(e) => setProfileForm({ ...profileForm, conditions: e.target.value })}
              className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="w-full py-1 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors"
            >
              Save Context
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-1 text-[11px] text-purple-900">
            <div><span className="text-purple-600 font-medium">Age:</span> {patientInfo.age}</div>
            <div><span className="text-purple-600 font-medium">Gender:</span> {patientInfo.gender}</div>
            <div className="col-span-2 truncate"><span className="text-rose-600 font-medium">Allergies:</span> {patientInfo.allergies}</div>
            <div className="col-span-2 truncate"><span className="text-amber-600 font-medium">Conditions:</span> {patientInfo.conditions}</div>
          </div>
        )}
      </div>

      {/* History List Section */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-600" />
            Previous Chats
          </span>
          <span>{chats.length} Sessions</span>
        </div>

        <div className="space-y-1">
          {chats.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No previous chats saved yet.
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = activeChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`p-2 rounded-2xl transition-all border group flex items-center justify-between ${
                    isActive
                      ? 'bg-purple-50/90 border-purple-200 text-purple-950 font-semibold shadow-sm'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-purple-50/40 text-slate-700'
                  }`}
                >
                  <div 
                    onClick={() => onSelectChat(chat.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  >
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                    
                    {editingId === chat.id ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveRename(chat.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(chat.id)}
                        className="w-full bg-white border border-purple-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs truncate">{chat.title || 'Symptom Consultation'}</h4>
                        <span className="text-[9px] text-slate-400 block">{chat.date}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={() => handleStartRename(chat)}
                      className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-purple-600"
                      title="Rename"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteChat(chat.id)}
                      className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Active Diagnostic Status Footer Card */}
      {analysisData && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex-shrink-0">
          <div className="p-2 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/60">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-bold text-purple-900 uppercase">Live Diagnosis</span>
              <span className="text-[9px] font-bold text-purple-700 bg-white px-1.5 py-0.5 rounded-full border border-purple-200">
                {analysisData.urgency_level || 'Low'} Risk
              </span>
            </div>
            <p className="text-xs font-bold text-slate-800 truncate">
              {analysisData.possible_diseases?.[0]?.name || 'Evaluating...'}
            </p>
          </div>
        </div>
      )}

    </aside>
  );
}
