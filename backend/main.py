import json
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from config import settings
from database import engine, get_db, Base
import models
from auth import hash_password, verify_password
from hf_client import hf_client
from elevenlabs_service import elevenlabs_service

# Initialize SQLite database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedicAI Backend API",
    description="Medical Assistant API with SQLite DB, BioMistral 7B, and ElevenLabs AI Voice",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    age: Optional[str] = "Not specified"
    gender: Optional[str] = "Not specified"
    allergies: Optional[str] = "None"
    conditions: Optional[str] = "None"

class LoginRequest(BaseModel):
    email: str
    password: str

class PatientContext(BaseModel):
    age: Optional[str] = "Not specified"
    gender: Optional[str] = "Not specified"
    allergies: Optional[str] = "None"
    conditions: Optional[str] = "None"

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    patient_info: Optional[PatientContext] = None

class AnalysisRequest(BaseModel):
    symptoms: str
    conversation_history: Optional[List[ChatMessage]] = []

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None

class SaveChatRequest(BaseModel):
    id: str
    title: str
    messages: List[ChatMessage]

@app.get("/")
async def root():
    return {
        "app": "MedicAI Assistant API",
        "database": "SQLite (medicai.db)",
        "provider": "Hugging Face",
        "model": settings.HF_MODEL,
        "elevenlabs_stt": settings.ELEVENLABS_STT_MODEL,
        "elevenlabs_tts": settings.ELEVENLABS_TTS_MODEL,
        "status": "online"
    }

@app.get("/api/health")
async def health_check():
    health = await hf_client.check_health()
    health["database"] = "sqlite_connected"
    health["elevenlabs_stt_model"] = settings.ELEVENLABS_STT_MODEL
    health["elevenlabs_tts_model"] = settings.ELEVENLABS_TTS_MODEL
    return health

# User Auth Endpoints (SQLite DB)
@app.post("/api/auth/register")
async def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register new user in SQLite database."""
    existing = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = hash_password(req.password)
    user = models.User(
        email=req.email.strip().lower(),
        password_hash=hashed_pw,
        full_name=req.full_name.strip(),
        age=req.age or "Not specified",
        gender=req.gender or "Not specified",
        allergies=req.allergies or "None",
        conditions=req.conditions or "None"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "message": "User registered successfully",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "age": user.age,
            "gender": user.gender,
            "allergies": user.allergies,
            "conditions": user.conditions
        }
    }

@app.post("/api/auth/login")
async def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    """Verify user credentials against SQLite database."""
    user = db.query(models.User).filter(models.User.email == req.email.strip().lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "age": user.age,
            "gender": user.gender,
            "allergies": user.allergies,
            "conditions": user.conditions
        }
    }

# Persistent Chat Storage (SQLite DB)
@app.get("/api/user/chats/{user_id}")
async def get_user_chats(user_id: int, db: Session = Depends(get_db)):
    """Fetch user's saved chats from SQLite DB."""
    chats = db.query(models.ChatSession).filter(models.ChatSession.user_id == user_id).order_by(models.ChatSession.updated_at.desc()).all()
    result = []
    for c in chats:
        try:
            msgs = json.loads(c.messages_json)
        except Exception:
            msgs = []
        result.append({
            "id": c.id,
            "title": c.title,
            "date": c.updated_at.strftime("%d/%m/%Y"),
            "messages": msgs
        })
    return {"success": True, "chats": result}

@app.post("/api/user/chats/{user_id}")
async def save_user_chat(user_id: int, req: SaveChatRequest, db: Session = Depends(get_db)):
    """Save or update chat session in SQLite DB."""
    msgs_dict = [{"role": m.role, "content": m.content} for m in req.messages]
    json_str = json.dumps(msgs_dict)

    existing = db.query(models.ChatSession).filter(models.ChatSession.id == req.id, models.ChatSession.user_id == user_id).first()
    if existing:
        existing.title = req.title
        existing.messages_json = json_str
    else:
        chat = models.ChatSession(
            id=req.id,
            user_id=user_id,
            title=req.title,
            messages_json=json_str
        )
        db.add(chat)

    db.commit()
    return {"success": True}

