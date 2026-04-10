"""
Intent Classifier Middleware
Fixes:
  - reads from request.state.cached_body (not await request.body() again)
  - robust JSON parsing with markdown fence stripping
  - correct model name (gpt-4o-mini, not gpt-5-nano)
  - validates classification schema before storing
  - granular error codes so ScopeGuard can react properly
"""

import json
import logging
import sys
from pathlib import Path

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from openai import AsyncOpenAI, AuthenticationError, RateLimitError

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

VALID_DOMAINS = {"foods", "workouts", "injuries", "diet_plans"}
VALID_INTENTS = {"question", "request_plan", "log_activity", "general_chat", "out_of_scope"}

CLASSIFIER_PROMPT = """You are a classifier for a gym/fitness assistant app.

Analyze the user message and return ONLY a valid JSON object — no markdown, no explanation.

Schema:
{
  "domains": [ <subset of: "foods", "workouts", "injuries", "diet_plans"> ],
  "intent": "<one of: question | request_plan | log_activity | general_chat | out_of_scope>",
  "needs_web_search": <true | false>,
  "confidence": <float 0.0 – 1.0>
}

Rules:
- If the message is completely unrelated to fitness, nutrition, injuries, or wellness → intent = "out_of_scope", domains = []
- If the message needs live/recent data (latest research, product prices, news) → needs_web_search = true
- Short vague messages (under 3 words) → confidence < 0.5
- Multiple topics are allowed in domains (e.g. injury + workout question)

Examples:
"كالوريز الدجاج" → {"domains":["foods"],"intent":"question","needs_web_search":false,"confidence":0.97}
"اكتب كود بايثون"  → {"domains":[],"intent":"out_of_scope","needs_web_search":false,"confidence":0.99}
"latest creatine research 2024" → {"domains":["foods"],"intent":"question","needs_web_search":true,"confidence":0.93}
"ساعدني"           → {"domains":[],"intent":"general_chat","needs_web_search":false,"confidence":0.4}
"knee injury chest workout" → {"domains":["injuries","workouts"],"intent":"question","needs_web_search":false,"confidence":0.95}
"""


def _parse_classification(raw: str) -> dict:
    """Strip markdown fences and parse JSON safely."""
    text = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


def _validate(clf: dict) -> dict:
    """Ensure all required keys exist and have valid values."""
    domains = [d for d in clf.get("domains", []) if d in VALID_DOMAINS]
    intent  = clf.get("intent", "out_of_scope")
    if intent not in VALID_INTENTS:
        intent = "out_of_scope"
    return {
        "domains":          domains,
        "intent":           intent,
        "needs_web_search": bool(clf.get("needs_web_search", False)),
        "confidence":       float(clf.get("confidence", 0.5)),
    }


_FALLBACK = {
    "domains": [], "intent": "out_of_scope",
    "needs_web_search": False, "confidence": 0.0,
}


class IntentClassifierMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        # ── guard: OpenAI key must be present ──────────────────────
        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your-key-here":
            request.state.classification = {**_FALLBACK, "intent": "openai_auth_error"}
            return await call_next(request)

        # ── read cached body ────────────────────────────────────────
        try:
            data    = json.loads(request.state.cached_body)
            message = data.get("message", "").strip()
        except Exception:
            request.state.classification = _FALLBACK.copy()
            return await call_next(request)

        if not message:
            request.state.classification = _FALLBACK.copy()
            return await call_next(request)

        # ── call LLM classifier ─────────────────────────────────────
        try:
            resp = await _client.chat.completions.create(
                model="gpt-4o-mini",          # cheap, fast, accurate for classification
                messages=[
                    {"role": "system", "content": CLASSIFIER_PROMPT},
                    {"role": "user",   "content": message},
                ],
                max_tokens=120,
                temperature=0,                # deterministic output
            )
            raw_content = resp.choices[0].message.content or ""
            parsed      = _parse_classification(raw_content)
            clf         = _validate(parsed)

        except AuthenticationError:
            logger.error("OpenAI authentication failed — check OPENAI_API_KEY")
            clf = {**_FALLBACK, "intent": "openai_auth_error"}

        except RateLimitError:
            logger.warning("OpenAI rate limit hit in classifier — using fallback")
            # Don't block the user; treat as general question so RAG can still try
            clf = {
                "domains": ["workouts", "foods"],
                "intent": "question",
                "needs_web_search": False,
                "confidence": 0.5,
            }

        except (json.JSONDecodeError, KeyError, ValueError) as exc:
            logger.warning(f"Classifier JSON parse error: {exc} — raw: {raw_content!r}")
            clf = _FALLBACK.copy()

        except Exception as exc:
            logger.error(f"Classifier unexpected error: {exc}")
            clf = _FALLBACK.copy()

        logger.info(
            f"Intent — domains={clf['domains']} intent={clf['intent']} "
            f"web={clf['needs_web_search']} conf={clf['confidence']:.2f}"
        )
        request.state.classification = clf
        return await call_next(request)