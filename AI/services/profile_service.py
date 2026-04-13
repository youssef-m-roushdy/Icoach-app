import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ProfileService:
    """خدمة جلب البيانات الشخصية والطبية للمستخدم"""
    
    @staticmethod
    async def get_user_context(user_id: int, session: AsyncSession) -> Dict[str, Any]:
        """جلب بروفايل المستخدم والملف الطبي (JSONB)"""
        try:
            # لاحظ: استدعاء medical_notes اللي هو JSONB
            result = await session.execute(
                text("""
                    SELECT "firstName", "lastName", height, weight, 
                           "fitnessGoal", "activityLevel", gender, "dateOfBirth", bmi,
                           medical_notes 
                    FROM users 
                    WHERE id = :user_id AND "isActive" = true
                """),
                {"user_id": user_id}
            )
            user = result.fetchone()
            
            if not user:
                return {}
            
            # حساب العمر
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
                # إرجاع الـ JSONB الطبي مباشرة
                "medical_notes": user.medical_notes if user.medical_notes else []
            }
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            return {}