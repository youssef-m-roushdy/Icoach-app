# tools/search_food_nutrition.py 
 
import logging 
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import text 
 
logger = logging.getLogger(__name__) 
 
async def execute(food_name: str, db_session: AsyncSession) -> dict: 
    """ 
    Searches for a food item in the database and returns calories and macros. 
    """ 
    logger.info(f"🔍 Tool Called: search_food_nutrition | Searching for: {food_name}") 
     
    try: 
        # ✅ Update here: used 'carbohydrate' instead of 'carbs' to match the database 
        query = text(""" 
            SELECT name, calories, protein, carbohydrate, fat  
            FROM foods  
            WHERE name ILIKE :food_name 
            LIMIT 5 
        """) 
         
        result = await db_session.execute(query, {"food_name": f"%{food_name}%"}) 
        rows = result.fetchall() 
 
        if not rows: 
            return { 
                "ok": False, 
                "tool": "search_food_nutrition", 
                "data": [], 
                "message": f"Could not find a food item named '{food_name}' in the database." 
            } 
 
        food_data = [] 
        for row in rows: 
            food_data.append({ 
                "name": row.name, 
                "calories": float(row.calories) if row.calories else 0.0, 
                "protein": float(row.protein) if row.protein else 0.0, 
                # ✅ Update here: retrieved value from row.carbohydrate 
                "carbs": float(row.carbohydrate) if row.carbohydrate else 0.0, 
                "fat": float(row.fat) if row.fat else 0.0, 
                "serving_size": "100g"  
            }) 
 
        return { 
            "ok": True, 
            "tool": "search_food_nutrition", 
            "data": food_data, 
            "message": f"Found {len(food_data)} results." 
        } 
 
    except Exception as e: 
        logger.error(f"❌ Error in search_food_nutrition tool: {e}") 
        return { 
            "ok": False, 
            "tool": "search_food_nutrition", 
            "data": [], 
            "message": "An internal error occurred while searching for food in the database." 
        }