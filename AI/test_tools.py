# test_tools.py 
import sys 
import os 
 
# Add current path to Python paths so it can detect the tools and config folders 
sys.path.append(os.path.dirname(os.path.abspath(__file__))) 
 
import asyncio 
from config.database import AsyncSessionLocal 
from tools.tool_executor import execute_tool  
 
# ... rest of the code remains unchanged ... 
 
async def run_smoke_tests(): 
    print("\n🚀 Starting Sprint 2 Smoke Tests...\n") 
     
    # Open a database session for testing 
    async with AsyncSessionLocal() as db_session: 
        user_id = "1" # dummy user for testing 
         
        # 1. Test food tool 
        print("🍔 Testing Food Search...") 
        food_call = { 
            "name": "search_food_nutrition", 
            "arguments": '{"food_name": "chicken"}' 
        } 
        res_food = await execute_tool(food_call, db_session, user_id) 
        print(f"Result: {'✅ SUCCESS' if res_food['ok'] else '❌ FAILED'} - {res_food['message']}") 
 
        # 2. Test workout tool (testing alias handling) 
        print("\n🏋️ Testing Workout Search (with alias 'بنج')...") 
        workout_call = { 
            "name": "search_workouts", 
            "arguments": '{"target_muscle": "بنج"}' 
        } 
        res_workout = await execute_tool(workout_call, db_session, user_id) 
        print(f"Result: {'✅ SUCCESS' if res_workout['ok'] else '❌ FAILED'} - {res_workout['message']}") 
 
        # 3. Test medical tool 
        print("\n🏥 Testing Medical Record Update...") 
        medical_call = { 
            "name": "update_medical_record", 
            "arguments": '{"issue": "ألم في الكتف", "body_part": "shoulder", "status": "active"}' 
        } 
        res_med = await execute_tool(medical_call, db_session, user_id) 
        print(f"Result: {'✅ SUCCESS' if res_med['ok'] else '❌ FAILED'} - Action: {res_med.get('action')}") 
 
    print("\n✨ All tests completed! If all are ✅, Sprint 2 is 100% DONE.") 
 
if __name__ == "__main__": 
    asyncio.run(run_smoke_tests())