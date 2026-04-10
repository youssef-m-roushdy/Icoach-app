"""
Token Budget Middleware
Fixes:
  - caches raw request body in request.state.cached_body (ALL later middlewares depend on this)
  - uses a single persistent Redis connection (connection pool, not reconnect per request)
  - actual token deduction happens HERE after call_next so we use real usage, not estimate
  - expire key is refreshed on every write
"""

import json
import logging
import sys
from datetime import date
from pathlib import Path

import tiktoken
from fastapi.responses import JSONResponse
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# One encoder instance reused for every request
_enc = tiktoken.encoding_for_model("gpt-4o-mini")

# Module-level Redis pool — created once, shared across all requests
_redis_pool: redis.Redis | None = None


async def _get_redis() -> redis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


class TokenBudgetMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # ── cache body for ALL downstream middlewares ───────────────
        # This MUST be the first middleware that touches the body.
        raw_body = await request.body()
        request.state.cached_body = raw_body

        # skip budget check for non-chat paths
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        # ── parse message ───────────────────────────────────────────
        try:
            data    = json.loads(raw_body)
            message = data.get("message", "")
        except (json.JSONDecodeError, ValueError):
            message = ""

        user_id = getattr(request.state, "user_id", None)
        tier    = getattr(request.state, "tier", "free")
        limit   = settings.token_limits.get(tier, 10_000)

        # ── check current usage ─────────────────────────────────────
        r   = await _get_redis()
        key = f"budget:{user_id}:{date.today()}"

        try:
            used = int(await r.get(key) or 0)
        except Exception as exc:
            logger.warning(f"Redis read failed, skipping budget check: {exc}")
            used = 0

        # Conservative estimate: input tokens + 800 buffer for context + output
        estimated = len(_enc.encode(message)) + 800

        if used + estimated > limit:
            remaining = max(0, limit - used)
            logger.warning(f"Token limit hit — user={user_id} used={used} limit={limit}")
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Daily token limit exceeded",
                    "code": "BUDGET_EXCEEDED",
                    "used": used,
                    "limit": limit,
                    "remaining": remaining,
                    "message": (
                        f"You've used {used:,} of your {limit:,} daily tokens. "
                        "Upgrade your plan for more."
                    ),
                },
            )

        # Store budget info for downstream middlewares
        request.state.budget_key      = key
        request.state.token_estimate  = estimated
        request.state.tokens_used_before = used

        # ── run the rest of the pipeline ────────────────────────────
        response = await call_next(request)

        # ── deduct ACTUAL tokens (set by ResponseFormatterMiddleware) ─
        actual = getattr(request.state, "actual_tokens_used", estimated)
        try:
            await r.incrby(key, actual)
            await r.expire(key, 86_400)   # reset at midnight
            logger.info(
                f"Budget — user={user_id} tier={tier} "
                f"actual={actual} total_today={used + actual}/{limit}"
            )
        except Exception as exc:
            logger.error(f"Redis write failed — tokens not deducted: {exc}")

        return response