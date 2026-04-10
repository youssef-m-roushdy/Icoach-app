"""
Authentication Middleware - Verifies RS256 JWT tokens from Node.js
Fixes:
  - tier mapping covers free / pro / premium / admin
  - user_meta is fetched from DB (real data, not hardcoded)
  - clean error messages
"""

import logging
import sys
from pathlib import Path

import jwt
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Which paths + methods require a valid JWT
PROTECTED = [
    ("/api/chat",          ["POST", "PUT", "DELETE", "PATCH"]),
    ("/api/food/predict",  ["POST"]),
    ("/api/food/predict-top", ["POST"]),
]

ROLE_TO_TIER = {
    "premium": "premium",
    "pro":     "pro",
    "user":    "free",
    "admin":   "premium",
}


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path   = request.url.path
        method = request.method

        # ── decide if auth is required ──────────────────────────────
        needs_auth = any(
            path.startswith(p) and method in methods
            for p, methods in PROTECTED
        )
        if not needs_auth:
            return await call_next(request)

        # ── extract bearer token ────────────────────────────────────
        auth_header = request.headers.get("Authorization", "")
        token = auth_header.removeprefix("Bearer ").strip()
        if not token:
            return JSONResponse(
                status_code=401,
                content={"error": "No token provided", "code": "MISSING_TOKEN"},
            )

        public_key = settings.public_key
        if not public_key:
            logger.error("JWT public key is not configured")
            return JSONResponse(
                status_code=500,
                content={"error": "Auth not configured on server", "code": "SERVER_CONFIG_ERROR"},
            )

        # ── decode & validate ───────────────────────────────────────
        try:
            payload = jwt.decode(
                token,
                public_key,
                algorithms=[settings.JWT_ALGORITHM],
                issuer=settings.JWT_ISSUER,
                audience=settings.JWT_AUDIENCE,
            )
        except jwt.ExpiredSignatureError:
            return JSONResponse(
                status_code=401,
                content={"error": "Token has expired", "code": "TOKEN_EXPIRED"},
            )
        except jwt.InvalidTokenError as exc:
            return JSONResponse(
                status_code=401,
                content={"error": f"Invalid token: {exc}", "code": "INVALID_TOKEN"},
            )

        # Prevent refresh tokens being used as access tokens
        if payload.get("type") == "refresh":
            return JSONResponse(
                status_code=401,
                content={"error": "Refresh token cannot be used here", "code": "WRONG_TOKEN_TYPE"},
            )

        # ── populate request.state ──────────────────────────────────
        user_id = payload.get("id")
        role    = payload.get("role", "user")
        tier    = ROLE_TO_TIER.get(role, "free")

        request.state.user_id = user_id
        request.state.email   = payload.get("email")
        request.state.role    = role
        request.state.tier    = tier

        # Fetch real user profile from DB (non-blocking, fails gracefully)
        try:
            from services.rag_service import RAGService
            user_context = await RAGService.get_user_context(user_id)
            request.state.user_meta    = user_context.get("profile", {})
            request.state.user_injuries = user_context.get("injuries", [])
            request.state.user_plans    = user_context.get("active_plans", [])
        except Exception as exc:
            logger.warning(f"Could not fetch user context for {user_id}: {exc}")
            # Safe fallback — rest of pipeline still works
            request.state.user_meta     = {}
            request.state.user_injuries = []
            request.state.user_plans    = []

        logger.info(
            f"Auth OK — user={user_id} role={role} tier={tier} "
            f"{method} {path}"
        )
        return await call_next(request)