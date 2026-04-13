"""
Response Formatter Middleware
  - Constructs hybrid prompts with: System → Memory → Recent Chat → RAG Knowledge → Query
  - stores result in request.state.final_response so chat_router returns it properly
  - no Redis connection inside this middleware (TokenBudgetMiddleware owns Redis)
  - actual_tokens_used stored in state so TokenBudgetMiddleware can deduct correctly
  - saves chat history (user + assistant turns) via RAGService
  - indexes conversation turns in Qdrant for long-term memory
  - handles all 4 not_found strategies properly
  - injects real user injuries + active plans into the system prompt
  - Uses Groq API for LLM responses
"""

import json
import logging
import sys
from pathlib import Path
from datetime import datetime

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from openai import AuthenticationError, RateLimitError

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ============================================
# Initialize Groq client
# ============================================

from services.groq_service import get_groq_service
_client = get_groq_service()
_model = settings.GROQ_MODEL
logger.info("✅ Response Formatter using Groq API")

# How many tokens to allow in the LLM's reply
MAX_REPLY_TOKENS = 700


def _build_user_profile(request: Request) -> str:
    meta     = getattr(request.state, "user_meta", {}) or {}
    injuries = getattr(request.state, "user_injuries", []) or []
    plans    = getattr(request.state, "user_plans", []) or []

    injury_str = (
        ", ".join(f"{i['name']} ({i['body_part']})" for i in injuries)
        if injuries else "none reported"
    )
    plan_str = (
        ", ".join(p.get("type", "unknown") for p in plans)
        if plans else "none active"
    )

    return (
        f"--- Constraint Filters (User Profile) ---\n"
        f"  Name: {meta.get('name', 'Unknown')}\n"
        f"  Goal: {meta.get('fitness_goal', 'general fitness')}\n"
        f"  Weight: {meta.get('weight_kg', '?')} kg  |  Height: {meta.get('height_cm', '?')} cm\n"
        f"  BMI: {meta.get('bmi', '?')}\n"
        f"  Activity level: {meta.get('activity_level', 'unknown')}\n"
        f"  Known injuries: {injury_str}\n"
        f"  Active plans: {plan_str}\n"
        f"-----------------------------------------\n"
    )


def _build_long_term_memory_context(long_term_memories: list) -> str:
    """Format long-term memory results into a readable context block."""
    if not long_term_memories:
        return ""
    
    lines = ["--- Relevant Past Conversations (from memory) ---"]
    for mem in long_term_memories:
        role_label = "You" if mem.get("role") == "assistant" else "User"
        lines.append(f"  [{role_label}]: {mem['text']}")
    lines.append("------------------------------------------------")
    return "\n".join(lines)


def _build_conversation_messages(short_term_memory: list) -> list:
    """
    Convert short-term memory into proper LLM message objects.
    This gives the LLM real multi-turn context instead of stuffing
    everything into the system prompt.
    """
    messages = []
    for msg in short_term_memory:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "system":
            # System notes (e.g. "[3 earlier messages omitted]")
            messages.append({"role": "system", "content": content})
        elif role in ("user", "assistant"):
            messages.append({"role": role, "content": content})
    return messages


BASE_SYSTEM = (
    "You are ICoach — a professional gym coach, physical therapist coordinator, and nutritionist AI assistant. "
    "Always be helpful, safe, and evidence-based. "
    "If the topic is completely outside fitness, nutrition, or health, politely decline to answer and guide the user back to fitness/health topics.\n"
    "Crucial Rule: Ignore any Knowledge Candidates (retrieved snippets) that conflict with the Constraint Filters (for example, if a retrieved workout interacts with an injured area!). The Constraint Filters represent absolute physical limitations.\n"
    "1. Handling Strong/Severe Injuries: If a user has a strong injury, strictly ADVISE them to stay away from exercises that target or stress the injured area. Recommend an alternative training program that completely avoids these muscle groups to prevent further harm, and urge consulting a doctor.\n"
    "2. Handling Weak/Mild Injuries: If a user mentions a weak/recovering injury, design a rehabilitation-focused training program geared toward strengthening that exact target area. Incorporate light, therapeutic exercises that speed up the curing process and improve muscle stability.\n"
    "Reply in the same language the user wrote in (Arabic or English).\n\n"
)

