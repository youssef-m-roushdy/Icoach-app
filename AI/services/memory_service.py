import logging
import uuid
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

class MemoryService:
    """خدمة إدارة سجل المحادثات (الذاكرة قصيرة المدى)"""

    @staticmethod
    async def get_chat_history(user_id: int, session_id: str, session: AsyncSession, limit: int = 15) -> List[Dict[str, str]]:
        """جلب آخر رسائل لنفس الجلسة"""
        try:
            # Using correct column names from the database schema
            result = await session.execute(
                text("""
                    SELECT role, content 
                    FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    ORDER BY created_at DESC 
                    LIMIT :limit
                """),
                {"user_id": user_id, "session_id": session_id, "limit": limit}
            )
            rows = result.fetchall()
            
            # Reverse order so oldest message is first, newest last
            return [{"role": row.role, "content": row.content} for row in reversed(rows)]
        except Exception as e:
            logger.error(f"Error fetching chat history: {e}")
            return []

    @staticmethod
    async def save_message(user_id: int, session_id: str, role: str, content: str, session: AsyncSession) -> None:
        """حفظ رسالة جديدة في الداتابيز"""
        try:
            allowed_roles = {'user', 'assistant', 'tool', 'system'}
            if role not in allowed_roles:
                logger.warning(f"Invalid role: {role}. Allowed roles: {allowed_roles}")
                return
                
            # id is auto-generated (SERIAL), so we don't need to provide it
            await session.execute(
                text("""
                    INSERT INTO chat_history (user_id, session_id, role, content, created_at) 
                    VALUES (:user_id, :session_id, :role, :content, NOW())
                """),
                {
                    "user_id": user_id,
                    "session_id": session_id,
                    "role": role,
                    "content": content
                }
            )
            await session.commit()
            logger.info(f"Message saved successfully for user {user_id}, session {session_id}")
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving message: {e}")
            raise e

    @staticmethod
    async def get_session_history(user_id: int, session_id: str, session: AsyncSession, limit: int = 15) -> List[Dict[str, str]]:
        """Alternative method to get chat history with more details"""
        try:
            result = await session.execute(
                text("""
                    SELECT role, content, created_at
                    FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    ORDER BY created_at ASC 
                    LIMIT :limit
                """),
                {"user_id": user_id, "session_id": session_id, "limit": limit}
            )
            rows = result.fetchall()
            
            return [{"role": row.role, "content": row.content, "timestamp": row.created_at} for row in rows]
        except Exception as e:
            logger.error(f"Error fetching session history: {e}")
            return []

    @staticmethod
    async def clear_session_history(user_id: int, session_id: str, session: AsyncSession) -> bool:
        """Clear all messages for a specific session"""
        try:
            result = await session.execute(
                text("""
                    DELETE FROM chat_history 
                    WHERE user_id = :user_id AND session_id = :session_id
                    RETURNING id
                """),
                {"user_id": user_id, "session_id": session_id}
            )
            deleted_count = len(result.fetchall())
            await session.commit()
            
            logger.info(f"Cleared {deleted_count} messages for session {session_id}")
            return True
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Error clearing session history: {e}")
            return False