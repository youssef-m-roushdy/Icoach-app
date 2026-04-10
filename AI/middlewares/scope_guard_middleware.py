"""
Scope Guard Middleware
Fixes:
  - import json was missing (caused NameError on web_search calls)
  - reads from request.state.cached_body
  - web_search errors are caught and logged (don't crash the request)
  - bilingual graceful messages (EN + AR)
  - handles all intent codes from IntentClassifier
"""

import json
import logging
import sys
from pathlib import Path

import httpx
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ScopeGuardMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        clf    = getattr(request.state, "classification", {})
        intent = clf.get("intent", "out_of_scope")
        conf   = clf.get("confidence", 0.0)

        # ── OpenAI key misconfigured ────────────────────────────────
        if intent == "openai_auth_error":
            return JSONResponse(
                status_code=503,
                content={
                    "reply": (
                        "The AI service is temporarily unavailable. "
                        "Please contact support.\n\n"
                        "الخدمة غير متاحة حالياً، يرجى التواصل مع الدعم."
                    ),
                    "type": "error",
                    "code": "OPENAI_AUTH_ERROR",
                },
            )

        # ── completely off-topic ────────────────────────────────────
        if intent == "out_of_scope":
            return JSONResponse(
                content={
                    "reply": (
                        "I'm your fitness & nutrition assistant — I can help with:\n"
                        "• Workouts & training programs\n"
                        "• Nutrition & calorie tracking\n"
                        "• Diet plans & macros\n"
                        "• Injury management & safe exercises\n\n"
                        "أنا مساعدك للياقة والتغذية. اسألني عن التمارين، الأكل، الحميات، أو الإصابات."
                    ),
                    "type": "out_of_scope",
                },
            )

        # ── vague / low-confidence message ──────────────────────────
        if conf < 0.5:
            return JSONResponse(
                content={
                    "reply": (
                        "Could you be more specific? Are you asking about:\n"
                        "• A workout or exercise?\n"
                        "• Food, calories, or nutrition?\n"
                        "• A diet or meal plan?\n"
                        "• An injury or physical limitation?\n\n"
                        "ممكن توضح أكتر؟ سؤالك عن تمارين، أكل، حمية، ولا إصابة؟"
                    ),
                    "type": "clarification_needed",
                },
            )

        # ── web search enrichment (non-blocking) ────────────────────
        if clf.get("needs_web_search"):
            if settings.SERPER_API_KEY:
                try:
                    request.state.web_context = await self._web_search(request)
                    logger.info("Web search enrichment added to request context")
                except Exception as exc:
                    logger.warning(f"Web search failed (continuing without it): {exc}")
                    request.state.web_context = ""
            else:
                logger.info("needs_web_search=True but SERPER_API_KEY not set — skipping")
                request.state.web_context = ""

        return await call_next(request)

    # ── helpers ─────────────────────────────────────────────────────

    async def _web_search(self, request: Request) -> str:
        data    = json.loads(request.state.cached_body)
        query   = data.get("message", "").strip()
        domains = request.state.classification.get("domains", [])

        # Append domain hint so search results are fitness-relevant
        domain_hint = " ".join(domains) if domains else "fitness nutrition"
        search_q    = f"{query} {domain_hint}"

        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": settings.SERPER_API_KEY},
                json={"q": search_q, "num": 4},
            )
            resp.raise_for_status()

        organic = resp.json().get("organic", [])
        snippets = [
            f"- {r['title']}: {r['snippet']}"
            for r in organic[:3]
            if r.get("snippet")
        ]
        return "\n".join(snippets)