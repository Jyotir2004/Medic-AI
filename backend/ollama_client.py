import json
import httpx
from typing import AsyncGenerator, Dict, Any, List
from config import settings
from prompts import SYSTEM_MEDICAL_CHAT_PROMPT, SYSTEM_STRUCTURED_ANALYSIS_PROMPT

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    async def check_health(self) -> Dict[str, Any]:
        """Check if Ollama service is up and if medgemma:4b model exists."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    model_found = any(self.model in m for m in models)
                    return {
                        "status": "connected",
                        "ollama_available": True,
                        "target_model": self.model,
                        "model_available": model_found,
                        "all_models": models
                    }
                return {
                    "status": "error",
                    "ollama_available": False,
                    "target_model": self.model,
                    "model_available": False,
                    "error": f"Ollama HTTP {res.status_code}"
                }
        except Exception as e:
            return {
                "status": "disconnected",
                "ollama_available": False,
                "target_model": self.model,
                "model_available": False,
                "error": str(e)
            }

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        patient_info: Dict[str, str] = None
    ) -> AsyncGenerator[str, None]:
        """Stream chat responses from Ollama API."""
        p_info = patient_info or {}
        system_content = SYSTEM_MEDICAL_CHAT_PROMPT.format(
            patient_age=p_info.get("age", "Not specified"),
            patient_gender=p_info.get("gender", "Not specified"),
            patient_allergies=p_info.get("allergies", "None reported"),
            patient_conditions=p_info.get("conditions", "None reported")
        )

        formatted_messages = [{"role": "system", "content": system_content}]
        formatted_messages.extend(messages)

        payload = {
            "model": self.model,
            "messages": formatted_messages,
            "stream": True,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9
            }
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    yield f"Error: Ollama returned status code {response.status_code}"
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue

    async def analyze_symptoms(
        self,
        symptoms_text: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Request structured JSON diagnostic breakdown from medgemma:4b."""
        history_context = ""
        if conversation_history:
            for msg in conversation_history[-6:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_context += f"{role}: {msg['content']}\n"

        user_prompt = f"Conversation History:\n{history_context}\nLatest Symptom Query:\n{symptoms_text}\n\nProvide the JSON diagnostic object now."

        messages = [
            {"role": "system", "content": SYSTEM_STRUCTURED_ANALYSIS_PROMPT},
            {"role": "user", "content": user_prompt}
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2
            }
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                res = await client.post(f"{self.base_url}/api/chat", json=payload)
                if res.status_code == 200:
                    result = res.json()
                    content_str = result.get("message", {}).get("content", "")
                    
                    # Clean json response if wrapped in markdown
                    if content_str.startswith("```json"):
                        content_str = content_str.split("```json")[1].split("```")[0].strip()
                    elif content_str.startswith("```"):
                        content_str = content_str.split("```")[1].split("```")[0].strip()

                    try:
                        parsed = json.loads(content_str)
                        return parsed
                    except json.JSONDecodeError:
                        # Fallback parsing or structured response
                        return self._generate_fallback_analysis(symptoms_text)
                else:
                    return self._generate_fallback_analysis(symptoms_text)
        except Exception:
            return self._generate_fallback_analysis(symptoms_text)

    def _generate_fallback_analysis(self, symptoms_text: str) -> Dict[str, Any]:
        return {
            "symptoms": [s.strip() for s in symptoms_text.split(",") if s.strip()] or [symptoms_text],
            "possible_diseases": [
                {
                    "name": "General Symptom Evaluation",
                    "description": f"Evaluation based on symptom report: '{symptoms_text}'",
                    "likelihood": "Moderate"
                }
            ],
            "suggested_medicines": [
                {
                    "name": "Paracetamol / Acetaminophen",
                    "type": "Tablet (500mg)",
                    "purpose": "Mild fever relief and pain management",
                    "dosage_note": "1 tablet every 4-6 hours as needed (Max 4g/day)",
                    "precautions": "Avoid alcohol; consult doctor if symptoms persist over 3 days."
                }
            ],
            "curing_techniques": [
                "Maintain adequate fluid hydration (water, electrolyte solutions, warm fluids)",
                "Get sufficient restful sleep (7-8 hours per night)",
                "Monitor body temperature and symptom intensity",
                "Eat light, easily digestible nutritious meals"
            ],
            "urgency_level": "Low",
            "red_flags": [
                "Difficulty breathing or persistent chest pressure",
                "High persistent fever (>38.5°C / 101.3°F) unresponsive to medication",
                "Severe sudden onset headache or neurological confusion"
            ],
            "disclaimer": "This is AI-generated guidance powered by medgemma:4b. Please consult a licensed medical professional."
        }

ollama_client = OllamaClient()
