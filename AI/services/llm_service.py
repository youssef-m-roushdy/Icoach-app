"""
Groq API Service - Groq Cloud API Integration
"""
from openai import AsyncOpenAI
import logging
from typing import List, Dict, Any
logger = logging.getLogger(__name__)


class GroqService:
    def __init__(self, api_key: str, base_url: str, model: str):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url=base_url
        )
        self.model = model
        logger.info(f"✅ Groq API initialized with model: {model}")
    
    async def chat_completion(
        self, 
        messages: List[Dict[str, Any]], 
        max_tokens: int = 600, 
        temperature: float = 0.3,
        **kwargs # 👈 السر هنا: ده اللي هيسمح لنا نبعت الـ tools والـ stream بعدين
    ):
        """Chat completion using Groq API with support for Tools and Streaming"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                **kwargs
            )
            return response
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            raise
    
    @staticmethod
    def count_tokens(text: str) -> int:
        """Estimate token count using tiktoken (GPT-4o-mini tokenizer as proxy)."""
        try:
            import tiktoken
            enc = tiktoken.encoding_for_model("gpt-4o-mini")
            return len(enc.encode(text))
        except Exception:
            # Fallback: ~4 chars per token
            return len(text) // 4


_groq_service = None

def get_groq_service():
    global _groq_service
    if _groq_service is None:
        from AI.config import get_settings
        settings = get_settings()
        _groq_service = GroqService(
            api_key=settings.GROQ_API_KEY,
            base_url=settings.GROQ_BASE_URL,
            model=settings.GROQ_MODEL
        )
    return _groq_service