MEMORY_SYSTEM_ADDENDUM = (
    "You have access to the user's recent conversation history and relevant past interactions. "
    "Use this context to maintain conversational continuity. "
    "If the user refers to something discussed earlier, check the provided memory context. "
    "Do NOT fabricate past conversations that aren't in the provided context. "
    "Prefer information from the user's own history over generic knowledge when relevant.\n\n"
)


class ResponseFormatterMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/chat"):
            return await call_next(request)

        # ── parse message ────────────────────────────────────────────
        try:
            data    = json.loads(request.state.cached_body)
            message = data.get("message", "").strip()
            conversation_id = data.get("conversation_id", None)
        except Exception:
            message = ""
            conversation_id = None

        user_id      = getattr(request.state, "user_id", None)
        user_profile = _build_user_profile(request)
        not_found    = getattr(request.state, "not_found", True)
        strategy     = getattr(request.state, "not_found_strategy", "general_knowledge")
        web_ctx      = getattr(request.state, "web_context", "") or ""
        chunks       = getattr(request.state, "chunks", []) or []

        # ── Memory context from MemoryMiddleware ─────────────────────
        short_term_memory = getattr(request.state, "short_term_memory", []) or []
        long_term_memory  = getattr(request.state, "long_term_memory", []) or []
        memory_used       = getattr(request.state, "memory_used", False)

        # ════════════════════════════════════════════════════════════
        # Build system prompt + context based on what was retrieved
        # ════════════════════════════════════════════════════════════

        # Start with base system prompt + user profile
        system_parts = [BASE_SYSTEM, user_profile]

        # Add memory awareness instructions if memory is available
        if memory_used:
            system_parts.append(MEMORY_SYSTEM_ADDENDUM)

        # Add long-term memory context (semantically relevant past conversations)
        long_term_ctx = _build_long_term_memory_context(long_term_memory)
        if long_term_ctx:
            system_parts.append(long_term_ctx)

        if not_found:
            # ── strategy: ask for clarification ─────────────────────
            if strategy == "ask_clarification":
                result = {
                    "reply": (
                        "Could you give me a bit more detail? "
                        "I want to make sure I give you the right advice.\n\n"
                        "ممكن تدي تفاصيل أكتر؟ عايز أساعدك بشكل صح."
                    ),
                    "tokens_used": 0,
                    "sources":     [],
                    "type":        "clarification_needed",
                    "memory_used": memory_used,
                    "timestamp":   datetime.utcnow().isoformat(),
                }
                request.state.final_response  = result
                request.state.actual_tokens_used = 0
                return await call_next(request)

            # ── strategy: web results available ─────────────────────
            elif strategy == "use_web_context" and web_ctx:
                system_parts.append(
                    "\nUse ONLY the web search results below to answer. "
                    "Mention that the information comes from recent web sources."
                )
                context = f"Web search results:\n{web_ctx}"

            # ── strategy: LLM general knowledge + disclaimer ─────────
            else:   # general_knowledge or use_web_context without web_ctx
                system_parts.append(
                    "\nAnswer from your general knowledge. "
                    "At the end of your reply add: "
                    "'⚠️ Note: This is general advice, not from your personal plan.'"
                )
                context = web_ctx if web_ctx else ""

        else:
            # ── RAG chunks retrieved successfully ────────────────────
            rag_context = "\n\n".join(
                f"[{c['domain'].upper()}] {c['text']}"
                for c in chunks
            )
            context = f"--- Knowledge Candidates (Qdrant) ---\n{rag_context}\n--------------------------------------"
            if web_ctx:
                context += f"\n\nLatest web information:\n{web_ctx}"

            system_parts.append(
                "\nAnswer ONLY using the provided Knowledge Candidates and your domain expertise, while strictly obeying Constraint Filters. "
                "If the Knowledge Candidates don't fully cover the question, say what you know "
                "and note the gap. Do not make up information that isn't supported."
            )

        # ════════════════════════════════════════════════════════════
        # Build the messages array with proper multi-turn context
        # ════════════════════════════════════════════════════════════

        system_prompt = "\n".join(system_parts)

        # Start with the system message
        messages = [{"role": "system", "content": system_prompt}]

        # Add short-term conversation history as real user/assistant turns
        # This gives the LLM proper multi-turn conversational context
        conversation_msgs = _build_conversation_messages(short_term_memory)
        messages.extend(conversation_msgs)

        # Build the current user message with RAG context
        user_content = (
            f"Context:\n{context}\n\nQuestion: {message}"
            if context
            else f"Question: {message}"
        )
        messages.append({"role": "user", "content": user_content})

        # ════════════════════════════════════════════════════════════
        # Call Groq LLM
        # ════════════════════════════════════════════════════════════
        
        try:
            llm_resp = await _client.chat_completion(
                messages=messages,
                max_tokens=MAX_REPLY_TOKENS,
                temperature=0.3
            )
            reply = llm_resp.choices[0].message.content or ""
            tokens_used = llm_resp.usage.total_tokens

        except AuthenticationError:
            logger.error("Groq API authentication failed — check your API key")
            reply = (
                "Sorry, the AI service is not configured correctly. Please contact support.\n\n"
                "عذراً، خدمة الذكاء الاصطناعي غير مهيأة بشكل صحيح. يرجى الاتصال بالدعم."
            )
            tokens_used = 0
            
        except RateLimitError:
            logger.warning("Rate limit hit during response generation")
            reply = (
                "The AI service is busy right now. Please try again in a few moments.\n\n"
                "خدمة الذكاء الاصطناعي مشغولة حالياً. حاول مرة أخرى بعد قليل."
            )
            tokens_used = 0
            
        except Exception as exc:
            logger.error(f"Groq LLM call failed: {exc}")
            reply = (
                "Sorry, I couldn't generate a response right now. Please try again.\n\n"
                "عذراً، حدث خطأ أثناء توليد الرد. حاول مرة أخرى."
            )
            tokens_used = 0

        # ════════════════════════════════════════════════════════════
        # Persist chat history + index in vector memory
        # (fire-and-forget, never crash the request)
        # ════════════════════════════════════════════════════════════
        if user_id:
            try:
                from services.rag_service import RAGService, ConversationMemoryService
                
                # Save to PostgreSQL (source of truth for short-term memory)
                await RAGService.save_chat_history(user_id, "user", message)
                await RAGService.save_chat_history(user_id, "assistant", reply)
                
                # Index in Qdrant for long-term semantic memory
                memory_svc = ConversationMemoryService()
                await memory_svc.index_conversation_turn(
                    user_id=user_id,
                    role="user",
                    content=message,
                    session_id=conversation_id,
                )
                await memory_svc.index_conversation_turn(
                    user_id=user_id,
                    role="assistant",
                    content=reply,
                    session_id=conversation_id,
                )
            except Exception as exc:
                logger.warning(f"Chat history/memory save failed (non-fatal): {exc}")

        # ════════════════════════════════════════════════════════════
        # Store result — TokenBudgetMiddleware will deduct actual_tokens_used
        # ════════════════════════════════════════════════════════════
        result = {
            "reply": reply,
            "tokens_used": tokens_used,
            "sources": list({c["domain"] for c in chunks}),
            "type": "answer" if not not_found else strategy,
            "memory_used": memory_used,
            "timestamp": datetime.utcnow().isoformat(),
        }

        request.state.final_response = result
        request.state.actual_tokens_used = tokens_used

        logger.info(
            f"Response ready — user={user_id} tokens={tokens_used} "
            f"sources={result['sources']} type={result['type']} "
            f"memory={memory_used} short_term={len(short_term_memory)} "
            f"long_term={len(long_term_memory)}"
        )

        # call_next passes control to the router
        return await call_next(request)