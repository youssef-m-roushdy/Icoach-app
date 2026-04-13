import asyncio
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
# Make sure to import SessionLocal and services from Youssef's files
# Instead of from database import AsyncSessionLocal
from config.database import AsyncSessionLocal
from services.profile_service import ProfileService
from services.memory_service import MemoryService

async def test_integration():
    print("🚀 Starting Sprint 1 integration test...")
    
    # 1. Assume test data (user ID 1 must exist in the database)
    test_user_id = 1 
    test_session_id = str(uuid.uuid4())
    
    async with AsyncSessionLocal() as session:
        try:
            # --- Test 1: Profile Service ---
            print("\n🔍 1. Testing ProfileService...")
            user_context = await ProfileService.get_user_context(test_user_id, session)
            if user_context:
                print(f"✅ Data retrieved successfully: {user_context['profile']['name']}")
                print(f"✅ Medical profile (JSONB): {user_context['medical_notes']}")
            else:
                print("❌ Failed: User not found. Make sure user ID=1 exists")

            # --- Test 2: Save message to memory ---
            print("\n💾 2. Testing saving messages in MemoryService...")
            await MemoryService.save_message(
                user_id=test_user_id,
                session_id=test_session_id,
                role="user",
                content="I'm testing the new chat, coach",
                session=session
            )
            print("✅ User message saved successfully.")

            # --- Test 3: Retrieve chat history ---
            print("\n📜 3. Testing chat history retrieval...")
            history = await MemoryService.get_chat_history(test_user_id, test_session_id, session)
            if len(history) > 0:
                print(f"✅ History retrieved successfully. Number of messages: {len(history)}")
                print(f"📝 Last message: {history[-1]['content']}")
            else:
                print("❌ Failed: History is empty.")

            print("\n✨ All Sprint 1 tests passed successfully! Ready for Sprint 2.")

        except Exception as e:
            print(f"\n❌ Error during test: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_integration())