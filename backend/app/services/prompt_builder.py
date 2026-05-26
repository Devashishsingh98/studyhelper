from app.models.highlight import HighlightRequest


def build_fast_prompt(req: HighlightRequest) -> str:
    return f"""You are an elite exam-context explainer for {req.exam_profile.get('exam', 'UPSC')}, stage: {req.exam_profile.get('stage', 'prelims')}.

Term: "{req.term}"
Context from PDF: "{req.context_snippet}"

Output STRICTLY as valid JSON. Do not output generic dictionary definitions. Provide rigorous, high-density, authoritative exam insights. Use markdown formatting (like **bolding** and *italics*) within the JSON string values.

{{
  "one_liner": "<A highly comprehensive, analytical sentence explaining the term's core significance. Do not use fragments.>",
  "examiner_trap": "<A detailed analytical sentence on exactly how question-setters trick students on this specific topic.>"
}}"""


def build_deep_prompt(req: HighlightRequest) -> str:
    return f"""You are a top-tier mentor for {req.exam_profile.get('exam', 'UPSC')}.

Term: "{req.term}"
PDF context: "{req.context_snippet}"

Output STRICTLY as valid JSON. Provide rigorous, high-density, authoritative exam insights. The 3 bullets must be comprehensive, analytical sentences, not short fragments. Use markdown formatting (like **bolding** and *italics*) within the JSON string values.

{{
  "static_fact": "<A comprehensive, analytical sentence detailing the historical, constitutional, or scientific base fact.>",
  "current_affair": "<A comprehensive, analytical sentence linking to PIB/RBI/recent news — null if absolutely not applicable.>",
  "why_examiner_asks": "<A rigorous analytical sentence explaining the examiner's motivation for testing this concept.>",
  "curiosity_chain": ["<related topic 1>", "<related topic 2>", "<related topic 3>"],
  "visual_type": "<one of: map | timeline | table | ascii | none>",
  "visual_content": "<ASCII diagram, markdown table, or location string — null if none>",
  "source_confidence": "<high or low>",
  "contradiction_flag": "<A detailed sentence noting any NCERT vs current affairs conflict — null if none.>"
}}"""


def build_checkpoint_prompt(terms: list[str], question_type: str) -> str:
    terms_str = ", ".join(terms)
    return f"""You are generating a narrative recall question. The student just read a section highlighting: {terms_str}.

Question type: {question_type}

Rules:
- "spot_lie": 2-sentence story summary with ONE factual error planted. Student must catch it.
- "connect_dots": List 3 concepts. Ask student to narrate the causal/historical link.
- "cause_effect": Ask one "How did X lead to Y?" question spanning the concepts.

Output STRICTLY as valid JSON:
{{
  "question": "<the question text>",
  "correct_answer": "<full correct answer>",
  "lie_planted": "<state the exact lie and what is correct — null if not spot_lie type>"
}}"""


def build_analogy_prompt(term: str) -> str:
    return f"""The student said "I still don't get it" about: "{term}"

Explain using ONLY everyday analogies, simple stories, and cause-effect logic.
Zero jargon. Zero exam pressure. Start with: "Think of it like..."
Keep it under 100 words."""
