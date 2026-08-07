import React, { useState, useEffect } from 'react';
import WelcomePage from './components/WelcomePage';
import AuthPage from './components/AuthPage';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmergencyBanner from './components/EmergencyBanner';
import ChatInterface from './components/ChatInterface';
import SymptomDrawer from './components/SymptomDrawer';
import PatientProfile from './components/PatientProfile';
import ExportReportModal from './components/ExportReportModal';
import RightSidebar from './components/RightSidebar';
import { 
  checkBackendHealth, 
  streamChatMessage, 
  analyzeSymptoms, 
  fetchQuickSymptoms,
  fetchUserChats,
  saveUserChatDB,
  deleteUserChatDB
} from './services/api';

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const savedUser = localStorage.getItem('medicai_user');
    return savedUser ? 'DASHBOARD' : 'WELCOME';
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('medicai_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [healthStatus, setHealthStatus] = useState({ status: 'checking', ollama_available: false, model_available: false });
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [quickPrompts, setQuickPrompts] = useState([]);
  const [activePreset, setActivePreset] = useState(null);

  // Persistent Chat Sessions
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState('chat-default');

  // Modals
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Patient Context
  const [patientInfo, setPatientInfo] = useState(() => {
    const saved = localStorage.getItem('medicai_patient_info');
    return saved ? JSON.parse(saved) : {
      age: 'Not specified',
      gender: 'Not specified',
      allergies: 'None',
      conditions: 'None'
    };
  });

  useEffect(() => {
    checkBackendHealth().then(setHealthStatus);
    fetchQuickSymptoms().then(setQuickPrompts);

    const healthInterval = setInterval(() => {
      checkBackendHealth().then(setHealthStatus);
    }, 15000);

    return () => clearInterval(healthInterval);
  }, []);

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserChats(currentUser.id).then((userChats) => {
        if (userChats && userChats.length > 0) {
          setChats(userChats);
          setActiveChatId(userChats[0].id);
          setMessages(userChats[0].messages || []);
        } else {
          const initChat = [{
            id: `chat-${Date.now()}`,
            title: 'Initial Symptom Consultation',
            date: new Date().toLocaleDateString(),
            messages: []
          }];
          setChats(initChat);
          setActiveChatId(initChat[0].id);
          setMessages([]);
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const currentChat = chats.find((c) => c.id === activeChatId);
    if (currentChat) {
      setMessages(currentChat.messages || []);
    }
  }, [activeChatId]);

  const handleAuthSuccess = (userObj) => {
    setCurrentUser(userObj);
    localStorage.setItem('medicai_user', JSON.stringify(userObj));
    if (userObj.age || userObj.gender) {
      const pInfo = {
        age: userObj.age || 'Not specified',
        gender: userObj.gender || 'Not specified',
        allergies: userObj.allergies || 'None',
        conditions: userObj.conditions || 'None'
      };
      setPatientInfo(pInfo);
      localStorage.setItem('medicai_patient_info', JSON.stringify(pInfo));
    }
    setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('medicai_user');
    setCurrentView('WELCOME');
  };

  const handleSavePatientInfo = (newInfo) => {
    setPatientInfo(newInfo);
    localStorage.setItem('medicai_patient_info', JSON.stringify(newInfo));
  };

  const handleCreateNewChat = () => {
    const newId = `chat-${Date.now()}`;
    const newChatObj = {
      id: newId,
      title: 'New Symptom Consultation',
      date: new Date().toLocaleDateString(),
      messages: []
    };
    const updated = [newChatObj, ...chats];
    setChats(updated);
    setActiveChatId(newId);
    setMessages([]);
    setAnalysisData(null);

    if (currentUser?.id) {
      saveUserChatDB(currentUser.id, newChatObj);
    }
  };

  const handleSelectChatSession = (id) => {
    setActiveChatId(id);
  };

  const handleDeleteChatSession = (id) => {
    const updated = chats.filter((c) => c.id !== id);
    if (currentUser?.id) {
      deleteUserChatDB(currentUser.id, id);
    }
    if (updated.length === 0) {
      handleCreateNewChat();
    } else {
      setChats(updated);
      if (activeChatId === id) {
        setActiveChatId(updated[0].id);
      }
    }
  };

  const handleRenameChatSession = (id, newTitle) => {
    const updated = chats.map((c) => (c.id === id ? { ...c, title: newTitle } : c));
    setChats(updated);
    const target = updated.find((c) => c.id === id);
    if (currentUser?.id && target) {
      saveUserChatDB(currentUser.id, target);
    }
  };

  const handleSendMessage = async (userText, displayText = null) => {
    const shownText = displayText || userText;
    const newMessages = [...messages, { role: 'user', content: shownText }];
    setMessages(newMessages);
    setIsStreaming(true);

    const currentChat = chats.find((c) => c.id === activeChatId);
    let updatedTitle = currentChat?.title || 'Symptom Consultation';
    if (!currentChat?.messages || currentChat.messages.length === 0) {
      updatedTitle = shownText.slice(0, 25) + (shownText.length > 25 ? '...' : '');
    }

    // Build payload for AI streaming
    const apiPayloadMessages = messages.map(m => ({ role: m.role, content: m.content }));
    apiPayloadMessages.push({ role: 'user', content: userText });

    let botResponseText = '';
    const tempMessages = [...newMessages, { role: 'assistant', content: '' }];
    setMessages(tempMessages);

    await streamChatMessage({
      messages: apiPayloadMessages,
      patientInfo,
      onChunk: (chunk) => {
        botResponseText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: botResponseText };
          return updated;
        });
      },
      onError: (err) => {
        console.error('Chat error:', err);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: `⚠️ Error communicating with MedGemma 4B via Ollama. Please verify that Ollama is running.\nDetails: ${err.message}`
          };
          return updated;
        });
        setIsStreaming(false);
      },
      onComplete: () => {
        setIsStreaming(false);
        const finalMessages = [...newMessages, { role: 'assistant', content: botResponseText }];
        
        const updatedChatObj = { id: activeChatId, title: updatedTitle, messages: finalMessages, date: new Date().toLocaleDateString() };
        const updatedChats = chats.map((c) => (c.id === activeChatId ? updatedChatObj : c));
        setChats(updatedChats);

        if (currentUser?.id) {
          saveUserChatDB(currentUser.id, updatedChatObj);
        }

        triggerSymptomAnalysis(shownText, finalMessages);
      }
    });
  };

  const triggerSymptomAnalysis = async (latestSymptom, currentHistory) => {
    setIsAnalyzing(true);
    const data = await analyzeSymptoms(latestSymptom, currentHistory);
    if (data) {
      setAnalysisData(data);
    }
    setIsAnalyzing(false);
  };

  const handleSelectPresetPrompt = (promptText, presetId) => {
    setActivePreset(presetId);
    handleSendMessage(promptText);
  };

  const handleAnalyzeSpecificMessage = (content) => {
    setIsDrawerOpen(true);
    triggerSymptomAnalysis(content, messages);
  };

  if (currentView === 'WELCOME') {
    return <WelcomePage onContinue={() => setCurrentView('AUTH')} />;
  }

  if (currentView === 'AUTH') {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onBackToWelcome={() => setCurrentView('WELCOME')}
        onGuestAccess={() => setCurrentView('DASHBOARD')}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col p-2 sm:p-3 overflow-hidden bg-gradient-to-br from-[#f3ebfc] via-[#e5d4fa] to-[#dbc6f8]">
      
      {/* Emergency Notice Banner */}
      <div className="w-full flex-shrink-0 mb-1">
        <EmergencyBanner />
      </div>

      {/* Main 3-Column Layout Container (100% Full Screen Occupancy) */}
      <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-3 min-h-0 relative">
        
        {/* Left Sidebar Panel */}
        <Sidebar
          onSelectPrompt={handleSelectPresetPrompt}
          activePreset={activePreset}
          onOpenPatientModal={() => setIsPatientModalOpen(true)}
          patientInfo={patientInfo}
          onResetChat={handleCreateNewChat}
        />

        {/* Center Main Chat Panel */}
        <main className="flex-1 main-chat-card flex flex-col relative h-full min-h-0 overflow-hidden border border-slate-200/80">
          <Header
            healthStatus={healthStatus}
            onOpenPatientModal={() => setIsPatientModalOpen(true)}
            onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
            onResetChat={handleCreateNewChat}
            hasMessages={messages.length > 0}
            patientInfo={patientInfo}
          />

          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            quickPrompts={quickPrompts}
            onAnalyzeMessage={handleAnalyzeSpecificMessage}
            isAnalyzing={isAnalyzing}
          />
        </main>

        {/* Right Sidebar Panel */}
        <RightSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChatSession}
          onNewChat={handleCreateNewChat}
          onDeleteChat={handleDeleteChatSession}
          onRenameChat={handleRenameChatSession}
          patientInfo={patientInfo}
          onSavePatientInfo={handleSavePatientInfo}
          analysisData={analysisData}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

      </div>

      {/* Modals & Drawers */}
      <SymptomDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        analysisData={analysisData}
        isAnalyzing={isAnalyzing}
      />

      <PatientProfile
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        patientInfo={patientInfo}
        onSave={handleSavePatientInfo}
      />

      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        messages={messages}
        analysisData={analysisData}
        patientInfo={patientInfo}
      />

    </div>
  );
}
