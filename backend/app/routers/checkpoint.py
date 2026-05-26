from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.checkpoint_engine import (
    should_trigger,
    select_question_type,
    generate_checkpoint_question,
)

router = APIRouter(prefix="/checkpoint", tags=["checkpoint"])


class CheckpointRequest(BaseModel):
    terms: list[str]                     # highlight terms since last checkpoint
    pages_read: int                      # pages since last checkpoint
    page_interval: int = 10
    question_type: str = "auto"          # auto | connect_dots | cause_effect | spot_lie
    exam: str = "UPSC"


class TriggerCheckRequest(BaseModel):
    pages_read: int
    highlights_count: int
    page_interval: int = 10


@router.post("/should-trigger")
async def check_trigger(req: TriggerCheckRequest):
    triggered = should_trigger(req.pages_read, req.highlights_count, req.page_interval)
    qtype = select_question_type(req.highlights_count, req.pages_read) if triggered else None
    return {"triggered": triggered, "suggested_type": qtype}


@router.post("/generate")
async def generate(req: CheckpointRequest):
    qtype = req.question_type
    if qtype == "auto":
        qtype = select_question_type(len(req.terms), req.pages_read)
    question = await generate_checkpoint_question(req.terms, qtype, req.exam)
    return {"question_type": qtype, **question}
