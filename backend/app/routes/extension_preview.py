from datetime import datetime
import hashlib
import uuid

from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.models import Evidence, URLReputation
from app.ai.analyzer import analyze_log
from app.email.reputation import check_urls_in_email
from app.routes.evidence import EVIDENCE_DB  # reuse the same in-memory store

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


class ExtensionEmailPreview(BaseModel):
    subject: str
    sender: str
    sender_email: str
    body: str
    source_url: str


@router.post("/extension-preview")
def analyze_extension_preview(payload: ExtensionEmailPreview, x_user_id: str = Header(...)):
    """
    Analyzes an email scraped directly from the Gmail page by TraceMail.
    LIMITATION: Gmail's rendered page doesn't expose raw headers (SPF/
    DKIM/DMARC, Received chain, IPs) - those only appear in "Show
    original". So extension-detected cases get content/sender/URL-based
    analysis only, no header_analysis or geo_trace - expected, not a bug.
    Call POST /api/evidence/{id}/headers afterward for full forensics.
    """
    log_content = (
        f"Email Subject: {payload.subject}\n"
        f"Sender display name: {payload.sender}\n"
        f"Sender address: {payload.sender_email}\n\n"
        f"Body:\n{payload.body[:3000]}"
    )

    analysis = analyze_log(log_content)
    analysis.url_reputations = [
        URLReputation(**r) for r in check_urls_in_email(payload.body)
    ]

    evidence_id = str(uuid.uuid4())
    content_hash = hashlib.sha256(log_content.encode()).hexdigest()

    evidence = Evidence(
        id=evidence_id,
        filename=f"gmail_{payload.subject[:40] or 'untitled'}.preview",
        source="tracemail_extension",
        event_type="email_preview",
        status="analyzed",
        uploaded_at=datetime.utcnow(),
        hash_value=content_hash,
        hash_algorithm="SHA-256",
        ai_analysis=analysis,
        user_id=x_user_id,
    )
    EVIDENCE_DB.append(evidence)

    return {
        "analysis": analysis.model_dump(),
        "case": {"evidence_id": evidence_id},
    }