import tiktoken
import logging
import os
from datetime import date
import redis.asyncio as redis

logger = logging.getLogger(__name__)

class TokenService:
    def __init__(self):
        # تهيئة مسار Redis من الإعدادات
        self.redis_url = os.getenv("REDIS_URL", "redis://127.0.0.1:6380")
        self._redis = None

    async def get_redis(self):
        """الاتصال بـ Redis وإرجاع الـ Connection"""
        if self._redis is None:
            self._redis = redis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    @staticmethod
    def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
        """Counts the number of tokens in a string."""
        try:
            encoding = tiktoken.get_encoding("cl100k_base") 
            return len(encoding.encode(text))
        except Exception as e:
            logger.error(f"Error counting tokens: {e}")
            return len(text) // 4  # Fallback estimation

    async def check_budget(self, user_id: str, tier: str, content: str):
        """التحقق من رصيد المستخدم قبل السماح بالشات"""
        r = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        
        # جلب الاستهلاك الحالي من Redis
        used = int(await r.get(key) or 0)
        
        # تحديد الحد الأقصى حسب اشتراك اليوزر
        limits = {
            "free": int(os.getenv("TOKEN_LIMIT_FREE", 10000)),
            "pro": int(os.getenv("TOKEN_LIMIT_PRO", 100000)),
            "premium": int(os.getenv("TOKEN_LIMIT_PREMIUM", 500000))
        }
        limit = limits.get(tier.lower(), 10000)
        
        # حساب التوكنز المتوقعة للرسالة الجديدة
        estimated_new_tokens = self.count_tokens(content)
        
        # هل هيتخطى الحد؟
        if used + estimated_new_tokens > limit:
            return False, used, limit
            
        return True, used, limit

    async def update_usage(self, user_id: str, tokens_used: int):
        """خصم التوكنز المستهلكة فعلياً من رصيد اليوم"""
        r = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        
        # إضافة الاستهلاك الجديد
        await r.incrby(key, tokens_used)
        
        # لو المفتاح ده جديد، خليه يمسح نفسه آخر اليوم (بعد 24 ساعة)
        ttl = await r.ttl(key)
        if ttl == -1:
            await r.expire(key, 86400)