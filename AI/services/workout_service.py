import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

# قاموس لتوحيد مسميات العضلات (Synonyms/Aliases)
MUSCLE_ALIASES = {
    "chest": "chest",
    "pectorals": "chest",
    "front shoulder": "anterior deltoid",
    "shoulder": "shoulder",
    "back arm": "triceps",
    "front arm": "biceps",
    "legs": "legs",
    "quads": "quadriceps",
    "صدر": "chest",
    "كتف": "shoulder",
    "ظهر": "back"
}

class WorkoutService:
    """Service for searching and filtering workouts"""

    @staticmethod
    async def search_workouts(
        session: AsyncSession,
        target_muscle: Optional[str] = None,
        difficulty: Optional[str] = None,
        equipment: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        
        # Base query
        query = "SELECT id, name, body_part, target_area, level, equipment, description FROM workouts WHERE 1=1"
        params = {"limit": limit}

        # Filter by Muscle / Body Part
        if target_muscle:
            normalized_muscle = target_muscle.lower().strip()
            # Map synonym to standard name if exists
            normalized_muscle = MUSCLE_ALIASES.get(normalized_muscle, normalized_muscle)
            
            query += " AND (LOWER(target_area) LIKE :muscle OR LOWER(body_part) LIKE :muscle)"
            params["muscle"] = f"%{normalized_muscle}%"

        # Filter by Difficulty (Beginner, Intermediate, Advanced)
        if difficulty:
            query += " AND LOWER(level) = :difficulty"
            params["difficulty"] = difficulty.lower().strip()

        # Filter by Equipment (Dumbbell, Barbell, Bodyweight, etc.)
        if equipment:
            query += " AND LOWER(equipment) LIKE :equipment"
            params["equipment"] = f"%{equipment.lower().strip()}%"

        query += " LIMIT :limit"

        try:
            result = await session.execute(text(query), params)
            rows = result.fetchall()
            
            return [
                {
                    "id": row.id,
                    "name": row.name,
                    "body_part": row.body_part,
                    "target": row.target_area,
                    "level": row.level,
                    "equipment": row.equipment,
                    "description": row.description
                } for row in rows
            ]
        except Exception as e:
            logger.error(f"Error searching workouts: {e}")
            return []