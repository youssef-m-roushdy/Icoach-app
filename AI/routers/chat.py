# routers/chat.py

import logging
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from services.chat_service import handle_chat_message
from services.token_service import TokenService
from config.database import AsyncSessionLocal

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat"])
_token_svc = TokenService()

class ChatRequest(BaseModel):
    content: str
    session_id: str = None

@router.post("")
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    # 1. الهوية والميزانية
    user_id = getattr(request.state, "user_id", 1)
    tier = getattr(request.state, "tier", "free")

    is_ok, used, limit = await _token_svc.check_budget(str(user_id), tier, chat_request.content)
    if not is_ok:
        raise HTTPException(status_code=429, detail=f"لقد استهلكت رصيدك اليومي ({used}/{limit}).")

    # 2. مولد الأحداث (Event Generator)
    async def event_generator():
        try:
            async with AsyncSessionLocal() as db_session:
                # استهلاك الـ Generator من الـ Service
                async for chunk in handle_chat_message(
                    db_session=db_session,
                    user_id=user_id,
                    message=chat_request.content,
                    session_id=chat_request.session_id
                ):
                    yield chunk
            
            # ملاحظة: تحديث التوكنز في الـ Streaming يحتاج تقدير بعد انتهاء الرد
            await _token_svc.update_usage(str(user_id), 200) # قيمة تقديرية أو احسبها من الـ full_reply
            
        except Exception as e:
            logger.error(f"❌ Streaming Error: {e}")
            yield json.dumps({"error": "حدث خطأ أثناء توليد الرد."})

    # 3. إرجاع الرد كـ Stream
    return StreamingResponse(event_generator(), media_type="application/x-ndjson")

# باقي الـ Endpoints (tokens/usage و sessions) تبقى كما هي بدون تغيير