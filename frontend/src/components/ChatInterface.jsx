import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Mic, MicOff, Volume2, VolumeX, Activity, 
  Bot, User, CheckCheck, Loader2, Radio,
  Square, Copy, Check, ArrowDown, X
} from 'lucide-react';
import QuickPrompts from './QuickPrompts';
import MarkdownRenderer from './MarkdownRenderer';
import { convertSpeechToTextElevenLabs, convertTextToSpeechElevenLabs } from '../services/api';

// Helper to strip markdown and code symbols so speech sounds natural and human-like
export function sanitizeForSpeech(markdown) {
  if (!markdown) return '';
  let text = markdown;
  // Remove [SELECT_DISEASE: ...] tags
  text = text.replace(/\[SELECT_DISEASE:\s*[^\]]+\]/gi, '');
  // Remove headers
  text = text.replace(/#{1,6}\s*([^\n]+)/g, '$1. ');
  // Remove bold/italics
  text = text.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  // Remove bullet points
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '');
  // Clean punctuation and spacing
  text = text.replace(/\n+/g, '. ').replace(/\s+/g, ' ').replace(/\.+/g, '.').trim();
  return text;
}

export default function ChatInterface({ 
  messages, 
  onSendMessage, 
  isStreaming, 
  onStopStreaming,
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
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  // Auto-Read response aloud is enabled by default to fulfill hands-free voice consultation
  const [autoRead, setAutoRead] = useState(() => {
    try {
      const saved = localStorage.getItem('medic_ai_autoread');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });
  
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const timerIntervalRef = useRef(null);
  const webSpeechRecognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const speechBaseTextRef = useRef('');
  const keepAliveIntervalRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const prevStreamingRef = useRef(false);
  const speechSessionIdRef = useRef(0);

  // Persist Auto-Read preference
  useEffect(() => {
    try {
      localStorage.setItem('medic_ai_autoread', autoRead ? 'true' : 'false');
    } catch (e) {}
  }, [autoRead]);

  // Preload speech synthesis voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Handle scroll detection
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setUserScrolledUp(!isNearBottom);
  };

  const scrollToBottom = (smooth = true) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setUserScrolledUp(false);
    }
  };

  // Auto scroll to bottom while streaming if user hasn't scrolled up
  useEffect(() => {
    if (!userScrolledUp && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isStreaming, userScrolledUp]);

  // Copy assistant message to clipboard
  const handleCopyText = async (text, idx) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  // Cleanup any playing audio on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // Format recording timer: 00:05
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Start Real-Time Voice Dictation (Listens to user voice continuously)
  const startVoiceRecording = async () => {
    stopAllAudio(); // Stop any ongoing speech reading when user starts speaking
    speechBaseTextRef.current = inputText.trim() ? `${inputText.trim()} ` : '';
    setRecordingSeconds(0);
    clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    isRecordingRef.current = true;
    setIsRecording(true);

    // 1. Launch real-time speech recognition immediately (Live transcription in textarea)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let webSpeechActive = false;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalWords = '';
          let interimWords = '';
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalWords += res[0].transcript + ' ';
            } else {
              interimWords += res[0].transcript;
            }
          }
          const liveTranscript = (finalWords + interimWords).trim();
          if (liveTranscript) {
            setInputText((speechBaseTextRef.current + liveTranscript).trim());
          }
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition warning:', e.error);
        };

        recognition.onend = () => {
          // If still recording, keep listening continuously (prevents Chrome silence timeout)
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (err) {}
          }
        };

        recognition.start();
        webSpeechRecognitionRef.current = recognition;
        webSpeechActive = true;
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    }

    // 2. Also record media audio in parallel for ElevenLabs Scribe STT
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      mediaRecorderRef.current = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerIntervalRef.current);

        // Fallback for browsers lacking WebSpeech
        if (!webSpeechActive && audioChunksRef.current.length > 0) {
          const recordedBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          try {
            const elevenText = await convertSpeechToTextElevenLabs(recordedBlob);
            if (elevenText && elevenText.trim()) {
              setInputText((speechBaseTextRef.current + elevenText.trim()).trim());
            }
          } catch (e) {
            console.warn('STT fallback notice:', e);
          }
        }

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }
      };

      mediaRecorderRef.current.start();
    } catch (err) {
      if (!webSpeechActive) {
        alert('Microphone access is not supported or was denied in this browser.');
        setIsRecording(false);
        isRecordingRef.current = false;
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const stopVoiceRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    clearInterval(timerIntervalRef.current);

    if (webSpeechRecognitionRef.current) {
      try {
        webSpeechRecognitionRef.current.stop();
      } catch (e) {}
      webSpeechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Stop any active audio immediately (both ElevenLabs player and browser speech)
  const stopAllAudio = () => {
    speechSessionIdRef.current += 1;

    // 1. Stop and reset ElevenLabs audio element
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.removeAttribute('src');
      } catch (e) {}
    }

    // 2. Stop and clear browser speech synthesis
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    clearInterval(keepAliveIntervalRef.current);
    activeUtteranceRef.current = null;
    setPlayingTTSIdx(null);
  };

  // Text-to-Speech: ElevenLabs with High-Fidelity Chunked Browser Speech Fallback
  const handleTTS = async (text, index) => {
    if (playingTTSIdx === index) {
      stopAllAudio();
      return;
    }

    // Stop any previously playing audio
    stopAllAudio();

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) return;

    // Start a fresh, unique session for this playback
    speechSessionIdRef.current += 1;
    const currentSessionId = speechSessionIdRef.current;

    setIsLoadingTTS(index);

    // 1. Try ElevenLabs API first
    let audioUrl = null;
    try {
      audioUrl = await convertTextToSpeechElevenLabs(cleanText);
    } catch (e) {
      console.warn('ElevenLabs API unavailable:', e);
    }
    setIsLoadingTTS(null);

    // If user clicked Stop while ElevenLabs was requesting, abort
    if (speechSessionIdRef.current !== currentSessionId) return;

    if (audioUrl) {
      audioPlayerRef.current.src = audioUrl;
      audioPlayerRef.current.play().then(() => {
        if (speechSessionIdRef.current === currentSessionId) {
          setPlayingTTSIdx(index);
        }
      }).catch((err) => {
        console.warn('Audio playback error, falling back to browser speech:', err);
        speakWithBrowser(cleanText, index, currentSessionId);
      });

      audioPlayerRef.current.onended = () => {
        if (speechSessionIdRef.current === currentSessionId) {
          setPlayingTTSIdx(null);
        }
      };
      audioPlayerRef.current.onerror = () => {
        if (speechSessionIdRef.current === currentSessionId) {
          setPlayingTTSIdx(null);
        }
      };
    } else {
      // 2. High-Fidelity Browser Speech Synthesis (Natural Sentence-by-Sentence Queue)
      speakWithBrowser(cleanText, index, currentSessionId);
    }
  };

  // Bulletproof Sequential Sentence-by-Sentence Browser Speech Engine
  const speakWithBrowser = (cleanText, index, sessionId = null) => {
    if (!('speechSynthesis' in window)) {
      setPlayingTTSIdx(null);
      return;
    }

    const currentSessionId = sessionId || (++speechSessionIdRef.current);

    // Check if session was already cancelled
    if (speechSessionIdRef.current !== currentSessionId) {
      setPlayingTTSIdx(null);
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();
    } catch (e) {}

    clearInterval(keepAliveIntervalRef.current);

    // Split text into natural sentences to avoid Chromium 15s cutoff bug
    const rawSentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    const sentences = rawSentences.map((s) => s.trim()).filter(Boolean);
    if (sentences.length === 0) {
      setPlayingTTSIdx(null);
      return;
    }

    // Select the best natural sounding voice
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find((v) => 
      (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || 
       v.name.includes('Jenny') || v.name.includes('Guy') || v.name.includes('Aria') || 
       v.name.includes('Christopher')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];

    let currentSentenceIdx = 0;

    const speakNextSentence = () => {
      // If user stopped reading or a newer session began, STOP IMMEDIATELY
      if (speechSessionIdRef.current !== currentSessionId) {
        setPlayingTTSIdx(null);
        return;
      }

      if (currentSentenceIdx >= sentences.length) {
        clearInterval(keepAliveIntervalRef.current);
        activeUtteranceRef.current = null;
        setPlayingTTSIdx(null);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentences[currentSentenceIdx]);
      if (naturalVoice) utterance.voice = naturalVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        // If cancelled while speaking, DO NOT proceed to the next sentence!
        if (speechSessionIdRef.current !== currentSessionId) {
          setPlayingTTSIdx(null);
          return;
        }
        currentSentenceIdx++;
        speakNextSentence();
      };

      utterance.onerror = (e) => {
        // When cancel() is called, Chromium fires onerror with 'canceled' or 'interrupted'
        if (speechSessionIdRef.current !== currentSessionId || e.error === 'canceled' || e.error === 'interrupted') {
          setPlayingTTSIdx(null);
          return;
        }
        console.warn('Speech chunk notice:', e.error);
        currentSentenceIdx++;
        speakNextSentence();
      };

      // Store in ref to avoid Chromium garbage collection bug
      activeUtteranceRef.current = utterance;

      // Small 20ms pause ensures Chrome's audio engine is ready after cancel()
      setTimeout(() => {
        if (speechSessionIdRef.current === currentSessionId) {
          window.speechSynthesis.speak(utterance);
        }
      }, 20);
    };

    // Chrome keep-alive bug workaround
    keepAliveIntervalRef.current = setInterval(() => {
      if (speechSessionIdRef.current !== currentSessionId) {
        clearInterval(keepAliveIntervalRef.current);
        return;
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 8000);

    setPlayingTTSIdx(index);
    speakNextSentence();
  };

  // Auto-read response aloud when generation completes if autoRead is enabled
  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && autoRead && messages.length > 0) {
      const lastIdx = messages.length - 1;
      const lastMsg = messages[lastIdx];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
        handleTTS(lastMsg.content, lastIdx);
      }
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, autoRead, messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    stopAllAudio(); // Stop any reading audio when submitting new message
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
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto pr-2 mb-3 min-h-0 ${messages.length === 0 ? 'flex flex-col items-center justify-center my-auto' : 'space-y-5'}`}
      >
        
        {/* Welcome Empty State */}
        {messages.length === 0 && (
          <div className="py-8 px-4 text-center max-w-2xl mx-auto space-y-4 my-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-300 text-white flex items-center justify-center mx-auto shadow-xl shadow-purple-500/25">
              <Bot className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Hello! I'm MedicAI</h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Powered by <strong className="text-purple-700 font-bold">BioMistral 7B</strong> & <strong className="text-purple-700 font-bold">ElevenLabs Voice AI</strong>. Describe your symptoms or select a prompt below.
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
          const isLast = idx === messages.length - 1;
          const isCurrentStreaming = isStreaming && isLast && !isUser;
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 my-2.5 ${isUser ? 'justify-end pl-6' : 'justify-start pr-6'}`}
            >
              {!isUser && (
                <div className={`w-8 h-8 rounded-full bg-purple-100 border border-purple-300 text-purple-700 flex items-center justify-center flex-shrink-0 shadow-sm mt-1 ${isCurrentStreaming ? 'animate-pulse ring-2 ring-purple-400/40' : ''}`}>
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
                      isStreaming={isCurrentStreaming}
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
                    isCurrentStreaming ? (
                      <div className="flex items-center gap-1.5 ml-2 text-purple-600 font-semibold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                        <span>Generating response...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 ml-2">
                        {/* ChatGPT-style Copy Button */}
                        <button
                          onClick={() => handleCopyText(msg.content, idx)}
                          className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 px-2 py-0.5 rounded-full transition-colors border border-slate-200 hover:border-purple-200 shadow-sm cursor-pointer"
                          title="Copy response"
                        >
                          {copiedIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleTTS(msg.content, idx)}
                          className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors border shadow-sm cursor-pointer ${
                            playingTTSIdx === idx
                              ? 'bg-purple-100 text-purple-900 border-purple-300 font-bold'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                          }`}
                          title={playingTTSIdx === idx ? 'Stop Speaking' : 'Read Response Aloud'}
                        >
                          {isLoadingTTS === idx ? (
                            <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                          ) : playingTTSIdx === idx ? (
                            <>
                              <div className="flex items-end gap-0.5 h-3">
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                                <span className="soundwave-bar" />
                              </div>
                              <span>Stop Speaking</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5 text-purple-600" />
                              <span>Listen Voice</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onAnalyzeMessage(msg.content)}
                          className="flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors border border-purple-200 cursor-pointer"
                          title="Analyze Symptoms"
                        >
                          <Activity className="w-3 h-3 text-purple-600" />
                          <span>Analyze</span>
                        </button>
                      </div>
                    )
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

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {userScrolledUp && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-20 right-8 z-30 p-2 rounded-full bg-white text-purple-700 shadow-lg border border-purple-200 hover:bg-purple-50 hover:shadow-xl transition-all flex items-center justify-center cursor-pointer animate-bounce"
          title="Scroll to latest message"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      {/* Active Voice Listening Banner */}
      {isRecording && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-xl bg-gradient-to-r from-rose-50 via-purple-50 to-rose-50 border border-rose-200/80 text-rose-700 shadow-md flex-shrink-0 animate-pulse">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span>Listening to your voice ({formatTime(recordingSeconds)})... Speak symptoms now</span>
          </div>
          <button
            type="button"
            onClick={stopVoiceRecording}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Done Speaking
          </button>
        </div>
      )}

      {/* Active Reading Aloud (TTS) Floating Banner */}
      {playingTTSIdx !== null && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 rounded-xl bg-gradient-to-r from-purple-100 via-indigo-50 to-purple-100 border border-purple-300 text-purple-900 shadow-sm flex-shrink-0 animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
            </div>
            <span>Reading response aloud...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                setAutoRead(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-purple-800 border border-purple-200 text-[11px] font-medium transition-all cursor-pointer shadow-xs active:scale-95"
              title="Stop audio reading and turn off Auto-Read"
            >
              Mute & Turn Off Auto-Read
            </button>
            <button
              type="button"
              onClick={stopAllAudio}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95"
              title="Stop and close audio reading"
            >
              <X className="w-3.5 h-3.5" />
              <span>Stop Reading</span>
            </button>
          </div>
        </div>
      )}

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

          {/* Auto Read Aloud Toggle Button with ON/OFF status */}
          <button
            type="button"
            onClick={() => setAutoRead((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer border select-none active:scale-95 ${
              autoRead
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm hover:bg-purple-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title={autoRead ? 'Auto-Read is ON. Click to turn OFF.' : 'Auto-Read is OFF. Click to turn ON.'}
          >
            {autoRead ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] font-bold">Auto-Read ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] font-bold">Auto-Read OFF</span>
              </>
            )}
          </button>

          {/* Microphone Dictation Button (Click to start, click to stop - Never Rotates) */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            className={`p-2.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
            }`}
            title={isRecording ? 'Click to stop listening' : 'Click to speak your symptoms (Voice Input)'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4 animate-pulse text-white" />
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 text-purple-700" />
                <span className="hidden sm:inline">Voice Input</span>
              </>
            )}
          </button>

          {/* Send or Stop Generating Button (ChatGPT Style) */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              className="h-8 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white transition-all shadow-md shadow-slate-900/20 flex items-center gap-1.5 cursor-pointer text-xs font-semibold group flex-shrink-0"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-white text-white" />
              <span className="text-[11px] font-bold tracking-wide">Stop</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ease-out shadow-md shadow-purple-600/20 hover:shadow-lg hover:shadow-purple-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center group flex-shrink-0 cursor-pointer"
              title="Send Symptom Description"
            >
              <Send className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          )}
        </div>
      </form>

    </div>
  );
}
