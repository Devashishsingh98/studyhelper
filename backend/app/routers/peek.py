import json
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings

router = APIRouter(prefix="/peek", tags=["peek"])


class PeekRequest(BaseModel):
    topic: str
    parent_term: str = ""  # context: the term currently open in SidePanel


@router.post("/")
async def peek_topic(req: PeekRequest):
    """
    Lightweight non-streaming call for curiosity chain hover tooltips.
    Returns a 1-liner + single exam fact. No SSE — instant JSON response.
    """
    prompt = f"""You are an exam-context explainer.
Topic: "{req.topic}" (related to: "{req.parent_term}")

Output STRICTLY as valid JSON:
{{
  "one_liner": "<1 beginner-friendly sentence>",
  "quick_fact": "<1 single most exam-important fact about this topic>"
}}
NO markdown. JSON only."""

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://studyhelper.app",
        "X-Title": "StudyHelper-Peek",
    }
    payload = {
        "model": settings.FAST_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "max_tokens": 200,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            # Strip markdown fences if present
            if content.strip().startswith("```"):
                lines = content.strip().splitlines()
                content = "\n".join(lines[1:-1]).strip()
            return json.loads(content)
    except Exception as e:
        return {"one_liner": req.topic, "quick_fact": f"Error: {str(e)[:80]}"}
