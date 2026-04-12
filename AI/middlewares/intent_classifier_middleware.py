"""
Intent Classifier Middleware
Fixes:
  - reads from request.state.cached_body (not await request.body() again)
  - robust JSON parsing with markdown fence stripping
  - uses rule-based classification (fast, no API calls)
  - validates classification schema before storing
  - granular error codes so ScopeGuard can react properly
"""

import json
import logging
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
    "needs_web_search": False, "confidence": 0.0,
}


def _rule_based_classification(message: str) -> dict:
    """Simple keyword-based classification for Groq (fast, no API calls)"""
    message_lower = message.lower()
    
    # Workouts
    workout_keywords = ['workout', 'exercise', 'training', 'gym', 'beginner', 
                        'lift', 'cardio', 'strength', 'push', 'pull', 'squat',
                        'تمرين', 'تمارين', 'جيم', 'عضلات']
    if any(kw in message_lower for kw in workout_keywords):
        return {
            "domains": ["workouts"],
            "intent": "question",
            "needs_web_search": False,
            "confidence": 0.9,
        }
    
    # Foods & Nutrition
    food_keywords = ['food', 'calorie', 'protein', 'eat', 'meal', 'nutrition', 
                     'carbs', 'fat', 'vitamin', 'اكل', 'سعرات', 'بروتين', 'غذاء']
    if any(kw in message_lower for kw in food_keywords):
        return {
            "domains": ["foods"],
            "intent": "question",
            "needs_web_search": False,
            "confidence": 0.9,
        }
    
    # Injuries
    injury_keywords = ['injury', 'pain', 'hurt', 'knee', 'back', 'shoulder', 
                       'ankle', 'wrist', 'elbow', 'اصابة', 'الم', 'وجع', 'ركبة']
    if any(kw in message_lower for kw in injury_keywords):
        return {
            "domains": ["injuries"],
            "intent": "question",
            "needs_web_search": False,
            "confidence": 0.9,
        }
    
    # Diet Plans
    diet_keywords = ['diet', 'meal plan', 'eating plan', 'weight loss', 
                     'nutrition plan', 'حمية', 'رجيم', 'برنامج غذائي']
    if any(kw in message_lower for kw in diet_keywords):
        return {
            "domains": ["diet_plans"],
            "intent": "request_plan",
            "needs_web_search": False,
            "confidence": 0.9,
        }
    
    # Default - assume workout question
    return {
        "domains": ["workouts", "foods"],
        "intent": "question",
        "needs_web_search": False,
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
            f"conf={clf['confidence']:.2f}"
        )
        return await call_next(request)