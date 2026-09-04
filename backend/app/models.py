from pydantic import BaseModel
from datetime import datetime


class CompromisedAsset(BaseModel):
    asset_type: str
    value: str
    severity: str


class HeaderAnalysis(BaseModel):
    spf: str
    dkim: str
    dmarc: str
    from_address: str
    display_name: str
    reply_to: str | None = None


class GeoHop(BaseModel):
    ip: str
    city: str | None
    country: str | None
    isp: str | None
    confidence: str


class AIAnalysis(BaseModel):
    attack_type: str
    severity: str
    confidence_score: float
    threat_summary: str
    entry_point: str
    attack_vector: str
    mitre_technique: str | None = None
    root_cause_explanation: str
    compromised_assets: list[CompromisedAsset] = []
    header_analysis: HeaderAnalysis | None = None
    geo_trace: list[GeoHop] = []


class Recommendations(BaseModel):
    containment_steps: list[str]
    recovery_steps: list[str]
    future_prevention: list[str]


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
    recommendations: Recommendations | None = None