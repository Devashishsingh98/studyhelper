from pydantic import BaseModel
from typing import Optional


class SaveConceptRequest(BaseModel):
    term: str
    one_liner: Optional[str] = None
    exam_trap: Optional[str] = None
    static_fact: Optional[str] = None
    page_number: int = 1
    user_id: Optional[str] = None
    difficulty: str = "shaky"


class SaveConceptResponse(BaseModel):
    id: str
    term: str
    one_liner: Optional[str]
    exam_trap: Optional[str]
    static_fact: Optional[str]
    page_number: int
    difficulty: str
    created_at: str

    class Config:
        from_attributes = True
