import logging
import uuid
import os
from datetime import datetime, date
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text

# Import core services
from services.token_service import TokenService
from services.llm_service import get_groq_service
from services.memory_service import MemoryService
from services.profile_service import ProfileService
from config.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# Create a single instance of TokenService
_token_svc = TokenService()

class ChatRequest(BaseModel):
    content: str
    # ✅ session_id removed - backend will generate it automatically

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    tokens_used: int = 0
    type: str = "answer"
    timestamp: datetime

def ensure_int_id(value) -> int:
    """Safely convert any value to integer"""
    if value is None:
        return 1
    try:
        return int(value)
    except (TypeError, ValueError):
        logger.warning(f"Cannot convert {value} to int, using default 1")
        return 1

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    # ─── 1. Identity Extraction ───
    raw_user_id = getattr(request.state, "user_id", 1)
    tier = getattr(request.state, "tier", "free")
    
    # Convert user_id to integer
    user_id = ensure_int_id(raw_user_id)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User identity not found")

    # ─── 2. Token Budget Check ───
    is_ok, used, limit = await _token_svc.check_budget(str(user_id), tier, chat_request.content)
    if not is_ok:
        logger.warning(f"⚠️ Token limit hit for user {user_id}: {used}/{limit}")
        raise HTTPException(
            status_code=429,
            detail=f"You have reached your daily token limit ({used}/{limit}). Please try again tomorrow."
        )

    # ─── 3. Session Management - Always Generate New UUID ───
    # Each chat request gets a new session UUID automatically
    current_session_id = str(uuid.uuid4())
    logger.info(f"🆕 New session created: {current_session_id}")

    # ─── 4. Scope Guard ───
    user_message = chat_request.content.lower()
    forbidden_topics = ["politics", "سياسة", "music", "أغاني", "joke", "نكتة", "movies", "أفلام", "code", "برمجة", "اقتصاد"]
    
    if any(topic in user_message for topic in forbidden_topics):
        logger.warning(f"🚫 Out of scope message from user {user_id}")
        return ChatResponse(
            reply="I am your sports and medical assistant only. I cannot discuss these topics.",
            session_id=current_session_id,
            type="out_of_scope",
            timestamp=datetime.utcnow()
        )

    # ─── 5. Response Logic (The Real AI with Profile & Memory) ───
    try:
        llm = get_groq_service()
        
        async with AsyncSessionLocal() as db_session:
            # A. Fetch profile data to provide personalized response
            user_context = await ProfileService.get_user_context(user_id, db_session)
            p = user_context.get('profile', {}) if isinstance(user_context, dict) else {}
            
            # B. Fetch chat history for context adherence
            history = await MemoryService.get_chat_history(user_id, current_session_id, db_session)
            
            # C. Build dynamic System Prompt
            system_content = f"""You are a professional personal trainer and nutrition expert named ICoach.
Here is the current user's data you are speaking with (use it accurately in your responses and do not ask about it):
- Weight: {p.get('weight', 'Not recorded')} kg
- Height: {p.get('height', 'Not recorded')} cm
- Fitness Goal: {p.get('fitnessGoal', 'General health improvement')}
- Activity Level: {p.get('activityLevel', 'Moderate')}
- Medical Notes: {p.get('medicalNotes', 'None')}

Answer concisely, in a practical and direct style in Arabic."""

            messages = [{"role": "system", "content": system_content}]
            
            # Add memory (history)
            for msg in history:
                messages.append({"role": msg["role"], "content": msg["content"]})
            
            # Add new user message
            messages.append({"role": "user", "content": chat_request.content})

            # D. Save user message to database
            await MemoryService.save_message(user_id, current_session_id, "user", chat_request.content, db_session)

            # E. Request response from Groq
            response = await llm.chat_completion(messages=messages, max_tokens=500)
            bot_reply = response.choices[0].message.content
            
            # F. Save bot response to memory
            await MemoryService.save_message(user_id, current_session_id, "assistant", bot_reply, db_session)
            
            # Calculate actual tokens used
            actual_tokens = response.usage.total_tokens if hasattr(response, 'usage') else 200

    except Exception as e:
        logger.error(f"❌ AI Logic Error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the AI response")

    # ─── 6. Commit Usage ───
    await _token_svc.update_usage(str(user_id), actual_tokens)

    return ChatResponse(
        reply=bot_reply,
        session_id=current_session_id,
        tokens_used=actual_tokens,
        type="answer",
        timestamp=datetime.utcnow()
    )

@router.get("/tokens/usage")
async def get_token_usage(request: Request):
    """Get current token usage for authenticated user"""
    raw_user_id = getattr(request.state, "user_id", 1)
    tier = getattr(request.state, "tier", "free")
    
    # Convert user_id to integer
    user_id = ensure_int_id(raw_user_id)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    r = await _token_svc.get_redis()
    key = f"budget:{user_id}:{date.today()}"
    
    used = int(await r.get(key) or 0)
    
    limits = {
        "free": int(os.getenv("TOKEN_LIMIT_FREE", 10000)),
        "pro": int(os.getenv("TOKEN_LIMIT_PRO", 100000)),
        "premium": int(os.getenv("TOKEN_LIMIT_PREMIUM", 500000))
    }
    limit = limits.get(tier.lower(), 10000)

    return {
        "user_id": user_id,
        "tier": tier,
        "tokens_used_today": used,
        "daily_limit": limit,
        "remaining": max(0, limit - used),
        "reset_time": "midnight UTC"
    }

@router.get("/sessions")
async def list_sessions(request: Request):
    """Get all chat sessions for the user"""
    raw_user_id = getattr(request.state, "user_id", 1)
    user_id = ensure_int_id(raw_user_id)
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    async with AsyncSessionLocal() as db_session:
        result = await db_session.execute(
            text("""
                SELECT DISTINCT session_id, 
                       MIN(created_at) as started_at,
                       MAX(created_at) as last_active,
                       COUNT(*) as message_count
                FROM chat_history 
                WHERE user_id = :user_id
                GROUP BY session_id
                ORDER BY last_active DESC
            """),
            {"user_id": user_id}
        )
        sessions = result.fetchall()
        
        return {
            "user_id": user_id,
            "sessions": [
                {
                    "session_id": s.session_id,
                    "started_at": s.started_at,
                    "last_active": s.last_active,
                    "message_count": s.message_count
                }
                for s in sessions
            ]
        }