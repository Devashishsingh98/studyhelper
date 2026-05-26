import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, Text, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


def _now():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    exam_profile: Mapped[dict] = mapped_column(JSON, default=lambda: {"exam": "UPSC", "stage": "prelims", "weak_subjects": []})
    checkpoint_page_interval: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    sessions: Mapped[list["ReadingSession"]] = relationship(back_populates="user")
    concepts: Mapped[list["SavedConcept"]] = relationship(back_populates="user")


class ReadingSession(Base):
    __tablename__ = "reading_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    pdf_filename: Mapped[str] = mapped_column(String)
    pdf_hash: Mapped[str] = mapped_column(String, nullable=True)
    last_page: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_active: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    user: Mapped["User"] = relationship(back_populates="sessions")
    highlights: Mapped[list["Highlight"]] = relationship(back_populates="session")
    checkpoints: Mapped[list["Checkpoint"]] = relationship(back_populates="session")


class Highlight(Base):
    __tablename__ = "highlights"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("reading_sessions.id"), nullable=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    term: Mapped[str] = mapped_column(String(500))
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    context_snippet: Mapped[str] = mapped_column(Text, nullable=True)
    ai_response_cache: Mapped[dict] = mapped_column(JSON, nullable=True)
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped["ReadingSession"] = relationship(back_populates="highlights")


class SavedConcept(Base):
    __tablename__ = "saved_concepts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=True)
    term: Mapped[str] = mapped_column(String(500))
    one_liner: Mapped[str] = mapped_column(Text, nullable=True)
    exam_trap: Mapped[str] = mapped_column(Text, nullable=True)
    static_fact: Mapped[str] = mapped_column(Text, nullable=True)
    page_number: Mapped[int] = mapped_column(Integer, default=1)
    difficulty: Mapped[str] = mapped_column(String(10), default="shaky")  # easy | shaky | hard
    next_review_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    review_count: Mapped[int] = mapped_column(Integer, default=0)
    last_reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="concepts")


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(String, ForeignKey("reading_sessions.id"), nullable=True)
    page_triggered_at: Mapped[int] = mapped_column(Integer)
    highlight_count: Mapped[int] = mapped_column(Integer, default=0)
    question_type: Mapped[str] = mapped_column(String(20))  # connect_dots | cause_effect | spot_lie
    question_json: Mapped[dict] = mapped_column(JSON, nullable=True)
    user_answered: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped["ReadingSession"] = relationship(back_populates="checkpoints")
