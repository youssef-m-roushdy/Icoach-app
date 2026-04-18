# tools/search_workouts.py 
 
import logging 
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import text 
 
logger = logging.getLogger(__name__) 
 
async def execute(db_session: AsyncSession, target_muscle: str = None, difficulty_level: str = None, equipment: str = None) -> dict: 
    """ 
    Searches for workouts based on muscle, difficulty level, or equipment. 
    All parameters are optional, and the query is built dynamically with alias support. 
    """ 
    logger.info(f"🔍 Tool Called: search_workouts | target: {target_muscle}, level: {difficulty_level}, equipment: {equipment}") 
     
    try: 
        # 💡 Alias dictionary (Aliases & Normalization) 
        if target_muscle: 
            target_muscle = target_muscle.strip().lower() 
            aliases = { 
                "بنج": "chest", "صدر": "chest", "pectorals": "chest", 
                "كتف": "shoulder", "أكتاف": "shoulder", "deltoid": "shoulder", 
                "ضهر": "back", "ظهر": "back", "lats": "back", 
                "رجل": "lower legs", "رجلين": "upper legs", "legs": "legs", "quads": "upper legs", 
                "باي": "biceps", "تراي": "triceps", "ذراع": "arms" 
            } 
            # If the word exists in the dictionary, use it; otherwise, keep it as is 
            target_muscle = aliases.get(target_muscle, target_muscle) 
 
        # Start with a base query and append conditions if provided 
        query_str = """ 
            SELECT id, name, body_part, target_area, level, equipment, description, gif_link 
            FROM workouts 
            WHERE 1=1 
        """ 
        params = {} 
         
        # If a muscle is provided, search in both body_part and target_area 
        if target_muscle: 
            query_str += " AND (body_part ILIKE :target_muscle OR target_area ILIKE :target_muscle)" 
            params["target_muscle"] = f"%{target_muscle}%" 
             
        # If a difficulty level is provided 
        if difficulty_level: 
            query_str += " AND level ILIKE :difficulty_level" 
            params["difficulty_level"] = f"%{difficulty_level}%" 
             
        # If equipment is provided 
        if equipment: 
            query_str += " AND equipment ILIKE :equipment" 
            params["equipment"] = f"%{equipment}%" 
             
        # Limit results to 5 workouts to avoid consuming too many tokens in the response 
        query_str += " LIMIT 5" 
         
        query = text(query_str) 
        result = await db_session.execute(query, params) 
        rows = result.fetchall() 
 
        if not rows: 
            return { 
                "ok": False, 
                "tool": "search_workouts", 
                "data": [], 
                "message": "Could not find workouts matching these criteria in the database." 
            } 
 
        workout_data = [] 
        for row in rows: 
            workout_data.append({ 
                "id": row.id, 
                "name": row.name, 
                "body_part": row.body_part, 
                "target_area": row.target_area, 
                "level": row.level, 
                "equipment": row.equipment if row.equipment else "Bodyweight/None", 
                "description": row.description if row.description else "No additional description available.", 
                "gif_link": row.gif_link 
            }) 
 
        return { 
            "ok": True, 
            "tool": "search_workouts", 
            "data": workout_data, 
            "message": f"Found {len(workout_data)} matching workouts." 
        } 
 
    except Exception as e: 
        logger.error(f"❌ Error in search_workouts tool: {e}") 
        return { 
            "ok": False, 
            "tool": "search_workouts", 
            "data": [], 
            "message": "An internal error occurred while searching for workouts." 
        }