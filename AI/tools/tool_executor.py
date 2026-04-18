# tools/tool_executor.py 
 
import logging 
import json 
from sqlalchemy.ext.asyncio import AsyncSession 
 
# Import the tools we created 
from . import search_food_nutrition 
from . import search_workouts 
from . import update_medical_record

# Import Qdrant service for Long-Term Memory
from services.qdrant_service import qdrant_svc
 
logger = logging.getLogger(__name__) 
 
async def execute_tool(tool_call: dict, db_session: AsyncSession, user_id: str) -> dict: 
    """ 
    Receives a tool call request from the model (Llama 3), executes it, and returns the result. 
    """ 
    tool_name = tool_call.get("name") 
     
    # Parse the JSON sent by the model (arguments) 
    try: 
        arguments = json.loads(tool_call.get("arguments", "{}")) 
    except json.JSONDecodeError: 
        logger.error(f"❌ Failed to parse tool arguments: {tool_call.get('arguments')}") 
        return { 
            "ok": False, 
            "tool": tool_name, 
            "message": "Could not understand the provided arguments." 
        } 
 
    logger.info(f"⚙️ Executing Tool: {tool_name} with args: {arguments}") 
 
    # 1. Food nutrition search tool 
    if tool_name == "search_food_nutrition": 
        food_name = arguments.get("food_name") 
        if not food_name: 
            return {"ok": False, "tool": tool_name, "message": "Food name must be provided."} 
         
        return await search_food_nutrition.execute(food_name, db_session) 
 
    # 2. Workout search tool 
    elif tool_name == "search_workouts": 
        # All parameters are optional 
        target_muscle = arguments.get("target_muscle") 
        difficulty_level = arguments.get("difficulty_level") 
        equipment = arguments.get("equipment") 
         
        return await search_workouts.execute(db_session, target_muscle, difficulty_level, equipment) 
 
    # 3. Medical record tool 
    elif tool_name == "update_medical_record": 
        issue = arguments.get("issue") 
        body_part = arguments.get("body_part") 
        status = arguments.get("status") 
         
        if not all([issue, body_part, status]): 
            return {"ok": False, "tool": tool_name, "message": "Issue, body part, and status must be provided."} 
             
        # Note here: we pass the user_id from the server, not from the model, to protect privacy 
        return await update_medical_record.execute(db_session, user_id, issue, body_part, status) 

    # 4. Long-Term Memory Saver (Qdrant)
    elif tool_name == "save_long_term_memory":
        fact = arguments.get("fact")
        if not fact:
            return {"ok": False, "tool": tool_name, "message": "Fact must be provided."}
            
        success = await qdrant_svc.save_memory(user_id=int(user_id), text=fact)
        if success:
            return {
                "ok": True, 
                "tool": tool_name, 
                "message": f"Successfully saved to long-term memory: {fact}"
            }
        else:
            return {
                "ok": False, 
                "tool": tool_name, 
                "message": "Failed to save memory to Qdrant."
            }
 
    # If the model calls an unknown tool 
    else: 
        logger.warning(f"⚠️ Unknown tool called: {tool_name}") 
        return { 
            "ok": False, 
            "tool": tool_name, 
            "message": f"The tool '{tool_name}' is not defined in the system." 
        }