import httpx
from typing import Dict, Any, Optional
from config import settings

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.stt_model = settings.ELEVENLABS_STT_MODEL
        self.tts_model = settings.ELEVENLABS_TTS_MODEL
        self.default_voice = settings.ELEVENLABS_VOICE_ID

    async def speech_to_text(self, audio_bytes: bytes, filename: str = "audio.webm", content_type: str = "audio/webm") -> Dict[str, Any]:
        """Convert speech to text using ElevenLabs Scribe v2 API."""
        url = "https://api.elevenlabs.io/v1/speech-to-text"
        headers = {
            "xi-api-key": self.api_key
        }

        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model_id": self.stt_model
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, headers=headers, data=data, files=files)
                if res.status_code == 200:
                    result = res.json()
                    return {
                        "success": True,
                        "text": result.get("text", "").strip(),
                        "model": self.stt_model
                    }
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
        """Convert text to speech audio stream using ElevenLabs Multilingual v2 API."""
        target_voice = voice_id or self.default_voice
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{target_voice}"
        headers = {
            "xi-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg"
        }
        payload = {
            "text": text[:1000], # Cap text for optimal synthesis response
            "model_id": self.tts_model,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    return res.content
                else:
                    print(f"ElevenLabs TTS Error HTTP {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            print(f"ElevenLabs TTS Exception: {e}")
            return None

elevenlabs_service = ElevenLabsService()
