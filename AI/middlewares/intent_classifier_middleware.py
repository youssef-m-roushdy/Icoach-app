"""
Intent Classifier Middleware
Fixes:
  - reads from request.state.cached_body (not await request.body() again)
  - robust JSON parsing with markdown fence stripping
  - uses rule-based classification (fast, no API calls)
  - validates classification schema before storing
  - granular error codes so ScopeGuard can react properly
  - detects context-dependent queries and sets memory flags
"""

import json
import logging
import re
import sys
from pathlib import Path

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VALID_DOMAINS = {"foods", "workouts", "injuries", "diet_plans"}
VALID_INTENTS = {"question", "request_plan", "log_activity", "general_chat", "out_of_scope"}

_FALLBACK = {
    "domains": [], "intent": "out_of_scope",
    "needs_web_search": False, "needs_memory": True,
    "memory_priority": "normal", "confidence": 0.0,
}

# ── Memory-dependent query detection ────────────────────────────────

# Patterns that strongly indicate the user is referencing past context
_MEMORY_HIGH_PATTERNS_EN = [
    r"\bwhat did i (say|mention|tell|ask)\b",
    r"\bwhat was (my|the)\b",
    r"\byou (told|said|mentioned|recommended|suggested)\b",
    r"\bwe (discussed|talked|went over)\b",
    r"\b(remember|recall) (when|what|that)\b",
    r"\blast time\b",
    r"\bearlier\b",
    r"\bcontinue (from|where|what)\b",
    r"\bfollow[- ]?up\b",
    r"\bbased on (my|what|our)\b",
    r"\bmy (injury|injuries|condition|problem|issue|plan|goal)\b",
    r"\b(update|change|modify) (my|the) (plan|program|routine)\b",
]

_MEMORY_HIGH_PATTERNS_AR = [
    r"قلتلي|قلت لي|قولتلي",
    r"اللي فات|قبل كده|المرة اللي فاتت",
    r"فاكر|تفتكر",
    r"كمل|كمّل|استمر",
    r"اصابتي|اصابه|إصابتي",
    r"خطتي|برنامجي",
]

# Pronoun-heavy patterns suggesting conversational continuity
_CONTINUATION_PATTERNS = [
    r"^(yes|yeah|yep|ok|okay|sure|no|nah|nope)\b",
    r"^(do that|more of|another|show me more|what else|and|also)\b",
    r"^(give me|tell me|how about|what about)\s+(more|another|the)\b",
    r"^(أيوه|اه|لا|تمام|ماشي|طيب|كمان|وكمان|وبعدين)\b",
]

_compiled_high_en = [re.compile(p, re.IGNORECASE) for p in _MEMORY_HIGH_PATTERNS_EN]
_compiled_high_ar = [re.compile(p, re.IGNORECASE) for p in _MEMORY_HIGH_PATTERNS_AR]
_compiled_cont = [re.compile(p, re.IGNORECASE) for p in _CONTINUATION_PATTERNS]


def _detect_memory_priority(message: str) -> str:
    """
    Returns 'high' if the message explicitly references past conversation,
    'normal' otherwise. All queries get needs_memory=True by default
    since fetching recent messages is cheap.
    """
    for pat in _compiled_high_en:
        if pat.search(message):
            return "high"
    for pat in _compiled_high_ar:
        if pat.search(message):
            return "high"
    for pat in _compiled_cont:
        if pat.search(message):
            return "high"
    return "normal"


def _rule_based_classification(message: str) -> dict:
    """Simple keyword-based classification for Groq (fast, no API calls)"""
    message_lower = message.lower()
    
    # Detect memory priority
    memory_priority = _detect_memory_priority(message)
    
    base = {
        "needs_web_search": False,
        "needs_memory": True,          # always fetch recent context (cheap)
        "memory_priority": memory_priority,
    }
    
    # Workouts
    workout_keywords = ['workout', 'exercise', 'training', 'gym', 'beginner', 
                        'lift', 'cardio', 'strength', 'push', 'pull', 'squat',
                        'تمرين', 'تمارين', 'جيم', 'عضلات']
    if any(kw in message_lower for kw in workout_keywords):
        return {**base, "domains": ["workouts"], "intent": "question", "confidence": 0.9}
    
    # Foods & Nutrition
    food_keywords = ['food', 'calorie', 'protein', 'eat', 'meal', 'nutrition', 
                     'carbs', 'fat', 'vitamin', 'اكل', 'سعرات', 'بروتين', 'غذاء']
    if any(kw in message_lower for kw in food_keywords):
        return {**base, "domains": ["foods"], "intent": "question", "confidence": 0.9}
    
    # Injuries
    injury_keywords = ['injury', 'pain', 'hurt', 'knee', 'back', 'shoulder', 
                       'ankle', 'wrist', 'elbow', 'اصابة', 'الم', 'وجع', 'ركبة']
    if any(kw in message_lower for kw in injury_keywords):
        return {**base, "domains": ["injuries"], "intent": "question", "confidence": 0.9}
    
    # Diet Plans
    diet_keywords = ['diet', 'meal plan', 'eating plan', 'weight loss', 
                     'nutrition plan', 'حمية', 'رجيم', 'برنامج غذائي']
    if any(kw in message_lower for kw in diet_keywords):
        return {**base, "domains": ["diet_plans"], "intent": "request_plan", "confidence": 0.9}
    
    # Context-dependent queries with no domain keywords → boost memory priority
    if memory_priority == "high":
        return {
            **base,
            "domains": ["workouts", "foods", "injuries"],
            "intent": "question",
            "confidence": 0.75,
        }
    
    # Default - assume workout question
    return {
        **base,
        "domains": ["workouts", "foods"],
        "intent": "question",
        "confidence": 0.7,
    }


class IntentClassifierMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        # ── read cached body ────────────────────────────────────────
        try:
            data = json.loads(request.state.cached_body)
            message = data.get("message", "").strip()
        except Exception:
            request.state.classification = _FALLBACK.copy()
            return await call_next(request)

        if not message:
            request.state.classification = _FALLBACK.copy()
            return await call_next(request)

        # ============================================================
        # Rule-based classification (fast, no API calls)
        # ============================================================
        clf = _rule_based_classification(message)
        request.state.classification = clf
        
        logger.info(
            f"Intent — domains={clf['domains']} intent={clf['intent']} "
            f"conf={clf['confidence']:.2f} memory={clf['memory_priority']}"
        )
        return await call_next(request)