# services/chat_service.py

import logging
import uuid
import json
from sqlalchemy.ext.asyncio import AsyncSession

from services.profile_service import ProfileService
from services.memory_service import MemoryService
from services.llm_service import get_groq_service
from services.qdrant_service import qdrant_svc
from tools.tool_definitions import ICoach_Tools
from tools.tool_executor import execute_tool

logger = logging.getLogger(__name__)

BASE_SYSTEM_PROMPT = """You are 'ICoach', an expert, friendly, and motivating AI fitness and nutrition coach.
CRITICAL RULES:
1. LANGUAGE MATCHING: Always reply in the EXACT SAME LANGUAGE the user used. If the user writes in Arabic, reply in a friendly Egyptian Arabic tone. If the user writes in English, reply in friendly, motivating English. Use emojis naturally.
2. YOU ARE A FITNESS COACH. NEVER answer politics, coding, math, or general trivia.
3. NEVER GUESS: If the user asks for calories, protein, or specific exercises, you MUST use the provided tools. 
4. MANDATORY TOOL USAGE: Use 'search_food_nutrition' for food and 'search_workouts' for exercises.
5. LONG-TERM MEMORY: Use 'save_long_term_memory' if the user mentions new permanent preferences, allergies, or dislikes.
6. If user reports pain, advise rest AND use 'update_medical_record' tool.
7. FOOD NAME FORMATTING: When calling 'search_food_nutrition', ALWAYS format the food name by replacing spaces with underscores (e.g., 'apple pie' -> 'apple_pie'). If the user asks in Arabic, translate it to the closest matching English key used in our DB (e.g., 'molokhia').
8. SILENT TOOL USAGE: NEVER narrate your actions. NEVER write phrases like "Let's search", "I will use the tool", "Searching now", or mention tool names like "(search_food_nutrition)". Just use the tool silently in the background and output ONLY the final conversational answer to the user.
9. Format your answers beautifully using Markdown.

Current User Data (Use it but don't list it all unless asked):
- Name: {name}
- Goal: {goal}
- Weight: {weight} kg
- Height: {height} cm
- Medical Notes: {medical_notes}
"""

