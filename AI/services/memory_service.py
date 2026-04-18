import logging
from typing import List, Dict, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

class MemoryService:
    """Chat history management service (short-term memory)"""

    @staticmethod
    async def get_chat_history(user_id: Union[int, str], session_id: str, session: AsyncSession, limit: int = 10) -> List[Dict[str, str]]:
        """Fetch recent messages for the same session (sliding window)"""
        try:
            # ✅ Convert to int if string is passed
            user_id_int = int(user_id) if isinstance(user_id, str) else user_id
            
            result = await session.execute(
                text("""
                    SELECT role, content 
                    FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    ORDER BY created_at DESC 
                    LIMIT :limit
                """),
                {"user_id": user_id_int, "session_id": session_id, "limit": limit}  # ✅ No str() conversion
            )
            rows = result.fetchall()
            
            # Reverse order so the model reads them in correct chronological order (oldest to newest within the 10 message limit)
            return [{"role": row.role, "content": row.content} for row in reversed(rows)]
        except Exception as e:
            logger.error(f"Error fetching chat history: {e}")
            return []

    @staticmethod
    async def save_message(user_id: Union[int, str], session_id: str, role: str, content: str, session: AsyncSession) -> None:
        """Save a new message to the database"""
        try:
            allowed_roles = {'user', 'assistant', 'tool', 'system'}
            if role not in allowed_roles:
                logger.warning(f"Invalid role: {role}. Allowed roles: {allowed_roles}")
                return
            
            # ✅ Convert to int if string is passed
            user_id_int = int(user_id) if isinstance(user_id, str) else user_id
                
            # id is auto-generated (SERIAL), so we don't need to provide it
            await session.execute(
                text("""
                    INSERT INTO chat_history (user_id, session_id, role, content, created_at) 
                    VALUES (:user_id, :session_id, :role, :content, NOW())
                """),
                {
                    "user_id": user_id_int,  # ✅ No str() conversion
                    "session_id": session_id,
                    "role": role,
                    "content": content
                }
            )
            await session.commit()
            logger.info(f"Message saved successfully for user {user_id_int}, session {session_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving message: {e}")
            raise e

    @staticmethod
    async def get_session_history(user_id: Union[int, str], session_id: str, session: AsyncSession, limit: int = 10) -> List[Dict[str, str]]:
        """Alternative method to fetch history with timestamps (useful for frontend UI)"""
        try:
            # ✅ Convert to int if string is passed
            user_id_int = int(user_id) if isinstance(user_id, str) else user_id
            
            # Modified here to order by DESC to get latest messages, then reverse them
            result = await session.execute(
                text("""
                    SELECT role, content, created_at
                    FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    ORDER BY created_at DESC 
                    LIMIT :limit
                """),
                {"user_id": user_id_int, "session_id": session_id, "limit": limit}  # ✅ No str() conversion
            )
            rows = result.fetchall()
            
            # Reverse order so oldest message is first, newest last
            return [{"role": row.role, "content": row.content, "timestamp": row.created_at} for row in reversed(rows)]
        except Exception as e:
            logger.error(f"Error fetching session history: {e}")
            return []

    @staticmethod
    async def clear_session_history(user_id: Union[int, str], session_id: str, session: AsyncSession) -> bool:
        """Clear all messages for a specific session"""
        try:
            # ✅ Convert to int if string is passed
            user_id_int = int(user_id) if isinstance(user_id, str) else user_id
            
            result = await session.execute(
                text("""
                    DELETE FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    RETURNING id
                """),
                {"user_id": user_id_int, "session_id": session_id}  # ✅ No str() conversion
            )
            deleted_count = len(result.fetchall())
            await session.commit()
            
            logger.info(f"Cleared {deleted_count} messages for session {session_id}")
            return True
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error clearing session history: {e}")
            return False