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

# -------------------------------------------------------------------
# 🧠 1. قاموس ربط أسماء الأكلات (Mapping Dictionary)
# تقدر تزود فيه أي أكلات عربي بترادفها في الـ JSON بتاعك
# -------------------------------------------------------------------
FOOD_MAPPING = {
    "ملوخيه": "molokhia", "ملوخية": "molokhia",
    "عيش بلدي": "aesh_baldy", "خبز بلدي": "aesh_baldy",
    "باميه": "bamya", "بامية": "bamya",
    "كشري": "koshari", "كشرى": "koshari",
    "بسبوسه": "basbousa", "بسبوسة": "basbousa",
    "كنافه": "konafa", "كنافة": "konafa",
    "فول": "fool", "فلافل": "falafel", "طعميه": "falafel", "طعمية": "falafel",
    "حواوشي": "hawawshy", "حواوشى": "hawawshy",
    "شاورما": "shawrma", "شاورمه": "shawrma",
    "كفتة": "kofta", "كفته": "kofta",
    "محشي": "mahshi", "محشى": "mahshi",
    "ممبار": "mombar",
    "ورق عنب": "waraa_enb",
    "مسقعه": "mesaqaa", "مسقعة": "mesaqaa",
    "كبده": "kebda", "كبدة": "kebda",
    "فطيره تفاح": "apple_pie", "فطيرة تفاح": "apple_pie"
}

# -------------------------------------------------------------------
# 🌐 2. دالة البحث الخارجي (Fallback Function)
# -------------------------------------------------------------------
async def fetch_external_nutrition(food_name: str) -> dict:
    """
    هنا هتكتب الكود بتاعك اللي بيكلم API خارجي (زي Edamam أو API Ninjas أو FatSecret).
    مؤقتاً دي دالة وهمية عشان اللوجيك يشتغل، لازم تحط كود الـ API الفعلي بتاعك.
    """
    logger.info(f"🌐 جاري البحث في مصدر خارجي عن: {food_name}")
    
    # --- حط كود الـ HTTP Request هنا ---
    # async with aiohttp.ClientSession() as session:
    #     async with session.get(f"YOUR_API_URL?query={food_name}") as response:
    #         data = await response.json()
    # -----------------------------------
    
    # نفترض إن ده الرد اللي هيرجع للـ Agent
    return {
        "ok": True,
        "tool": "search_food_nutrition",
        "source": "external_api",
        "message": f"تم العثور على معلومات عن {food_name} من مصدر خارجي.",
        # "data": data  # هتحط الداتا الفعلية هنا
    }

# -------------------------------------------------------------------
# ⚙️ 3. الدالة الرئيسية لتنفيذ الأدوات
# -------------------------------------------------------------------
async def execute_tool(tool_call: dict, db_session: AsyncSession, user_id: str) -> dict: 
    """ 
    Receives a tool call request from the model (Llama 3 / Groq), executes it, and returns the result. 
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
 
    # ==========================================
    # 🍎 أداة البحث عن السعرات (التعديل تم هنا)
    # ==========================================
    if tool_name == "search_food_nutrition": 
        original_food_name = arguments.get("food_name") 
        if not original_food_name: 
            return {"ok": False, "tool": tool_name, "message": "Food name must be provided."} 
        
        # 1. تنظيف النص (Normalization)
        clean_name = original_food_name.lower().strip()
        
        # 2. البحث في قاموس الأكلات العربية والفرانكو أولاً
        mapped_name = FOOD_MAPPING.get(clean_name, clean_name)
        
        # 3. تحويل أي مسافات باقية لـ شرطة سفلية (عشان apple pie تبقى apple_pie)
        final_db_key = mapped_name.replace(" ", "_")
        
        logger.info(f"🔍 Food Name Normalized: '{original_food_name}' -> DB Key: '{final_db_key}'")

        # 4. البحث في قاعدة البيانات المحلية
        local_result = await search_food_nutrition.execute(final_db_key, db_session) 
        
        # التأكد إذا كان العنصر موجود محلياً أو لا 
        # (يفترض أن local_result ترجع "ok": False أو dict فارغ لو ملقاش الأكلة)
        # لو دالة الـ execute عندك بترجع حاجة تانية بتدل على الفشل، عدل الشرط ده
        is_found = local_result.get("ok", False) if isinstance(local_result, dict) else bool(local_result)

        if is_found:
            logger.info("✅ تم العثور على الأكلة في قاعدة البيانات المحلية.")
            return local_result
        else:
            logger.warning(f"⚠️ الأكلة '{final_db_key}' مش موجودة محلياً. جاري البحث الخارجي تلقائياً.")
            # 5. التوجيه التلقائي للبحث الخارجي باستخدام الاسم الأصلي الذي أدخله المستخدم
            external_result = await fetch_external_nutrition(original_food_name)
            return external_result

    # ==========================================
    # 🏋️‍♂️ 2. Workout search tool 
    # ==========================================
    elif tool_name == "search_workouts": 
        # All parameters are optional 
        target_muscle = arguments.get("target_muscle") 
        difficulty_level = arguments.get("difficulty_level") 
        equipment = arguments.get("equipment") 
         
        return await search_workouts.execute(db_session, target_muscle, difficulty_level, equipment) 
 
    # ==========================================
    # 🏥 3. Medical record tool 
    # ==========================================
    elif tool_name == "update_medical_record": 
        issue = arguments.get("issue") 
        body_part = arguments.get("body_part") 
        status = arguments.get("status") 
         
        if not all([issue, body_part, status]): 
            return {"ok": False, "tool": tool_name, "message": "Issue, body part, and status must be provided."} 
             
        # Note here: we pass the user_id from the server, not from the model, to protect privacy 
        return await update_medical_record.execute(db_session, user_id, issue, body_part, status) 

    # ==========================================
    # 🧠 4. Long-Term Memory Saver (Qdrant)
    # ==========================================
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
 
    # ==========================================
    # ❓ If the model calls an unknown tool 
    # ==========================================
    else: 
        logger.warning(f"⚠️ Unknown tool called: {tool_name}") 
        return { 
            "ok": False, 
            "tool": tool_name, 
            "message": f"The tool '{tool_name}' is not defined in the system." 
        }