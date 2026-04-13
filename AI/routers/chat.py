"""
Chat Router — RAG-powered chat endpoint
Fixes:
  - reads request.state.final_response (set by ResponseFormatterMiddleware)
  - /tokens/usage still guarded by auth (user_id must exist)
  - proper HTTP status codes on errors
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, status

from models.rag_models import ChatRequest, ChatResponse, TokenUsageResponse
from services.rag_service import TokenBudgetService

logger = logging.getLogger(__name__)
router  = APIRouter(prefix="/api/chat", tags=["Chat"])
_token_svc = TokenBudgetService()


@router.post("", response_model=ChatResponse)
async def chat_endpoint(request: Request, chat_request: ChatRequest):
    """
    RAG chat endpoint.
    All heavy lifting is done by the middleware pipeline.
    This handler just returns whatever the pipeline produced.
    """
    final = getattr(request.state, "final_response", None)

    if final is None:
        # Should never happen if all middlewares are registered correctly
        logger.error("final_response not set — middleware pipeline may be broken")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat processing failed — please try again",
        )

    return ChatResponse(
        reply       = final["reply"],
        tokens_used = final["tokens_used"],
        sources     = final.get("sources", []),
        type        = final.get("type", "answer"),
        memory_used = final.get("memory_used", False),
        timestamp   = datetime.fromisoformat(final["timestamp"])
                      if isinstance(final.get("timestamp"), str)
                      else datetime.utcnow(),
    )


@router.get("/tokens/usage", response_model=TokenUsageResponse)
async def get_token_usage(request: Request):
    """
    Return today's token usage for the authenticated user.
    Auth middleware must have already validated the JWT.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    tier  = getattr(request.state, "tier", "free")
    usage = await _token_svc.get_usage(user_id, tier)

    return TokenUsageResponse(
        user_id          = user_id,
        tier             = tier,
        tokens_used_today= usage["used"],
        daily_limit      = usage["limit"],
        remaining        = usage["remaining"],
        reset_time       = "midnight UTC",
    )