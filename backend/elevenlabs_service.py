import re
import httpx
from typing import Dict, Any, Optional
from config import settings

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.stt_model = getattr(settings, "ELEVENLABS_STT_MODEL", "scribe_v1")
        self.tts_model = getattr(settings, "ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")
        self.default_voice = getattr(settings, "ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        self._tts_disabled = False
        self._stt_disabled = False

    def is_tts_ready(self) -> bool:
        return bool(self.api_key and not self._tts_disabled)

    def is_stt_ready(self) -> bool:
        return bool(self.api_key and not self._stt_disabled)

    def clean_text_for_speech(self, text: str) -> str:
        """Strip markdown syntax, disease selector tags, and symbols for natural spoken speech."""
        if not text:
            return ""
        clean = re.sub(r'\[SELECT_DISEASE:\s*[^\]]+\]', '', text, flags=re.IGNORECASE)
        clean = re.sub(r'```[\s\S]*?```', '', clean)
        clean = re.sub(r'#{1,6}\s*([^\n]+)', r'\1. ', clean)
        clean = re.sub(r'[*_]{1,3}([^*_]+)[*_]{1,3}', r'\1', clean)
        clean = re.sub(r'^\s*[-*+]\s+', '', clean, flags=re.MULTILINE)
        clean = re.sub(r'[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]', '', clean, flags=re.UNICODE)
        clean = re.sub(r'\be\.g\.\b', 'for example', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\bi\.e\.\b', 'that is', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\bdr\.\b', 'Doctor', clean, flags=re.IGNORECASE)
        clean = re.sub(r'\n+', '. ', clean)
        clean = re.sub(r'\s+', ' ', clean)
        clean = re.sub(r'\.+', '.', clean).strip()
        return clean[:1200]

    async def speech_to_text(self, audio_bytes: bytes, filename: str = "audio.webm", content_type: str = "audio/webm") -> Dict[str, Any]:
        """Convert speech to text using ElevenLabs Scribe API."""
        if not self.api_key or self._stt_disabled:
            return {"success": False, "error": "ElevenLabs STT unavailable", "text": ""}

        url = "https://api.elevenlabs.io/v1/speech-to-text"
        headers = {"xi-api-key": self.api_key}
        files = {"file": (filename, audio_bytes, content_type)}
        data = {"model_id": self.stt_model}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, data=data, files=files)
                if res.status_code == 200:
                    result = res.json()
                    return {
                        "success": True,
                        "text": result.get("text", "").strip(),
                        "model": self.stt_model
                    }
                else:
                    if res.status_code == 401 and "missing_permissions" in res.text:
                        print("ElevenLabs STT key lacks speech_to_text permission; using browser speech recognition.")
                        self._stt_disabled = True
                    else:
                        print(f"ElevenLabs STT HTTP {res.status_code}: {res.text}")
                    return {
                        "success": False,
                        "error": f"ElevenLabs STT HTTP {res.status_code}",
                        "text": ""
                    }
        except Exception as e:
            print(f"ElevenLabs STT Exception: {e}")
            return {
                "success": False,
                "error": str(e),
                "text": ""
            }

    async def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> Optional[bytes]:
        """Convert text to speech audio stream using ElevenLabs API."""
        if not self.api_key or self._tts_disabled or not text.strip():
            return None

        clean_text = self.clean_text_for_speech(text)
        if not clean_text:
            return None

        target_voice = voice_id or self.default_voice
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{target_voice}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        payload = {
            "text": clean_text,
            "model_id": self.tts_model,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.content
                else:
                    if res.status_code == 401 and "missing_permissions" in res.text:
                        print("ElevenLabs TTS key lacks text_to_speech permission; using high-fidelity browser voice.")
                        self._tts_disabled = True
                    else:
                        print(f"ElevenLabs TTS Error HTTP {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            print(f"ElevenLabs TTS Exception: {e}")
            return None

elevenlabs_service = ElevenLabsService()
