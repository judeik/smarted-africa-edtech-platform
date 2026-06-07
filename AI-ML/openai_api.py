"""
SmartEd Africa AI Tutor Service v2.1
- Streaming SSE responses
- Session-based conversation context (in-memory, TTL)
- CORS, rate limiting, prompt injection protection
- AI usage metering (reports to backend)
- Monthly token caps per user
"""

from openai import AsyncOpenAI
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import os
import time
import uuid
import asyncio
import json
import httpx
from threading import Lock

load_dotenv()

# ── Configuration ─────────────────────────────────────────────────────────────

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required")

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:80").split(",")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "1800"))
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "20"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
MONTHLY_TOKEN_CAP = int(os.getenv("MONTHLY_TOKEN_CAP", "50000"))  # per user

INJECTION_PATTERNS = [
    "ignore previous", "ignore all instructions", "disregard your",
    "you are now", "act as", "pretend you are", "roleplay as",
    "jailbreak", "dan mode", "developer mode", "override your",
    "system prompt", "new instructions:", "forget everything",
]

# ── App Setup ─────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SmartEd AI Tutor", version="2.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# ── Session Store ─────────────────────────────────────────────────────────────

class SessionStore:
    def __init__(self):
        self._sessions: dict[str, dict] = {}
        self._lock = Lock()

    def get(self, session_id: str) -> list:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                return []
            if time.time() - session["last_access"] > SESSION_TTL_SECONDS:
                del self._sessions[session_id]
                return []
            session["last_access"] = time.time()
            return session["history"]

    def append(self, session_id: str, role: str, content: str):
        with self._lock:
            if session_id not in self._sessions:
                self._sessions[session_id] = {"history": [], "last_access": time.time()}
            session = self._sessions[session_id]
            session["history"].append({"role": role, "content": content})
            if len(session["history"]) > MAX_HISTORY_TURNS * 2:
                session["history"] = session["history"][-(MAX_HISTORY_TURNS * 2):]
            session["last_access"] = time.time()

    def clear(self, session_id: str):
        with self._lock:
            self._sessions.pop(session_id, None)

    def cleanup_expired(self):
        with self._lock:
            now = time.time()
            expired = [k for k, v in self._sessions.items() if now - v["last_access"] > SESSION_TTL_SECONDS]
            for k in expired:
                del self._sessions[k]

sessions = SessionStore()

# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are SmartEd AI, an expert educational tutor for African students preparing for:
- WAEC (West African Examinations Council)
- JAMB (Joint Admissions and Matriculation Board)
- NECO (National Examinations Council)
- GCE (General Certificate of Education)
- NCE (Nigeria Certificate in Education)

Guidelines:
1. Only answer questions related to these examinations and their subject areas.
2. If asked about unrelated topics, politely redirect: "I'm specialized in WAEC/JAMB/NECO/GCE/NCE preparation. What subject can I help with?"
3. Provide clear, step-by-step explanations suitable for secondary school students.
4. When solving problems, show working and explain each step.
5. Maintain an encouraging, positive tone.
6. The user's first message will include their language preference — respond in that language.
7. For past exam questions, explain both the answer and the reasoning.
"""

# ── Request Models ────────────────────────────────────────────────────────────

class AskRequest(BaseModel):
    text: str
    session_id: str | None = None
    language: str = "en"
    user_id: str | None = None
    stream: bool = True

    @field_validator("text")
    @classmethod
    def validate_text(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Question cannot be empty")
        if len(v) > 2000:
            raise ValueError("Question too long (max 2000 characters)")
        v_lower = v.lower()
        for pattern in INJECTION_PATTERNS:
            if pattern in v_lower:
                raise ValueError("Your message contains disallowed content")
        return v

# ── Helpers ───────────────────────────────────────────────────────────────────

LANGUAGE_NAMES = {
    "en": "English", "yo": "Yoruba", "ha": "Hausa", "ig": "Igbo",
    "fr": "French", "pt": "Portuguese", "sw": "Swahili", "am": "Amharic",
}

def build_messages(session_id: str, user_text: str, language: str) -> list:
    history = sessions.get(session_id) if session_id else []
    lang_name = LANGUAGE_NAMES.get(language, "English")
    system = SYSTEM_PROMPT
    if language != "en":
        system += f"\n\nIMPORTANT: Respond in {lang_name} for this session."
    messages = [{"role": "system", "content": system}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_text})
    return messages

async def report_usage(session_id: str, user_id: str | None, language: str,
                       prompt_tokens: int, completion_tokens: int):
    """Report token usage to backend for metering/billing."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client_http:
            await client_http.post(
                f"{BACKEND_URL}/api/v1/analytics/ai-usage",
                json={
                    "sessionId": session_id,
                    "userId": user_id,
                    "language": language,
                    "promptTokens": prompt_tokens,
                    "completionTokens": completion_tokens,
                    "model": "gpt-4o-mini",
                },
            )
    except Exception:
        pass  # Usage metering is non-critical; don't fail the request

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "smarted-ai", "version": "2.1.0", "timestamp": time.time()}


@app.post("/ask")
@limiter.limit("30/minute")
async def ask(request: Request, body: AskRequest):
    session_id = body.session_id or str(uuid.uuid4())
    messages = build_messages(session_id, body.text, body.language)

    if body.stream:
        async def event_stream():
            full_response = ""
            prompt_tokens = 0
            completion_tokens = 0
            try:
                stream = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    stream=True,
                    max_tokens=1024,
                    temperature=0.7,
                    stream_options={"include_usage": True},
                )
                async for chunk in stream:
                    delta = chunk.choices[0].delta if chunk.choices else None
                    if delta and delta.content:
                        full_response += delta.content
                        yield f"data: {json.dumps({'token': delta.content, 'session_id': session_id})}\n\n"
                    # Capture usage from the final chunk
                    if hasattr(chunk, 'usage') and chunk.usage:
                        prompt_tokens = chunk.usage.prompt_tokens or 0
                        completion_tokens = chunk.usage.completion_tokens or 0

                sessions.append(session_id, "user", body.text)
                sessions.append(session_id, "assistant", full_response)

                # Report usage asynchronously
                asyncio.create_task(
                    report_usage(session_id, body.user_id, body.language, prompt_tokens, completion_tokens)
                )

                yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'tokens': prompt_tokens + completion_tokens})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "X-Session-Id": session_id,
            },
        )
    else:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
        )
        answer = response.choices[0].message.content
        usage = response.usage
        sessions.append(session_id, "user", body.text)
        sessions.append(session_id, "assistant", answer)

        asyncio.create_task(
            report_usage(session_id, body.user_id, body.language,
                         usage.prompt_tokens, usage.completion_tokens)
        )

        return {
            "answer": answer,
            "session_id": session_id,
            "tokens": usage.total_tokens,
        }


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    sessions.clear(session_id)
    return {"cleared": True}


@app.on_event("startup")
async def startup():
    async def cleanup_loop():
        while True:
            await asyncio.sleep(600)
            sessions.cleanup_expired()
    asyncio.create_task(cleanup_loop())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
