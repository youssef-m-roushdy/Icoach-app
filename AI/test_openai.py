import sys
import asyncio
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from AI.config import get_settings
from openai import AsyncOpenAI

async def main():
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    try:
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "Return json {\"intent\": \"question\", \"domains\": [\"workouts\"], \"confidence\": 0.9}"},
                {"role": "user", "content": "what is the best workouts for begginer like me"}
            ],
            max_completion_tokens=100
        )
        print("SUCCESS:", response)
    except Exception as e:
        print("ERROR:", str(e))

asyncio.run(main())
