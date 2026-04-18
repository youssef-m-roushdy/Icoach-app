import json
import logging
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Explicit keywords indicating the question is completely out of scope
OBVIOUS_GARBAGE_PATTERNS = [
    "اكتبلي قصيدة", "اكتب قصيدة", "write a poem",
    "احسبلي", "calculate the math", "solve the equation",
    "برمج", "اكتب كود", "write code", "html", "css", "python script",
    "سياسة", "رئيس", "politics", "president"
]

class ScopeGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Apply filter only to chat endpoint
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        try:
            # Read message from cached_body (set by TokenBudgetMiddleware)
            raw_body = getattr(request.state, "cached_body", b"{}")
            data = json.loads(raw_body)
            message = data.get("message", "").lower().strip()
        except Exception:
            message = ""

        # Filter obvious off-topic questions
        if message:
            for pattern in OBVIOUS_GARBAGE_PATTERNS:
                if pattern in message:
                    logger.warning(f"ScopeGuard rejected obvious off-topic request: {message[:50]}")
                    return JSONResponse(
                        status_code=400,
                        content={
                            "error": "Out of scope",
                            "message": "Sorry, I specialize only in fitness and nutrition. How can I help with your workout or diet?"
                        }
                    )

        # If not in blacklist, let it pass through to AI
        return await call_next(request)