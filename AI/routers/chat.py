import logging
import uuid
import os
from datetime import datetime, date
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel

# استدعاء الخدمات الأساسية
from services.token_service import TokenService
from services.llm_service import get_groq_service
from services.memory_service import MemoryService
from services.profile_service import ProfileService
from config.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])

# إنشاء نسخة واحدة من خدمة التوكنز
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
    user_id = getattr(request.state, "user_id", "test_user_1")
    tier = getattr(request.state, "tier", "free")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User identity not found")

    # ─── 2. Token Budget Check ───
    is_ok, used, limit = await _token_svc.check_budget(user_id, tier, chat_request.content)
    if not is_ok:
        logger.warning(f"⚠️ Token limit hit for user {user_id}: {used}/{limit}")
        raise HTTPException(
            status_code=429,
            detail=f"لقد استهلكت حدك اليومي من التوكنز ({used}/{limit}). برجاء المحاولة غداً."
        )

    # ─── 3. Session Management ───
    # ─── 3. Session Management (Single Continuous Chat) ───
    # هنجبر السيستم إن الشات يكون مربوط باليوزر دايماً، مفيش شات جديد
    current_session_id = f"main_chat_{user_id}"

    # ─── 4. Scope Guard ───
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

    # ─── 5. Response Logic (The Real AI with Profile & Memory) ───
    try:
        llm = get_groq_service()
        
        async with AsyncSessionLocal() as db_session:
            # أ. جلب بيانات البروفايل لتقديم رد شخصي
            user_context = await ProfileService.get_user_context(user_id, db_session)
            p = user_context.get('profile', {}) if isinstance(user_context, dict) else {}
            
            # ب. جلب تاريخ المحادثة للالتزام بالسياق
            history = await MemoryService.get_chat_history(user_id, current_session_id, db_session)
            
            # ج. صياغة الـ System Prompt الديناميكي
            system_content = f"""أنت مدرب شخصي وخبير تغذية محترف اسمك ICoach.
هذه بيانات المستخدم الذي تتحدث معه حالياً (استخدمها في إجاباتك بدقة ولا تسأله عنها):
- الوزن: {p.get('weight', 'غير مسجل')} كجم
- الطول: {p.get('height', 'غير مسجل')} سم
- الهدف الرياضي: {p.get('fitnessGoal', 'تحسين الصحة العامة')}
- مستوى النشاط: {p.get('activityLevel', 'متوسط')}
- ملاحظات طبية: {p.get('medicalNotes', 'لا يوجد')}

أجب باختصار، وبأسلوب عملي ومباشر باللغة العربية."""

            messages = [{"role": "system", "content": system_content}]
            
            # إضافة الذاكرة (التاريخ)
            for msg in history:
                messages.append({"role": msg.role, "content": msg.content})
            
            # إضافة رسالة المستخدم الجديدة
            messages.append({"role": "user", "content": chat_request.content})

            # د. حفظ رسالة المستخدم في قاعدة البيانات
            await MemoryService.save_message(user_id, current_session_id, "user", chat_request.content, db_session)

            # هـ. طلب الرد من Groq
            response = await llm.chat_completion(messages=messages, max_tokens=500)
            bot_reply = response.choices[0].message.content
            
            # و. حفظ رد البوت في الذاكرة
            await MemoryService.save_message(user_id, current_session_id, "assistant", bot_reply, db_session)
            
            # حساب التوكنز الفعلية
            actual_tokens = response.usage.total_tokens if hasattr(response, 'usage') else 200

    except Exception as e:
        logger.error(f"❌ AI Logic Error: {e}")
        raise HTTPException(status_code=500, detail="حدث خطأ أثناء معالجة رد الذكاء الاصطناعي")

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
    user_id = getattr(request.state, "user_id", "test_user_1")
    tier = getattr(request.state, "tier", "free")
    
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