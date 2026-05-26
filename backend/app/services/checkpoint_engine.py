import json
import httpx
from app.config import settings

# ── SR Intervals ──────────────────────────────────────────────────────────────
SR_DAYS = {"easy": 7, "shaky": 3, "hard": 1}

# ── Adaptive Trigger ──────────────────────────────────────────────────────────

def should_trigger(pages_read: int, highlights_count: int, page_interval: int = 10) -> bool:
    density_trigger = highlights_count >= 8   # high-activity page burst
    page_trigger = pages_read >= page_interval
    return page_trigger or density_trigger


def select_question_type(highlights_count: int, pages_read: int) -> str:
    """Choose the most appropriate question style based on session context."""
    if highlights_count >= 8:
        return "spot_lie"        # high density → precision test
    elif highlights_count >= 4:
        return "connect_dots"    # medium → relational reasoning
    else:
        return "cause_effect"    # low → causal understanding


# ── Prompt Templates ──────────────────────────────────────────────────────────

def _build_checkpoint_prompt(terms: list[str], question_type: str, exam: str = "UPSC") -> str:
    term_list = ", ".join(f'"{t}"' for t in terms[:8])   # cap to 8 terms

    base = f"""You are a competitive exam coach for {exam}.
The student just read 10 pages and highlighted these concepts: [{term_list}].
"""

    if question_type == "connect_dots":
        schema = """{
  "type": "connect_dots",
  "question": "<A 'how does X connect to Y?' question using 2-3 of the terms>",
  "hint": "<one vague directional clue, max 10 words>",
  "reveal": "<the full narrative explanation, 2-3 sentences, exam-tone>",
  "terms_tested": ["<term1>", "<term2>"]
}"""
    elif question_type == "cause_effect":
        schema = """{
  "type": "cause_effect",
  "question": "<A 'what caused X / what was the consequence of Y?' question>",
  "hint": "<one vague directional clue, max 10 words>",
  "reveal": "<clear cause + 2 exam-relevant effects, 2-3 sentences>",
  "terms_tested": ["<term1>"]
}"""
    else:  # spot_lie
        schema = """{
  "type": "spot_lie",
  "question": "One of these 3 statements is FALSE. Which one?",
  "options": [
    "<true statement about a term>",
    "<true statement about another term>",
    "<deliberately false statement — plausible but wrong>"
  ],
  "answer_index": <0, 1, or 2>,
  "reveal": "<why the false one is wrong + what the correct fact is, 2 sentences>",
  "terms_tested": ["<term1>", "<term2>", "<term3>"]
}"""

    return base + f"""
Output STRICTLY valid JSON matching this schema:
{schema}

Rules:
- question must be answerable from the highlighted terms only
- reveal must be exam-relevant, not generic
- NO markdown fences, JSON only"""


# ── AI Call (non-streaming, fast) ─────────────────────────────────────────────

async def generate_checkpoint_question(
    terms: list[str],
    question_type: str,
    exam: str = "UPSC",
) -> dict:
    """Call fast model non-streaming and return parsed JSON question."""
    # Fallback: if no terms collected (e.g. scanned PDF), use common exam topics
    if not terms:
        terms = ["Preamble", "Directive Principles", "Fundamental Rights",
                 "Indus Valley Civilisation", "Constitutional Amendments"]
        question_type = "spot_lie"   # works best with generic terms
    prompt = _build_checkpoint_prompt(terms, question_type, exam)
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://studyhelper.app",
        "X-Title": "StudyHelper-Checkpoint",
    }
    payload = {
        "model": settings.FAST_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "max_tokens": 512,
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{settings.OPENROUTER_BASE_URL}/chat/completions",
                headers=headers,
                json=payload,
            )
            res.raise_for_status()
            content = res.json()["choices"][0]["message"]["content"]
            if content.strip().startswith("```"):
                lines = content.strip().splitlines()
                content = "\n".join(lines[1:-1]).strip()
            return json.loads(content)
    except Exception as e:
        return _fallback_question(terms, question_type, str(e))


def _fallback_question(terms: list[str], qtype: str, err: str) -> dict:
    t = terms[0] if terms else "this topic"
    if qtype == "spot_lie":
        return {
            "type": "spot_lie",
            "question": "One of these 3 statements is FALSE. Which one?",
            "options": [
                f"{t} is a key UPSC topic.",
                f"{t} has appeared in mains multiple times.",
                f"{t} was introduced in the 2026 syllabus.",  # false
            ],
            "answer_index": 2,
            "reveal": f"'{t}' is not a new addition. It has long been part of the syllabus.",
            "terms_tested": terms[:3],
            "_error": err,
        }
    return {
        "type": qtype,
        "question": f"How does '{t}' connect to what you've read so far?",
        "hint": "Think about its historical or constitutional significance.",
        "reveal": f"'{t}' is significant because it represents a foundational concept in its domain.",
        "terms_tested": terms[:2],
        "_error": err,
    }
