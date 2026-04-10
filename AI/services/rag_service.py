"""
RAG Service - Vector database and chat operations
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import date
import redis.asyncio as redis
from openai import AsyncOpenAI
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize clients
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
qdrant_client = AsyncQdrantClient(url=settings.QDRANT_URL)

# Database setup
DATABASE_URL = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class RAGService:
    """Service for RAG operations"""
    
    @staticmethod
    async def get_user_context(user_id: int) -> Dict[str, Any]:
        """Fetch user context from PostgreSQL - SECURE with parameterized queries"""
        async with AsyncSessionLocal() as session:
            # Get user profile - SECURE
            user_result = await session.execute(
                text("""
                    SELECT "firstName", "lastName", height, weight, 
                        "fitnessGoal", "activityLevel", gender, "dateOfBirth", bmi
                    FROM users 
                    WHERE id = :user_id AND "isActive" = true
                """),
                {"user_id": user_id}
            )
            user = user_result.fetchone()
            
            if not user:
                return {}
            
            # Get user injuries - SECURE
            injuries_result = await session.execute(
                text("""
                    SELECT i.id, i.name, i."bodyPart" as body_part, i.severity
                    FROM user_injuries ui
                    JOIN injuries i ON ui."injuryId" = i.id
                    WHERE ui."userId" = :user_id
                """),
                {"user_id": user_id}
            )
            injuries = injuries_result.fetchall()
            
            # Get saved workouts - SECURE
            saved_result = await session.execute(
                text("""
                    SELECT w.id, w.name, w.body_part, w.target_area, w.level
                    FROM saved_workouts sw
                    JOIN workouts w ON sw.workout_id = w.id
                    WHERE sw.user_id = :user_id
                    ORDER BY sw.created_at DESC
                    LIMIT 10
                """),
                {"user_id": user_id}
            )
            saved_workouts = saved_result.fetchall()
            
            # Get active fitness plans - SECURE
            plans_result = await session.execute(
                text("""
                    SELECT id, "planType", "planData", status
                    FROM fitness_plans
                    WHERE "userId" = :user_id
                    AND status = 'active'
                    AND (expires_at IS NULL OR expires_at > NOW())
                """),
                {"user_id": user_id}
            )
            fitness_plans = plans_result.fetchall()
            
            # Calculate age
            age = None
            if user.dateOfBirth:
                from datetime import date
                today = date.today()
                age = today.year - user.dateOfBirth.year - ((today.month, today.day) < (user.dateOfBirth.month, user.dateOfBirth.day))
            
            return {
                "user_id": user_id,
                "profile": {
                    "name": f"{user.firstName} {user.lastName}",
                    "height_cm": user.height,
                    "weight_kg": user.weight,
                    "bmi": user.bmi,
                    "fitness_goal": user.fitnessGoal,
                    "activity_level": user.activityLevel,
                    "gender": user.gender,
                    "age": age
                },
                "injuries": [
                    {"id": i.id, "name": i.name, "body_part": i.body_part, "severity": i.severity}
                    for i in injuries
                ],
                "saved_workouts": [
                    {"id": w.id, "name": w.name, "body_part": w.body_part, "target_area": w.target_area, "level": w.level}
                    for w in saved_workouts
                ],
                "active_plans": [
                    {"id": p.id, "type": p.plan_type, "data": p.plan_data}
                    for p in fitness_plans
                ]
            }
    
    @staticmethod
    async def save_chat_history(user_id: int, role: str, content: str) -> None:
        """Save chat history - SECURE"""
        allowed_roles = {'user', 'assistant', 'system'}
        if role not in allowed_roles:
            return
        
        content = content[:5000]  # Truncate
        
        async with AsyncSessionLocal() as session:
            await session.execute(
                            text("""
                    INSERT INTO chat_history (id, "userId", role, content, "createdAt")
                    VALUES (gen_random_uuid(), :user_id, :role, :content, NOW())
                """),
                {"user_id": user_id, "role": role, "content": content}
            )
            await session.commit()


class TokenBudgetService:
    """Service for token budget management"""
    
    def __init__(self):
        self.redis_client = None
    
    async def get_redis(self):
        if not self.redis_client:
            self.redis_client = await redis.from_url(settings.REDIS_URL)
        return self.redis_client
    
    async def get_usage(self, user_id: int, tier: str) -> Dict[str, Any]:
        """Get current token usage for user"""
        redis_client = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        used = int(await redis_client.get(key) or 0)
        limit = settings.token_limits.get(tier, 10000)
        
        return {
            "used": used,
            "limit": limit,
            "remaining": limit - used
        }
    
    async def add_usage(self, user_id: int, tokens: int) -> None:
        """Add token usage for user"""
        redis_client = await self.get_redis()
        key = f"budget:{user_id}:{date.today()}"
        await redis_client.incrby(key, tokens)
        await redis_client.expire(key, 86400)  # 24 hours