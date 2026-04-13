"""
RAG Service - Vector database and chat operations
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import date
import redis.asyncio as redis
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Qdrant client only (OpenAI client removed)
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
                    AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
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


class RedisCacheService:
    """Service for caching semantic embeddings and RAG responses in Redis"""
    
    def __init__(self):
        self.redis_client = None
    
    async def get_redis(self):
        if not self.redis_client:
            self.redis_client = await redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self.redis_client

    async def get_cached_embedding(self, query_text: str) -> Optional[List[float]]:
        import hashlib
        query_hash = hashlib.sha256(query_text.encode('utf-8')).hexdigest()
        key = f"cache:embed:{query_hash}"
        redis_client = await self.get_redis()
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_cached_embedding(self, query_text: str, embedding: List[float], ttl_seconds: int = 604800):
        # Default TTL 7 days
        import hashlib
        query_hash = hashlib.sha256(query_text.encode('utf-8')).hexdigest()
        key = f"cache:embed:{query_hash}"
        redis_client = await self.get_redis()
        await redis_client.setex(key, ttl_seconds, json.dumps(embedding))

    async def get_cached_response(self, query_text: str, user_context: str) -> Optional[Dict[str, Any]]:
        import hashlib
        combined = f"{query_text}||{user_context}"
        cache_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
        key = f"cache:rag_resp:{cache_hash}"
        redis_client = await self.get_redis()
        data = await redis_client.get(key)
        if data:
            return json.loads(data)
        return None

    async def set_cached_response(self, query_text: str, user_context: str, response_data: Dict[str, Any], ttl_seconds: int = 86400):
        # Default TTL 24 hours
        import hashlib
        combined = f"{query_text}||{user_context}"
        cache_hash = hashlib.sha256(combined.encode('utf-8')).hexdigest()
        key = f"cache:rag_resp:{cache_hash}"
        redis_client = await self.get_redis()
        await redis_client.setex(key, ttl_seconds, json.dumps(response_data))


class ConversationMemoryService:
    """
    Hybrid memory service combining:
      - Short-term memory: last N messages from PostgreSQL (conversational continuity)
      - Long-term memory: semantic search over Qdrant chat_memory collection
      - Indexing: each conversation turn is embedded and stored for future retrieval
    """

    def __init__(self):
        self._qdrant = AsyncQdrantClient(url=settings.QDRANT_URL)
        self._collection_ensured = False

    async def _ensure_collection(self) -> None:
        """Create the chat_memory Qdrant collection if it doesn't exist."""
        if self._collection_ensured:
            return
        try:
            from qdrant_client.http.models import Distance, VectorParams
            collections = await self._qdrant.get_collections()
            existing = {c.name for c in collections.collections}
            if settings.MEMORY_COLLECTION_NAME not in existing:
                await self._qdrant.create_collection(
                    collection_name=settings.MEMORY_COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=384,  # all-MiniLM-L6-v2 output dimension
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"✅ Created Qdrant collection: {settings.MEMORY_COLLECTION_NAME}")
            self._collection_ensured = True
        except Exception as exc:
            logger.warning(f"Could not ensure chat_memory collection: {exc}")

    # ── Short-Term Memory (PostgreSQL) ──────────────────────────────

    @staticmethod
    async def get_short_term_memory(user_id: int, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """
        Fetch the last N messages from chat_history for conversational continuity.
        Returns messages in chronological order (oldest first).
        """
        if limit is None:
            limit = settings.MEMORY_SHORT_TERM_MESSAGES

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT role, content, "createdAt"
                    FROM chat_history
                    WHERE "userId" = :user_id
                    ORDER BY "createdAt" DESC
                    LIMIT :limit
                """),
                {"user_id": user_id, "limit": limit}
            )
            rows = result.fetchall()

        # Reverse to chronological order (oldest first)
        messages = [
            {"role": row.role, "content": row.content}
            for row in reversed(rows)
        ]
        logger.info(f"Short-term memory: {len(messages)} messages for user {user_id}")
        return messages

    # ── Long-Term Memory (Qdrant Vector Search) ────────────────────

    async def get_long_term_memory(
        self,
        user_id: int,
        query_embedding: List[float],
        top_k: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search over past conversation history in Qdrant.
        Filtered by user_id to ensure memory isolation between users.
        """
        if top_k is None:
            top_k = settings.MEMORY_LONG_TERM_TOP_K

        await self._ensure_collection()

        try:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue
            response = await self._qdrant.query_points(
                collection_name=settings.MEMORY_COLLECTION_NAME,
                query=query_embedding,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="user_id",
                            match=MatchValue(value=user_id),
                        )
                    ]
                ),
                limit=top_k,
                score_threshold=settings.MEMORY_SIMILARITY_THRESHOLD,
            )

            memories = []
            for point in response.points:
                memories.append({
                    "text": point.payload.get("content", ""),
                    "role": point.payload.get("role", "unknown"),
                    "score": round(point.score, 4),
                    "timestamp": point.payload.get("timestamp", ""),
                })

            logger.info(
                f"Long-term memory: {len(memories)} relevant matches "
                f"for user {user_id} (threshold={settings.MEMORY_SIMILARITY_THRESHOLD})"
            )
            return memories

        except Exception as exc:
            logger.warning(f"Long-term memory search failed (non-fatal): {exc}")
            return []

    # ── Index Conversation Turn ────────────────────────────────────

    async def index_conversation_turn(
        self,
        user_id: int,
        role: str,
        content: str,
        session_id: Optional[str] = None,
    ) -> None:
        """
        Embed a conversation message and store it in the chat_memory
        Qdrant collection for future semantic retrieval.
        """
        if not content or len(content.strip()) < 5:
            return  # skip trivially short messages

        await self._ensure_collection()

        try:
            import uuid
            from datetime import datetime
            from services.vector_service import VectorEngine

            embedding = VectorEngine.encode_query(content)

            point_id = str(uuid.uuid4())
            await self._qdrant.upsert(
                collection_name=settings.MEMORY_COLLECTION_NAME,
                points=[{
                    "id": point_id,
                    "vector": embedding,
                    "payload": {
                        "user_id": user_id,
                        "role": role,
                        "content": content[:2000],  # truncate very long messages
                        "session_id": session_id or "",
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                }],
            )
            logger.debug(f"Indexed {role} message for user {user_id} in chat_memory")

        except Exception as exc:
            logger.warning(f"Failed to index conversation turn (non-fatal): {exc}")

    # ── Token-Aware Summarization ──────────────────────────────────

    @staticmethod
    def summarize_messages(messages: List[Dict[str, str]], max_tokens: int = 0) -> List[Dict[str, str]]:
        """
        If combined message text exceeds max_tokens, truncate older messages
        and prepend a summary marker. Uses a simple character-based estimate
        (1 token ≈ 4 chars) to avoid importing tiktoken here.
        """
        if max_tokens <= 0:
            max_tokens = settings.MEMORY_MAX_CONTEXT_TOKENS

        char_budget = max_tokens * 4  # rough estimate

        # Calculate total characters
        total_chars = sum(len(m.get("content", "")) for m in messages)

        if total_chars <= char_budget:
            return messages  # fits within budget

        # Keep the most recent messages that fit within budget
        kept = []
        used_chars = 0
        for msg in reversed(messages):
            msg_chars = len(msg.get("content", ""))
            if used_chars + msg_chars > char_budget:
                break
            kept.append(msg)
            used_chars += msg_chars

        kept.reverse()

        if len(kept) < len(messages):
            # Prepend a note about truncated history
            dropped = len(messages) - len(kept)
            summary_note = {
                "role": "system",
                "content": f"[{dropped} earlier messages omitted for brevity]"
            }
            kept.insert(0, summary_note)

        logger.info(
            f"Memory summarized: {len(messages)} → {len(kept)} messages "
            f"({total_chars} → {used_chars} chars)"
        )
        return kept

    # ── De-duplication Helper ──────────────────────────────────────

    @staticmethod
    def deduplicate_memories(
        short_term: List[Dict[str, str]],
        long_term: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Remove long-term memory results that overlap with short-term messages.
        Compares by normalised content to catch near-duplicates.
        """
        short_term_texts = {
            m.get("content", "").strip().lower()[:100]
            for m in short_term
        }

        deduped = [
            mem for mem in long_term
            if mem.get("text", "").strip().lower()[:100] not in short_term_texts
        ]

        if len(deduped) < len(long_term):
            logger.debug(
                f"De-duplicated long-term memory: {len(long_term)} → {len(deduped)}"
            )
        return deduped