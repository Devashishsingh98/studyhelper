import asyncio
import httpx
from app.config import settings
from app.services.ai_orchestrator import _openrouter_stream

async def test():
    try:
        async for chunk in _openrouter_stream("google/gemini-1.5-flash", "Respond with a simple JSON object: {\"one_liner\": \"Hello\"}"):
            print(f"CHUNK: {chunk}")
    except httpx.HTTPStatusError as e:
        print(f"ERROR: {e}")
        try:
            print(f"RESPONSE TEXT: {e.response.text}")
        except Exception as e2:
            print(f"Could not read response: {e2}")
    except Exception as e:
        print(f"ERROR: {e}")

asyncio.run(test())
