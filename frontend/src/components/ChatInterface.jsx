import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Activity, 
  Bot, User, Play, Pause, CheckCheck, Sparkles, Paperclip, Loader2, Radio 
} from 'lucide-react';
import QuickPrompts from './QuickPrompts';
import MarkdownRenderer from './MarkdownRenderer';
import { convertSpeechToTextElevenLabs, convertTextToSpeechElevenLabs } from '../services/api';

export default function ChatInterface({ 
  messages, 
  onSendMessage, 
  isStreaming, 
  quickPrompts, 
  onAnalyzeMessage,
  isAnalyzing
}) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessingSTT, setIsProcessingSTT] = useState(false);
  
  const [playingTTSIdx, setPlayingTTSIdx] = useState(null);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(new Audio());
  const timerIntervalRef = useRef(null);
  const webSpeechRecognitionRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  // Setup Web Speech API for fallback STT dictation
  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      webSpeechRecognitionRef.current = new SpeechRecognition();
      webSpeechRecognitionRef.current.continuous = false;
      webSpeechRecognitionRef.current.interimResults = true;

      webSpeechRecognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0])
          .map((result) => result.transcript)
          .join('');
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      webSpeechRecognitionRef.current.onend = () => {
        setIsRecording(false);
        clearInterval(timerIntervalRef.current);
      };
    }
  }, []);

  // Format recording timer: 00:05
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Voice Dictation
  const startVoiceRecording = async () => {
    setRecordingSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // Try MediaRecorder for ElevenLabs Scribe v2 first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsProcessingSTT(true);
        
        // Call ElevenLabs STT API
        const text = await convertSpeechToTextElevenLabs(audioBlob);
        setIsProcessingSTT(false);

        if (text) {
          setInputText((prev) => (prev ? `${prev} ${text}` : text));
        } else {
          // Fallback to Web Speech API if ElevenLabs API key has no STT permission
          console.warn('ElevenLabs STT fallback to Web Speech API');
          if (webSpeechRecognitionRef.current) {
            webSpeechRecognitionRef.current.start();
          }
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('MediaRecorder error, falling back to Web Speech API:', err);
      if (webSpeechRecognitionRef.current) {
        webSpeechRecognitionRef.current.start();
        setIsRecording(true);
      } else {
        alert('Microphone access is not supported or denied in this browser.');
      }
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else if (webSpeechRecognitionRef.current && isRecording) {
      webSpeechRecognitionRef.current.stop();
      setIsRecording(false);
    }
    clearInterval(timerIntervalRef.current);
  };


  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Text-to-Speech (ElevenLabs Multilingual v2 with Web Speech API fallback)
  const handleTTS = async (text, index) => {
    if (playingTTSIdx === index) {
      audioPlayerRef.current.pause();
      window.speechSynthesis?.cancel();
      setPlayingTTSIdx(null);
      return;
    }

    setIsLoadingTTS(index);
    const audioUrl = await convertTextToSpeechElevenLabs(text);
    setIsLoadingTTS(null);

    if (audioUrl) {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.play();
      setPlayingTTSIdx(index);

      audioPlayerRef.current.onended = () => {
        setPlayingTTSIdx(null);
      };
    } else {
      // 100% Reliable Web Speech API Fallback
      console.warn('Falling back to Web Speech API for TTS');
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.onend = () => setPlayingTTSIdx(null);
        utterance.onerror = () => setPlayingTTSIdx(null);
        setPlayingTTSIdx(index);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 px-4 sm:px-6 pt-3 pb-5 relative overflow-visible">
      
      {/* Scrollable Messages Container */}
      <div className={`flex-1 overflow-y-auto pr-2 mb-3 min-h-0 ${messages.length === 0 ? 'flex flex-col items-center justify-center my-auto' : 'space-y-5'}`}>
        
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="py-8 px-4 text-center max-w-2xl mx-auto space-y-4 my-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-300 text-white flex items-center justify-center mx-auto shadow-xl shadow-purple-500/25">
              <Bot className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Hello! I'm MedicAI</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Powered by <strong className="text-purple-700 font-bold">MedGemma 4B</strong> & <strong className="text-purple-700 font-bold">ElevenLabs Voice AI</strong>. Describe your symptoms or select a prompt below.
              </p>
            </div>

            <div className="w-full pt-2">
              <QuickPrompts 
                categories={quickPrompts} 
                onSelectPrompt={(p) => setInputText(p)} 
              />
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 my-2.5 ${isUser ? 'justify-end pl-6' : 'justify-start pr-6'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[82%] space-y-1 ${isUser ? 'flex flex-col items-end' : ''}`}>
                <div
                  className={`p-3.5 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-xs shadow-md shadow-purple-600/15 font-medium break-words max-w-full text-left'
                      : 'assistant-bubble'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <MarkdownRenderer 
                      content={msg.content} 
                      onSelectDisease={(disease) => onSendMessage(
                        `I select ${disease}. Please provide the specific OTC medications, dosages, precautions, and curing techniques for ${disease}.`,
                        `I select ${disease}`
                      )}
                    />
                  )}
                </div>

                {/* Bubble Footer Actions */}
                <div className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <span>{isUser ? 'Patient' : 'MedicAI'}</span>
                  <span>•</span>
                  <span>{timeStr}</span>

                  {!isUser && (
                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => handleTTS(msg.content, idx)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors border border-purple-200 shadow-sm"
                        title="Play Voice Audio"
                      >
                        {isLoadingTTS === idx ? (
                          <Loader2 className="w-3 h-3 text-purple-600 animate-spin" />
                        ) : playingTTSIdx === idx ? (
                          <VolumeX className="w-3 h-3 text-rose-500 animate-pulse" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-purple-600" />
                        )}
                        <span>{playingTTSIdx === idx ? 'Playing Audio...' : 'Listen Voice'}</span>
                      </button>

                      <button
                        onClick={() => onAnalyzeMessage(msg.content)}
                        className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors border border-purple-200"
                        title="Analyze Symptoms"
                      >
                        <Activity className="w-3 h-3 text-purple-600" />
                        <span>Analyze</span>
                      </button>
                    </div>
                  )}

                  {isUser && (
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500 ml-1" />
                  )}
                </div>
              </div>

              {isUser && (
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-md mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-full bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="assistant-bubble p-3.5">
              <div className="typing-indicator flex items-center gap-1">
                <span></span>
                <span></span>
                <span></span>
                <span className="text-xs text-purple-700 font-semibold ml-2">MedGemma reasoning...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Perfect Floating Bottom Typing Bar */}
      <form 
        onSubmit={handleSubmit}
        style={{ minHeight: '46px', height: 'auto' }}
        className="bg-white hover:bg-[#fafafa] focus-within:bg-[#fafafa] border border-purple-300/80 focus-within:border-purple-500 rounded-2xl px-3 py-2 shadow-lg shadow-purple-900/5 focus-within:shadow-[0_0_20px_2px_rgba(139,92,246,0.25),0_10px_25px_-5px_rgba(139,92,246,0.1)] transition-all duration-300 flex items-end gap-2.5 flex-shrink-0 relative z-20"
      >
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isRecording
              ? `Listening to your voice (${formatTime(recordingSeconds)})... Click mic to stop.`
              : isProcessingSTT
              ? 'Converting customer speech to text...'
              : 'Describe your symptoms, e.g., "Fever and headache for 2 days"...'
          }
          rows={1}
          style={{ minHeight: '44px', maxHeight: '200px', paddingTop: '10px', paddingBottom: '10px', overflowY: 'auto' }}
          className="flex-1 bg-transparent text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none resize-none px-3 font-sans leading-relaxed block"
        />

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 self-center mb-[2px]">
          
          {/* Sound Wave Recording Indicator */}
          {isRecording && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-mono font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-rose-600" />
              <span>{formatTime(recordingSeconds)}</span>
            </div>
          )}

          {/* Microphone Dictation Button */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-1 text-xs font-bold ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                : isProcessingSTT
                ? 'bg-amber-500 text-white animate-spin'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
            }`}
            title="Speech-to-Text Dictation"
          >
            {isProcessingSTT ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Voice Input</span>
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isStreaming}
            className="w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none transition-all duration-200 ease-out shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center group flex-shrink-0"
            title="Send Symptom Description"
          >
            <Send className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </form>

    </div>
  );
}
