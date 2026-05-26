import json
import httpx
from typing import AsyncGenerator
from app.models.highlight import HighlightRequest
from app.services.prompt_builder import (
    build_fast_prompt,
    build_deep_prompt,
    build_analogy_prompt,
    build_checkpoint_prompt,
)
from app.config import settings


# ---------------------------------------------------------------------------
# Core OpenRouter streaming helper
# ---------------------------------------------------------------------------

async def _openrouter_stream(model: str, prompt: str, is_json: bool = True) -> AsyncGenerator[str, None]:
    """Stream tokens from OpenRouter (OpenAI-compatible SSE)."""
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://studyhelper.app",
        "X-Title": "StudyHelper",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "max_tokens": 1024,
        "temperature": 0.3,  # low temp = factual, consistent output
    }
    if is_json:
        payload["response_format"] = {"type": "json_object"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            f"{settings.OPENROUTER_BASE_URL}/chat/completions",
            headers=headers,
            json=payload,
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


# ---------------------------------------------------------------------------
# Mock fallbacks (USE_MOCK=True in .env)
# ---------------------------------------------------------------------------

async def _mock_fast_stream(req: HighlightRequest) -> AsyncGenerator[str, None]:
    import asyncio
    payload = {
        "one_liner": f"[MOCK] '{req.term}' is a key concept in {req.exam_profile.get('exam','UPSC')} exams — {req.context_snippet[:60]}...",
        "examiner_trap": f"[MOCK] Examiners confuse '{req.term}' with a similar-sounding term or misplace its period/location."
    }
    chunk = json.dumps(payload)
    for char in chunk:
        yield char
        await asyncio.sleep(0.005)


async def _mock_deep_stream(req: HighlightRequest) -> AsyncGenerator[str, None]:
    import asyncio
    await asyncio.sleep(0.5)
    payload = {
        "static_fact": f"[MOCK] '{req.term}' has significant historical/constitutional roots relevant to the PDF context.",
        "current_affair": f"[MOCK] Recent PIB/RBI mention of '{req.term}' in 2024–25 policy discussions.",
        "why_examiner_asks": f"[MOCK] Tests causal understanding, not just definition recall.",
        "curiosity_chain": [f"{req.term} Origin", f"{req.term} Policy", f"{req.term} Global"],
        "visual_type": "ascii",
        "visual_content": f"  [{req.term}]\n  |\n  [Past] --> [Present] --> [Future]",
        "source_confidence": "high",
        "contradiction_flag": None
    }
    chunk = json.dumps(payload)
    for char in chunk:
        yield char
        await asyncio.sleep(0.005)


async def _mock_analogy_stream(term: str) -> AsyncGenerator[str, None]:
    import asyncio
    text = f"Think of it like this: '{term}' works just like a relay race — each runner (historical event) passes the baton to the next, and the finish line is today's policy impact."
    for word in text.split():
        yield word + " "
        await asyncio.sleep(0.03)


# ---------------------------------------------------------------------------
# Public orchestrator functions
# ---------------------------------------------------------------------------

async def stream_fast_layer(req: HighlightRequest) -> AsyncGenerator[str, None]:
    if settings.USE_MOCK:
        async for chunk in _mock_fast_stream(req):
            yield chunk
    else:
        async for chunk in _openrouter_stream(settings.FAST_MODEL, build_fast_prompt(req)):
            yield chunk


async def stream_deep_layer(req: HighlightRequest) -> AsyncGenerator[str, None]:
    if settings.USE_MOCK:
        async for chunk in _mock_deep_stream(req):
            yield chunk
    else:
        async for chunk in _openrouter_stream(settings.DEEP_MODEL, build_deep_prompt(req)):
            yield chunk


async def stream_analogy_layer(term: str) -> AsyncGenerator[str, None]:
    if settings.USE_MOCK:
        async for chunk in _mock_analogy_stream(term):
            yield chunk
    else:
        # Build a minimal HighlightRequest-like prompt inline
        prompt = build_analogy_prompt(term)
        async for chunk in _openrouter_stream(settings.FAST_MODEL, prompt):
            yield chunk


async def stream_checkpoint(terms: list[str], question_type: str) -> AsyncGenerator[str, None]:
    prompt = build_checkpoint_prompt(terms, question_type)
    async for chunk in _openrouter_stream(settings.DEEP_MODEL, prompt):
        yield chunk
