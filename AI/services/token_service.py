import tiktoken
import redis.asyncio as redis
from datetime import date
import logging
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
_enc = tiktoken.encoding_for_model("gpt-4o-mini")

class TokenService:
    def __init__(self):
        self._redis_pool = None

    async def get_redis(self):
        if self._redis_pool is None:
            self._redis_pool = await redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=20
            )
        return self._redis_pool

    async def check_budget(self, user_id: str, tier: str, message: str):
        r = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        limit = settings.token_limits.get(tier, 10000)
        
        used = int(await r.get(key) or 0)
        # تقدير التوكنز: النص + 800 احتياطي للـ Context والرد
        estimated = len(_enc.encode(message)) + 800 

        if used + estimated > limit:
            return False, used, limit
        return True, used, limit

    async def update_usage(self, user_id: str, actual_tokens: int):
        r = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        await r.incrby(key, actual_tokens)
        await r.expire(key, 86400) # صلاحية يوم واحد