async def handle_chat_message(db_session: AsyncSession, user_id: int, message: str, session_id: str = None):
    """
    الـ Agent Loop الرئيسي - يدعم الـ Streaming والـ Tool Calling والذاكرة طويلة المدى
    """
    # 1. إدارة الجلسة (Session) وتجاوز أخطاء Swagger
    if not session_id or session_id == "string" or session_id.strip() == "":
        session_id = str(uuid.uuid4())
        logger.info(f"🆕 Started new session: {session_id}")

    # 2. 🛠️ ضمان قراءة بيانات اليوزر بشكل صحيح سواء كانت متداخلة أو مباشرة
    user_context = await ProfileService.get_user_context(user_id, db_session)
    p = user_context.get('profile', user_context) if isinstance(user_context, dict) else {}
    
    # 🕵️‍♂️ [DEBUG LOGS] - طباعة الداتا الخاصة بالبروفايل
    logger.info("="*50)
    logger.info(f"🕵️‍♂️ DEBUG [User Context from DB]: {user_context}")
    logger.info(f"🕵️‍♂️ DEBUG [Extracted Profile 'p']: {p}")
    logger.info("="*50)

    history = await MemoryService.get_chat_history(user_id, session_id, db_session)

    # 🌟 جلب الذكريات من Qdrant (زودنا limit=5 عشان يلقط الكلمات المهمة)
    past_memories = await qdrant_svc.search_similar_memories(user_id, message, limit=5)
    memory_string = "\n- ".join(past_memories) if past_memories else "None"

    # 🕵️‍♂️ [DEBUG LOGS] - طباعة ذكريات Qdrant
    logger.info(f"🕵️‍♂️ DEBUG [Qdrant Memories Found]: {past_memories}")

    # 🛠️ قراءة المفاتيح الصحيحة لبيانات المستخدم
    system_content = BASE_SYSTEM_PROMPT.format(
        name=p.get('name', p.get('firstName', 'يا بطل')),
        goal=p.get('fitness_goal', p.get('fitnessGoal', 'General Health')),
        weight=p.get('weight_kg', p.get('weight', 'غير محدد')),
        height=p.get('height_cm', p.get('height', 'غير محدد')),
        medical_notes=json.dumps(user_context.get('medical_notes', p.get('medicalNotes', 'None')), ensure_ascii=False)
    )
    
    # إضافة الذاكرة طويلة المدى للبرومبت لو موجودة
    if past_memories:
        system_content += f"\n\n[LONG-TERM MEMORY ABOUT THIS USER]:\n- {memory_string}\n(Use these facts if relevant to your answer)."

    # 🕵️‍♂️ [DEBUG LOGS] - طباعة الـ Prompt النهائي اللي رايح لـ LLM
    logger.info("="*50)
    logger.info(f"🕵️‍♂️ DEBUG [Final System Prompt]:\n{system_content}")
    logger.info("="*50)

    messages = [{"role": "system", "content": system_content}]
    
    # إضافة آخر 10 رسائل من التاريخ للسياق
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # حفظ رسالة المستخدم في SQL (الذاكرة القصيرة)
    await MemoryService.save_message(user_id, session_id, "user", message, db_session)
    messages.append({"role": "user", "content": message})

    # 3. 🔥 حفظ الرسالة في Qdrant (الذاكرة الطويلة) مع التأكد من نجاحها
    try:
        await qdrant_svc.save_memory(user_id, message)
        logger.info("✅ Qdrant: تم حفظ رسالة اليوزر في الذاكرة الطويلة.")
    except Exception as e:
        logger.error(f"❌ Qdrant: فشل حفظ الرسالة في الذاكرة الطويلة: {e}")

    # 4. دوامة الـ Agent (Tool-Calling Loop)
    llm = get_groq_service()
    max_tool_calls = 3
    current_tool_calls = 0
    final_full_reply = ""

    while True:
        # لفة طلبات الأدوات (دائماً Non-Streaming عشان المعالجة)
        response = await llm.chat_completion(
            messages=messages, 
            tools=ICoach_Tools,
            max_tokens=1000
        )
        
        response_message = response.choices[0].message

        # حالة طلب أداة
        if response_message.tool_calls:
            if current_tool_calls >= max_tool_calls:
                yield json.dumps({"reply": "آسف يا بطل، الطلب ده معقد شوية، ممكن تبسطه؟", "session_id": session_id}) + "\n"
                return

            messages.append(response_message)
            
            for tool_call in response_message.tool_calls:
                tool_name = tool_call.function.name
                
                # 📡 إرسال حالة (Status Event) للفرونت إند
                yield json.dumps({"status": f"🔄 جاري البحث في {tool_name}...", "session_id": session_id}) + "\n"
                
                tool_args = tool_call.function.arguments
                tool_call_dict = {"name": tool_name, "arguments": tool_args}
                
                # تنفيذ الأداة
                tool_result = await execute_tool(tool_call_dict, db_session, str(user_id))
                
                # إضافة نتيجة الأداة للسياق
                messages.append({
                    "role": "tool",
                    "content": json.dumps(tool_result, ensure_ascii=False),
                    "tool_call_id": tool_call.id
                })
            
            current_tool_calls += 1
            continue  # لفة جديدة للموديل ليقرأ النتائج
            
        else:
            # ⚡ الرد النهائي (Streaming)
            stream = await llm.chat_completion(
                messages=messages,
                max_tokens=1000,
                stream=True 
            )
            
            async for chunk in stream:
                content = chunk.choices[0].delta.content or ""
                if content:
                    final_full_reply += content
                    # إرسال جزء من النص
                    yield json.dumps({"reply": content, "session_id": session_id}) + "\n"
            break

    # 5. حفظ رد المساعد الكامل في SQL (Post-save)
    if final_full_reply:
        await MemoryService.save_message(user_id, session_id, "assistant", final_full_reply, db_session)