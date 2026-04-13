import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import date

logger = logging.getLogger(__name__)

class ProfileService:
    """Service to fetch user personal and medical data"""
    
    @staticmethod
    async def get_user_context(user_id: int, session: AsyncSession) -> Dict[str, Any]:
        """Fetch user profile and medical file (JSONB)"""
        try:
            # 1. Execute query with double quotes for CamelCase column names
            result = await session.execute(
                text("""
                    SELECT "firstName", "lastName", height, weight, 
                           "fitnessGoal", "activityLevel", gender, "dateOfBirth", bmi,
                           "medicalNotes" 
                    FROM users 
                    WHERE id = :user_id AND "isActive" = true
                """),
                {"user_id": user_id}
            )
            
            # Fetch row as Mapping to easily access CamelCase columns
            row = result.fetchone()
            
            if not row:
                return {}

            # 2. Calculate age from date of birth
            age = None
            if row.dateOfBirth:
                today = date.today()
                dob = row.dateOfBirth
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            
            # 3. Build dictionary with snake_case names for the test script
            # Note: Using row.columnName because SQLAlchemy reads them that way from SELECT
            return {
                "user_id": user_id,
                "profile": {
                    "name": f"{row.firstName} {row.lastName}",
                    "height_cm": row.height,
                    "weight_kg": row.weight,
                    "bmi": row.bmi,
                    "fitness_goal": row.fitnessGoal,
                    "activity_level": row.activityLevel,
                    "gender": row.gender,
                    "age": age
                },
                "medical_notes": row.medicalNotes if row.medicalNotes else []
            }
            
        except Exception as e:
            logger.error(f"Error fetching user profile: {e}")
            # Print full error to console for debugging
            import traceback
            traceback.print_exc()
            return {}