import json
import traceback
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.highlight import HighlightRequest
from app.services.ai_orchestrator import stream_fast_layer, stream_deep_layer, stream_analogy_layer

router = APIRouter(prefix="/highlight", tags=["highlight"])


# ---------------------------------------------------------------------------
# SSE event helpers
# ---------------------------------------------------------------------------

def sse_event(event: str, data: str) -> str:
    """Format a Server-Sent Event frame.
    CRITICAL: data must be a single line — newlines break SSE framing.
    """
    clean = data.replace("\n", " ").replace("\r", "")
    return f"event: {event}\ndata: {clean}\n\n"


def strip_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers if model ignores json_object mode."""
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        return text[start:end+1]
    return text


def unwrap_parsed(parsed) -> dict:
    """If the model returned [{...}] (array), extract the first element."""
    if isinstance(parsed, list) and len(parsed) > 0:
        return parsed[0]
    return parsed


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/fast")
async def highlight_fast(req: HighlightRequest):
    async def generator():
        buffer = ""
        try:
            async for chunk in stream_fast_layer(req):
                buffer += chunk
                yield sse_event("fast_chunk", chunk)

            parsed = unwrap_parsed(json.loads(strip_fences(buffer)))
            yield sse_event("fast_done", json.dumps(parsed))
        except json.JSONDecodeError:
            yield sse_event("fast_done", json.dumps({"raw": buffer}))
        except Exception as e:
            traceback.print_exc()
            yield sse_event("fast_done", json.dumps({"error": str(e), "raw": buffer}))

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/deep")
async def highlight_deep(req: HighlightRequest):
    async def generator():
        buffer = ""
        try:
            async for chunk in stream_deep_layer(req):
                buffer += chunk
                yield sse_event("deep_chunk", chunk)

            parsed = unwrap_parsed(json.loads(strip_fences(buffer)))
            yield sse_event("deep_done", json.dumps(parsed))
        except json.JSONDecodeError:
            yield sse_event("deep_done", json.dumps({"raw": buffer}))
        except Exception as e:
            traceback.print_exc()
            yield sse_event("deep_done", json.dumps({"error": str(e), "raw": buffer}))

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/analogy")
async def highlight_analogy(req: HighlightRequest):
    async def generator():
        try:
            async for chunk in stream_analogy_layer(req.term):
                yield sse_event("analogy_chunk", chunk)
            yield sse_event("analogy_done", "")
        except Exception as e:
            traceback.print_exc()
            yield sse_event("analogy_done", json.dumps({"error": str(e)}))

    return StreamingResponse(
        generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/health")
async def health():
    from app.config import settings
    return {"status": "ok", "mock_mode": settings.USE_MOCK}

