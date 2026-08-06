from pydantic import BaseModel
from datetime import datetime


class AIAnalysis(BaseModel):
    attack_type: str
    severity: str
    confidence_score: float
    threat_summary: str


class Evidence(BaseModel):
    """Represents one uploaded piece of forensic evidence."""
    id: str
    filename: str
    source: str
    event_type: str
    status: str
    uploaded_at: datetime
    hash_value: str | None = None
    hash_algorithm: str = "SHA-256"
    ai_analysis: AIAnalysis | None = None