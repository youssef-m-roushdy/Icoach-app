import logging
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

class MemoryService:
    """خدمة إدارة سجل المحادثات (الذاكرة قصيرة المدى)"""

    @staticmethod
    async def get_chat_history(user_id: int, session_id: str, session: AsyncSession, limit: int = 15) -> List[Dict[str, str]]:
        """جلب آخر رسائل لنفس الجلسة"""
        result = await session.execute(
            text("""
                SELECT role, content 
                FROM chat_history 
                WHERE "userId" = :user_id AND session_id = :session_id
                ORDER BY "createdAt" DESC 
                LIMIT :limit
            """),
            {"user_id": user_id, "session_id": session_id, "limit": limit}
        )
        rows = result.fetchall()
        
        # نعكس الترتيب عشان أقدم رسالة تكون فوق والجديدة تحت
        return [{"role": row.role, "content": row.content} for row in reversed(rows)]

    @staticmethod
    async def save_message(user_id: int, session_id: str, role: str, content: str, session: AsyncSession) -> None:
        """حفظ رسالة جديدة في الداتابيز"""
        allowed_roles = {'user', 'assistant', 'tool', 'system'}
        if role not in allowed_roles:
            return
            
        await session.execute(
            text("""
                INSERT INTO chat_history ("userId", session_id, role, content, "createdAt") 
                VALUES (:user_id, :session_id, :role, :content, NOW())
            """),
            {"user_id": user_id, "session_id": session_id, "role": role, "content": content}
        )
        await session.commit()