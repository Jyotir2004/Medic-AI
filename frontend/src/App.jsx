import React, { useState, useEffect, useRef } from 'react';
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

  const [healthStatus, setHealthStatus] = useState({ status: 'checking', hf_available: false, model_available: false });
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

  const abortControllerRef = useRef(null);

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (userText, displayText = null) => {
    // Abort any prior streaming if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

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
      signal: abortController.signal,
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
            content: `⚠️ Error communicating with AI service. Please verify your connection.\nDetails: ${err.message}`
          };
          return updated;
        });
        setIsStreaming(false);
        abortControllerRef.current = null;
      },
      onComplete: () => {
        setIsStreaming(false);
        abortControllerRef.current = null;
        const finalMessages = [...newMessages, { role: 'assistant', content: botResponseText }];
        
        const updatedChatObj = { id: activeChatId, title: updatedTitle, messages: finalMessages, date: new Date().toLocaleDateString() };
        const updatedChats = chats.map((c) => (c.id === activeChatId ? updatedChatObj : c));
        setChats(updatedChats);

        if (currentUser?.id) {
          saveUserChatDB(currentUser.id, updatedChatObj);
        }

        // Minimize LLM calls: Only trigger secondary analysis if the user message reports clinical symptoms
        const isMedicalQuery = () => {
          if (!shownText || shownText.trim().length < 5) return false;
          const lower = shownText.toLowerCase().trim();
          const conversationalPhrases = [
            'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
            'thanks', 'thank you', 'ok', 'okay', 'bye', 'goodbye', 'who are you', 'how are you'
          ];
          if (conversationalPhrases.some(p => lower === p || lower === `${p}!` || lower === `${p}.`)) {
            return false;
          }
          const medicalKeywords = [
            'pain', 'ache', 'fever', 'cough', 'cold', 'sore', 'throat', 'headache',
            'stomach', 'nausea', 'vomit', 'dizzy', 'fatigue', 'rash', 'burn', 'itch',
            'breath', 'chest', 'cramp', 'swell', 'infection', 'allergy', 'sick', 'hurt',
            'symptom', 'disease', 'condition', 'migraine', 'flu', 'select', 'pressure'
          ];
          return medicalKeywords.some(kw => lower.includes(kw)) || lower.length > 25;
        };

        // Minimize LLM calls: Single-pass direct extraction from the assistant response
        const directDiagnosis = extractAnalysisFromText(botResponseText, shownText);
        if (directDiagnosis) {
          setAnalysisData(directDiagnosis);
        } else if (botResponseText.trim() && isMedicalQuery()) {
          triggerSymptomAnalysis(shownText, finalMessages);
        }
      }
    });
  };

  // Single-pass parser extracting structured clinical metadata without firing a 2nd LLM call
  const extractAnalysisFromText = (responseText, userPrompt) => {
    if (!responseText) return null;

    const diseaseMatches = [...responseText.matchAll(/\[SELECT_DISEASE:\s*([^\]]+)\]/g)];
    const diseases = diseaseMatches.map((m, idx) => ({
      name: m[1].trim(),
      description: `Differential condition identified for: "${userPrompt}"`,
      likelihood: idx === 0 ? 'High' : idx === 1 ? 'Moderate' : 'Low'
    }));

    const targetMatch = responseText.match(/###\s*🔍\s*TARGET CONDITION:\s*([^\n]+)/i);
    if (targetMatch && targetMatch[1]) {
      diseases.unshift({
        name: targetMatch[1].trim(),
        description: 'Target condition evaluated for comprehensive treatment',
        likelihood: 'High'
      });
    }

    const medicines = [];
    const medSection = responseText.split(/###\s*💊\s*SUGGESTED/i)[1];
    if (medSection) {
      const medBlock = medSection.split(/###/)[0];
      const medMatches = [...medBlock.matchAll(/-\s*\*\*([^*]+)\*\*/g)];
      medMatches.forEach((m) => {
        const name = m[1].trim();
        if (!name.toLowerCase().includes('dosage') && !name.toLowerCase().includes('purpose') && !name.toLowerCase().includes('precaution')) {
          medicines.push({
            name,
            type: 'OTC Tablet / Care',
            purpose: 'Symptom relief and therapeutic support',
            dosage_note: 'Take as directed on packaging with water',
            precautions: 'Do not exceed maximum daily dosage; consult doctor if symptoms persist.'
          });
        }
      });
    }

    const techniques = [];
    const techSection = responseText.split(/###\s*🌿\s*CURING/i)[1];
    if (techSection) {
      const techBlock = techSection.split(/###/)[0];
      const techLines = techBlock.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('-'))
        .map((l) => l.replace(/^-\s*(\*\*)?/, '').replace(/\*\*/g, '').trim())
        .filter(Boolean);
      techniques.push(...techLines);
    }

    const redFlags = [];
    const flagSection = responseText.split(/###\s*⚠️\s*RED FLAGS/i)[1];
    if (flagSection) {
      const flagBlock = flagSection.split(/###/)[0];
      const flagLines = flagBlock.split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('-'))
        .map((l) => l.replace(/^-\s*/, '').trim())
        .filter(Boolean);
      redFlags.push(...flagLines);
    }

    if (diseases.length > 0 || medicines.length > 0) {
      return {
        symptoms: [userPrompt],
        possible_diseases: diseases.length > 0 ? diseases : [
          { name: 'Clinical Evaluation', description: userPrompt, likelihood: 'Moderate' }
        ],
        suggested_medicines: medicines.length > 0 ? medicines : [
          {
            name: 'Paracetamol (Acetaminophen) 500mg',
            type: 'Tablet (OTC)',
            purpose: 'Pain relief and temperature reduction',
            dosage_note: '1 tablet every 4-6 hours as needed',
            precautions: 'Do not exceed 4,000 mg in 24 hours.'
          }
        ],
        curing_techniques: techniques.length > 0 ? techniques : [
          'Drink 2-3 liters of fluids daily to stay hydrated',
          'Ensure 8+ hours of restful sleep',
          'Monitor body temperature and symptom progression'
        ],
        urgency_level: redFlags.length > 0 ? 'Moderate' : 'Low',
        red_flags: redFlags.length > 0 ? redFlags : [
          'Persistent high fever > 38.5°C (101.3°F) for over 3 days',
          'Difficulty breathing, acute chest pain, or severe weakness'
        ],
        disclaimer: 'This diagnosis summary is generated by BioMistral 7B. Consult a licensed physician for prescription treatments.'
      };
    }

    return null;
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
            onStopStreaming={handleStopStreaming}
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
