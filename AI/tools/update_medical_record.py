# tools/update_medical_record.py 
 
import logging 
import json 
import uuid 
from datetime import datetime, timezone 
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import text 
 
logger = logging.getLogger(__name__) 
 
async def execute(db_session: AsyncSession, user_id: str, issue: str, body_part: str, status: str) -> dict: 
    logger.info(f"🏥 Tool Called: update_medical_record | User: {user_id} | Issue: {issue}") 
     
    try: 
        # 💡 Update here: convert user_id to Integer 
        user_id_int = int(user_id)  
 
        query_fetch = text('SELECT "medicalNotes" FROM users WHERE id = :user_id') 
        result = await db_session.execute(query_fetch, {"user_id": user_id_int}) 
        row = result.fetchone() 
 
        if not row: 
            return { 
                "ok": False, 
                "tool": "update_medical_record", 
                "data": [], 
                "message": "User account not found." 
            } 
 
        current_notes = row[0] if row[0] else {} 
        if isinstance(current_notes, str): 
            current_notes = json.loads(current_notes) 
        if not isinstance(current_notes, dict): 
            current_notes = {} 
 
        if "injuries" not in current_notes: 
            current_notes["injuries"] = [] 
 
        issue = issue.strip() 
        body_part = body_part.strip().lower() 
        status = status.strip().lower() 
        now_time = datetime.now(timezone.utc).isoformat() 
 
        action = "inserted" 
        updated = False 
 
        for injury in current_notes["injuries"]: 
            if injury.get("bodyPart", "").lower() == body_part: 
                injury["description"] = issue 
                injury["status"] = status 
                injury["dateRecorded"] = now_time 
                action = "updated" 
                updated = True 
                break 
 
        if not updated: 
            current_notes["injuries"].append({ 
                "id": str(uuid.uuid4())[:9], 
                "bodyPart": body_part, 
                "description": issue, 
                "severity": "moderate", 
                "status": status, 
                "dateRecorded": now_time 
            }) 
 
        notes_json = json.dumps(current_notes) 
         
        query_update = text('UPDATE users SET "medicalNotes" = :notes WHERE id = :user_id') 
        # 💡 Update here as well: send user_id_int 
        await db_session.execute(query_update, {"notes": notes_json, "user_id": user_id_int}) 
        await db_session.commit() 
 
        return { 
            "ok": True, 
            "tool": "update_medical_record", 
            "action": action, 
            "data": {"issue": issue, "body_part": body_part, "status": status}, 
            "message": f"Successfully {'updated' if action == 'updated' else 'added'} the injury." 
        } 
 
    except Exception as e: 
        await db_session.rollback() 
        logger.error(f"❌ Error in update_medical_record tool: {e}") 
        return { 
            "ok": False, 
            "tool": "update_medical_record", 
            "data": [], 
            "message": "An internal error occurred while saving the medical record." 
        }