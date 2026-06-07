"""
SmartEd Africa AI Tutor Service v3.0
Migrated from OpenAI gpt-4o-mini → Anthropic claude-haiku-4-5
"""

from anthropic import AsyncAnthropic
from fastapi import FastAPI, Request
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

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY environment variable is required")

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:80").split(",")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "1800"))
MAX_HISTORY_TURNS = int(os.getenv("MAX_HISTORY_TURNS", "20"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
MONTHLY_TOKEN_CAP = int(os.getenv("MONTHLY_TOKEN_CAP", "50000"))
MODEL = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")

INJECTION_PATTERNS = [
    "ignore previous", "ignore all instructions", "disregard your",
    "you are now", "act as", "pretend you are", "roleplay as",
    "jailbreak", "dan mode", "developer mode", "override your",
    "system prompt", "new instructions:", "forget everything",
]

# ── App Setup ─────────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SmartEd AI Tutor", version="3.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)

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
            expired = [k for k, v in self._sessions.items()
                       if now - v["last_access"] > SESSION_TTL_SECONDS]
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


def build_request(session_id: str, user_text: str, language: str):
    """Return (system_prompt, messages) for Anthropic API call."""
    history = sessions.get(session_id) if session_id else []
    lang_name = LANGUAGE_NAMES.get(language, "English")
    system = SYSTEM_PROMPT
    if language != "en":
        system += f"\n\nIMPORTANT: Respond in {lang_name} for this session."
    messages = list(history) + [{"role": "user", "content": user_text}]
    return system, messages


async def report_usage(session_id: str, user_id: str | None, language: str,
                       input_tokens: int, output_tokens: int):
    try:
        async with httpx.AsyncClient(timeout=5.0) as http:
            await http.post(
                f"{BACKEND_URL}/api/v1/analytics/ai-usage",
                json={
                    "sessionId": session_id,
                    "userId": user_id,
                    "language": language,
                    "promptTokens": input_tokens,
                    "completionTokens": output_tokens,
                    "model": MODEL,
                },
            )
    except Exception:
        pass  # metering is non-critical

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "smarted-ai", "version": "3.0.0",
            "model": MODEL, "timestamp": time.time()}


@app.post("/ask")
@limiter.limit("30/minute")
async def ask(request: Request, body: AskRequest):
    session_id = body.session_id or str(uuid.uuid4())
    system, messages = build_request(session_id, body.text, body.language)

    if body.stream:
        async def event_stream():
            full_response = ""
            input_tokens = 0
            output_tokens = 0
            try:
                async with client.messages.stream(
                    model=MODEL,
                    max_tokens=1024,
                    system=system,
                    messages=messages,
                ) as stream:
                    async for text in stream.text_stream:
                        full_response += text
                        yield f"data: {json.dumps({'token': text, 'session_id': session_id})}\n\n"

                    final = await stream.get_final_message()
                    input_tokens = final.usage.input_tokens
                    output_tokens = final.usage.output_tokens

                sessions.append(session_id, "user", body.text)
                sessions.append(session_id, "assistant", full_response)
                asyncio.create_task(
                    report_usage(session_id, body.user_id, body.language,
                                 input_tokens, output_tokens)
                )
                yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'tokens': input_tokens + output_tokens})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no",
                     "X-Session-Id": session_id},
        )
    else:
        message = await client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system,
            messages=messages,
        )
        answer = message.content[0].text
        input_tokens = message.usage.input_tokens
        output_tokens = message.usage.output_tokens

        sessions.append(session_id, "user", body.text)
        sessions.append(session_id, "assistant", answer)
        asyncio.create_task(
            report_usage(session_id, body.user_id, body.language, input_tokens, output_tokens)
        )
        return {"answer": answer, "session_id": session_id,
                "tokens": input_tokens + output_tokens}


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
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8001)))
