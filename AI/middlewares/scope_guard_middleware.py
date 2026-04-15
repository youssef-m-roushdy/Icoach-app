import json
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# كلمات مفتاحية صريحة تدل على أن السؤال خارج النطاق تماماً
OBVIOUS_GARBAGE_PATTERNS = [
    "اكتبلي قصيدة", "اكتب قصيدة", "write a poem",
    "احسبلي", "calculate the math", "solve the equation",
    "برمج", "اكتب كود", "write code", "html", "css", "python script",
    "سياسة", "رئيس", "politics", "president"
]

class ScopeGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # تطبيق الفلتر على مسار الشات فقط
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        try:
            # قراءة الرسالة من الـ cached_body (الذي وضعه TokenBudgetMiddleware)
            raw_body = getattr(request.state, "cached_body", b"{}")
            data = json.loads(raw_body)
            message = data.get("message", "").lower().strip()
        except Exception:
            message = ""

        # فلترة الأسئلة العبثية الصريحة
        if message:
            for pattern in OBVIOUS_GARBAGE_PATTERNS:
                if pattern in message:
                    logger.warning(f"ScopeGuard rejected obvious off-topic request: {message[:50]}")
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": "Out of scope",
                            "message": "عذراً، أنا متخصص في اللياقة البدنية والتغذية فقط. إزاي أقدر أساعدك في تمرينك أو أكلك؟"
                        }
                    )

        # إذا لم يكن السؤال من ضمن القائمة السوداء، دعه يمر للذكاء الاصطناعي
        return await call_next(request)