@app.delete("/api/user/chats/{user_id}/{chat_id}")
async def delete_user_chat(user_id: int, chat_id: str, db: Session = Depends(get_db)):
    """Delete chat session from SQLite DB."""
    existing = db.query(models.ChatSession).filter(models.ChatSession.id == chat_id, models.ChatSession.user_id == user_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"success": True}

# Streaming Chat API
@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Stream chat response token by token via Server-Sent Events (SSE)."""
    messages_dict = [{"role": msg.role, "content": msg.content} for msg in req.messages]
    patient_dict = req.patient_info.dict() if req.patient_info else {}

    async def event_generator():
        try:
            async for chunk in hf_client.chat_stream(messages_dict, patient_dict):
                data_payload = json.dumps({"content": chunk})
                yield f"data: {data_payload}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            err_payload = json.dumps({"error": str(e)})
            yield f"data: {err_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# In-memory symptom analysis cache to minimize LLM calls
ANALYSIS_CACHE: Dict[str, Any] = {}

@app.post("/api/analyze")
async def analyze_symptoms(req: AnalysisRequest):
    """Analyze symptoms and output structured JSON diagnosis with caching."""
    cache_key = req.symptoms.strip().lower()
    if cache_key in ANALYSIS_CACHE:
        return {
            "success": True,
            "data": ANALYSIS_CACHE[cache_key],
            "cached": True
        }

    history_dict = [{"role": msg.role, "content": msg.content} for msg in (req.conversation_history or [])]
    analysis = await hf_client.analyze_symptoms(req.symptoms, history_dict)

    if len(ANALYSIS_CACHE) > 100:
        ANALYSIS_CACHE.pop(next(iter(ANALYSIS_CACHE)))
    ANALYSIS_CACHE[cache_key] = analysis

    return {
        "success": True,
        "data": analysis,
        "cached": False
    }

# ElevenLabs Speech-to-Text (Scribe v2)
@app.post("/api/voice/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Convert uploaded customer audio to text using ElevenLabs Scribe v2."""
    try:
        audio_bytes = await file.read()
        res = await elevenlabs_service.speech_to_text(
            audio_bytes, 
            filename=file.filename or "audio.webm", 
            content_type=file.content_type or "audio/webm"
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Voice API Status
@app.get("/api/voice/status")
async def get_voice_status():
    """Return voice service status and provider availability."""
    return {
        "configured": bool(elevenlabs_service.api_key),
        "tts_ready": elevenlabs_service.is_tts_ready(),
        "stt_ready": elevenlabs_service.is_stt_ready(),
        "provider": "elevenlabs" if elevenlabs_service.is_tts_ready() else "browser",
        "voice_label": "BioMistral Medical Consultant"
    }

# ElevenLabs Text-to-Speech (Multilingual v2)
@app.post("/api/voice/tts")
async def text_to_speech(req: TTSRequest):
    """Convert bot text response to audio using ElevenLabs Multilingual v2."""
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    audio_bytes = await elevenlabs_service.text_to_speech(req.text, req.voice_id)
    if not audio_bytes:
        raise HTTPException(status_code=503, detail="ElevenLabs TTS unavailable or lacks permission")

    return Response(content=audio_bytes, media_type="audio/mpeg")

@app.get("/api/quick-symptoms")
async def get_quick_symptoms():
    return {
        "categories": [
            {
                "title": "Cold & Flu",
                "icon": "Thermometer",
                "prompt": "I have a sore throat, nasal congestion, runny nose, and a mild headache for 2 days."
            },
            {
                "title": "Digestive Issues",
                "icon": "Activity",
                "prompt": "I have stomach cramps, bloating, and mild nausea after eating dinner last night."
            },
            {
                "title": "Headache & Fatigue",
                "icon": "Brain",
                "prompt": "I'm experiencing a throbbing headache behind my eyes with fatigue and neck stiffness."
            },
            {
                "title": "Skin & Rash",
                "icon": "ShieldAlert",
                "prompt": "I noticed red itchy bumps on my arms after spending time outdoors yesterday."
            },
            {
                "title": "Seasonal Allergies",
                "icon": "Wind",
                "prompt": "I've been sneezing constantly with itchy eyes and clear watery nasal discharge."
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
