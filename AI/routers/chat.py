import logging
import uuid
import os
from datetime import datetime, date
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel

# استدعاء الخدمة اللي عدلناها للتوكنز
from services.token_service import TokenService

logger = logging.getLogger(__name__)
router  = APIRouter(prefix="/api/chat", tags=["Chat"])

# إنشاء نسخة واحدة من الخدمة لاستخدامها في الراوتر
_token_svc = TokenService()

class ChatRequest(BaseModel):
    content: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str
    tokens_used: int = 0
    type: str = "answer"
    timestamp: datetime

@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    # ─── 1. Identity Extraction ───
    # سحب بيانات اليوزر من الـ state (لو مفيش، بنديله id افتراضي للتيست)
    user_id = getattr(request.state, "user_id", "test_user_1")
    tier    = getattr(request.state, "tier", "free")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User identity not found")

    # ─── 2. Token Budget Check (التحقق من الرصيد) ───
    # بنكلم الخدمة تتأكد من Redis قبل ما نكمل
    is_ok, used, limit = await _token_svc.check_budget(user_id, tier, chat_request.content)
    if not is_ok:
        logger.warning(f"⚠️ Token limit hit for user {user_id}: {used}/{limit}")
        raise HTTPException(
            status_code=429,
            detail=f"لقد استهلكت حدك اليومي من التوكنز ({used}/{limit}). برجاء المحاولة غداً."
        )

    # ─── 3. Session Management ───
    current_session_id = chat_request.session_id or str(uuid.uuid4())

    # ─── 4. Scope Guard (حماية المحتوى) ───
    user_message = chat_request.content.lower()
    forbidden_topics = ["politics", "سياسة", "music", "أغاني", "joke", "نكتة", "movies", "أفلام", "code", "برمجة", "اقتصاد"]
    
    if any(topic in user_message for topic in forbidden_topics):
        logger.warning(f"🚫 Out of scope message from user {user_id}")
        return ChatResponse(
            reply="أنا مساعدك الرياضي والطبي فقط. لا يمكنني مناقشة هذه المواضيع.",
            session_id=current_session_id,
            type="out_of_scope",
            timestamp=datetime.utcnow()
        )

    # ─── 5. Response Logic (Sprint 1 Placeholder) ───
    # في Sprint 2 هنا هيكون فيه مناداة للـ RAG Service والـ LLM
    reply_text = f"تم استلام رسالتك: '{chat_request.content}'. (هذا رد تجريبي لسبراينت 1)"
    
    # حساب التوكنز التقريبي (لحد ما نربط الـ AI فعلياً)
    actual_tokens = 150 
    
    # ─── 6. Commit Usage (خصم التوكنز فعلياً من Redis) ───
    await _token_svc.update_usage(user_id, actual_tokens)

    return ChatResponse(
        reply=reply_text,
        session_id=current_session_id,
        tokens_used=actual_tokens,
        type="answer",
        timestamp=datetime.utcnow()
    )

@router.get("/tokens/usage")
async def get_token_usage(request: Request):
    # سحب الهوية
    user_id = getattr(request.state, "user_id", "test_user_1")
    tier    = getattr(request.state, "tier", "free")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # جلب الاستهلاك الحقيقي من Redis
    r = await _token_svc.get_redis()
    key = f"budget:{user_id}:{date.today()}"
    
    used = int(await r.get(key) or 0)
    
    # تحديد الحد الأقصى حسب اشتراك اليوزر (بنجيبها من البيئة مباشرة)
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