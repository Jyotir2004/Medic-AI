const API_BASE_URL = 'http://localhost:8000';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'disconnected',
      ollama_available: false,
      model_available: false,
      error: err.message
    };
  }
}

// User Auth APIs (SQLite DB)
export async function registerUser(userData) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Persistent Chat DB APIs (SQLite DB)
export async function fetchUserChats(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/chats/${userId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.chats || [];
  } catch (err) {
    console.error('Fetch chats error:', err);
    return [];
  }
}

export async function saveUserChatDB(userId, chatSession) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/chats/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: chatSession.id,
        title: chatSession.title,
        messages: chatSession.messages || []
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Save chat DB error:', err);
    return false;
  }
}

export async function deleteUserChatDB(userId, chatId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/chats/${userId}/${chatId}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.error('Delete chat DB error:', err);
    return false;
  }
}

export async function streamChatMessage({ messages, patientInfo, onChunk, onError, onComplete }) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        patient_info: patientInfo
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') {
            if (onComplete) onComplete();
            return;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.content && onChunk) {
              onChunk(parsed.content);
            }
          } catch (e) {
            console.error('Error parsing SSE chunk:', e);
          }
        }
      }
    }
    if (onComplete) onComplete();
  } catch (err) {
    if (onError) onError(err);
  }
}

export async function analyzeSymptoms(symptoms, conversationHistory = []) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symptoms,
        conversation_history: conversationHistory
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    return result.data;
  } catch (err) {
    console.error('Symptom analysis error:', err);
    return null;
  }
}

// ElevenLabs Speech-to-Text (STT) via Scribe v2
export async function convertSpeechToTextElevenLabs(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'speech.webm');

    const res = await fetch(`${API_BASE_URL}/api/voice/stt`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.text : null;
  } catch (err) {
    console.warn('ElevenLabs STT server error:', err);
    return null;
  }
}

// ElevenLabs Text-to-Speech (TTS) via Multilingual v2
export async function convertTextToSpeechElevenLabs(text, voiceId = null) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/voice/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId
      })
    });

    if (!res.ok) return null;
    const audioBlob = await res.blob();
    return URL.createObjectURL(audioBlob);
  } catch (err) {
    console.warn('ElevenLabs TTS server error:', err);
    return null;
  }
}

export async function fetchQuickSymptoms() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/quick-symptoms`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  } catch (err) {
    return [];
  }
}
