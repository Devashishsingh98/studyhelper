from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.db.database import get_db
from app.db.models import SavedConcept
from app.models.note import SaveConceptRequest, SaveConceptResponse
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/notes", tags=["notes"])

# SR: 1 day (hard) → 3 days (shaky) → 7 days (easy)
REVIEW_INTERVALS = {"easy": 7, "shaky": 3, "hard": 1}


@router.post("/save", response_model=SaveConceptResponse)
async def save_concept(req: SaveConceptRequest, db: AsyncSession = Depends(get_db)):
    days = REVIEW_INTERVALS.get(req.difficulty, 3)
    concept = SavedConcept(
        term=req.term,
        one_liner=req.one_liner,
        exam_trap=req.exam_trap,
        static_fact=req.static_fact,
        page_number=req.page_number,
        user_id=req.user_id,
        difficulty=req.difficulty,
        next_review_at=datetime.now(timezone.utc) + timedelta(days=days),
    )
    db.add(concept)
    await db.commit()
    await db.refresh(concept)
    return _to_response(concept)


@router.get("/", response_model=list[SaveConceptResponse])
async def list_concepts(user_id: str = "default", db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SavedConcept)
        .where(SavedConcept.user_id == user_id)
        .order_by(SavedConcept.created_at.desc())
        .limit(200)
    )
    return [_to_response(c) for c in result.scalars().all()]


@router.get("/due", response_model=list[SaveConceptResponse])
async def due_for_review(user_id: str = "default", db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(SavedConcept)
        .where(SavedConcept.user_id == user_id)
        .where(SavedConcept.next_review_at <= now)
        .order_by(SavedConcept.next_review_at)
        .limit(20)
    )
    return [_to_response(c) for c in result.scalars().all()]


# ── Spaced Repetition ─────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    difficulty: str   # easy | shaky | hard


class BulkReviewRequest(BaseModel):
    terms: list[str]                 # checkpoint tested these terms
    difficulty: str                  # single rating applied to all
    user_id: str = "default"


@router.patch("/review/{concept_id}")
async def review_concept(concept_id: str, req: ReviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Update SR schedule for one concept after user rates it.
    Interval: easy=+7d, shaky=+3d, hard=+1d.
    Accumulates review count.
    """
    days = REVIEW_INTERVALS.get(req.difficulty, 3)
    now = datetime.now(timezone.utc)
    result = await db.execute(select(SavedConcept).where(SavedConcept.id == concept_id))
    concept = result.scalar_one_or_none()
    if not concept:
        raise HTTPException(404, "Concept not found")

    concept.difficulty = req.difficulty
    concept.next_review_at = now + timedelta(days=days)
    concept.last_reviewed_at = now
    concept.review_count = (concept.review_count or 0) + 1
    await db.commit()
    return {
        "id": concept.id,
        "term": concept.term,
        "difficulty": req.difficulty,
        "next_review_at": concept.next_review_at.isoformat(),
        "review_count": concept.review_count,
    }


@router.post("/review/bulk")
async def bulk_review(req: BulkReviewRequest, db: AsyncSession = Depends(get_db)):
    """
    Called after a checkpoint session: update SR for all tested terms at once.
    Looks up saved concepts by term name. Skips unsaved terms.
    """
    days = REVIEW_INTERVALS.get(req.difficulty, 3)
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(SavedConcept)
        .where(SavedConcept.user_id == req.user_id)
        .where(SavedConcept.term.in_(req.terms))
    )
    concepts = result.scalars().all()

    updated = []
    for c in concepts:
        c.difficulty = req.difficulty
        c.next_review_at = now + timedelta(days=days)
        c.last_reviewed_at = now
        c.review_count = (c.review_count or 0) + 1
        updated.append(c.term)

    await db.commit()
    return {
        "updated_count": len(updated),
        "updated_terms": updated,
        "skipped_terms": [t for t in req.terms if t not in updated],
        "next_review_in_days": days,
    }


@router.delete("/{concept_id}")
async def delete_concept(concept_id: str, db: AsyncSession = Depends(get_db)):
    await db.execute(delete(SavedConcept).where(SavedConcept.id == concept_id))
    await db.commit()
    return {"deleted": concept_id}


# ── Helper ────────────────────────────────────────────────────────────────────

def _to_response(c: SavedConcept) -> SaveConceptResponse:
    return SaveConceptResponse(
        id=c.id, term=c.term, one_liner=c.one_liner, exam_trap=c.exam_trap,
        static_fact=c.static_fact, page_number=c.page_number,
        difficulty=c.difficulty, created_at=c.created_at.isoformat(),
    )
