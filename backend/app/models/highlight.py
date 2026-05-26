from pydantic import BaseModel
from typing import Optional


class HighlightRequest(BaseModel):
    term: str
    context_snippet: Optional[str] = ""  # Surrounding sentence(s) from the PDF, optional
    page_number: Optional[int] = 1        # Optional page number
    session_id: Optional[str] = None
    dimension: Optional[str] = None
    custom_query: Optional[str] = None
    exam_profile: dict = {
        "exam": "UPSC",
        "stage": "prelims",
        "weak_subjects": []
    }


class FastLayerResponse(BaseModel):
    one_liner: str
    examiner_trap: str


class DeepLayerResponse(BaseModel):
    static_fact: str
    current_affair: Optional[str] = None
    why_examiner_asks: str
    curiosity_chain: list[str]
    visual_type: str              # map | timeline | table | ascii | none
    visual_content: Optional[str] = None
    source_confidence: str = "high"  # high | low
    contradiction_flag: Optional[str] = None
