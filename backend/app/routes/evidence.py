import os
import uuid
import hashlib
from fastapi.responses import StreamingResponse
from app.reports.generator import generate_report_pdf
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.models import Evidence, HeaderAnalysis, GeoHop
from app.ai.analyzer import analyze_log, generate_recommendations
from app.ai.embeddings import add_to_vector_store, search_similar

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

EVIDENCE_DB: list[Evidence] = []

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".log", ".txt", ".csv", ".json", ".eml"}


class PasteHeadersRequest(BaseModel):
    headers_text: str
    filename: str = "pasted_headers.eml"
class ExtensionEmailRequest(BaseModel):
    subject: str = ""
    sender: str = ""
    sender_email: str = ""
    body: str = ""
    source_url: str = ""

def compute_sha256(data: bytes) -> str:
    """Computes the SHA-256 hash of raw bytes and returns it as a hex string."""
    return hashlib.sha256(data).hexdigest()


def _run_analysis(evidence: Evidence, raw_bytes: bytes) -> Evidence:
    """Shared analysis pipeline: header parsing, geo trace, and AI analysis.
    Used by both file uploads and pasted-headers submissions so both paths
    stay in sync."""
    header_analysis = None
    geo_trace = []

    if evidence.filename.endswith(".eml"):
        from app.email.parser import (
            parse_eml,
            parse_message_auth_results,
            audit_sender_domain_policy,
        )
        from app.email.geolocation import extract_ips, geolocate_ip

        parsed = parse_eml(raw_bytes)
        auth = parse_message_auth_results(parsed["auth_results_header"])
        domain_policy = audit_sender_domain_policy(parsed["from_address"])

        header_analysis = HeaderAnalysis(
            spf=auth["spf"],
            dkim=auth["dkim"],
            dmarc=auth["dmarc"],
            from_address=parsed["from_address"],
            display_name=parsed["display_name"],
            reply_to=parsed["reply_to"] or None,
        )

        ips = extract_ips(parsed["received_chain"])
        geo_trace = [GeoHop(**geolocate_ip(ip)) for ip in ips]

        log_content = (
            f"Email From: {parsed['from_address']} (display name: {parsed['display_name']})\n"
            f"Reply-To: {parsed['reply_to']}\n"
            f"Subject: {parsed['subject']}\n"
            f"Auth results: SPF={auth['spf']}, DKIM={auth['dkim']}, DMARC={auth['dmarc']}\n"
            f"Sender domain policy: {domain_policy}\n\n"
            f"Body:\n{parsed['body']}"
        )
    else:
        log_content = raw_bytes.decode(errors="ignore")

    analysis = analyze_log(log_content)
    analysis.header_analysis = header_analysis
    analysis.geo_trace = geo_trace

    evidence.ai_analysis = analysis
    evidence.status = "analyzed"

    add_to_vector_store(evidence.id, evidence.filename, log_content)
    return evidence


@router.post("/upload", response_model=Evidence)
async def upload_evidence(file: UploadFile = File(...), source: str = "manual_upload"):
    """Accepts a log or email file, saves it to disk, hashes it, and records it as evidence."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {ALLOWED_EXTENSIONS}",
        )

    evidence_id = str(uuid.uuid4())
    saved_filename = f"{evidence_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    file_hash = compute_sha256(contents)

    evidence = Evidence(
        id=evidence_id,
        filename=file.filename,
        source=source,
        event_type="email" if ext == ".eml" else "log_file",
        status="hashed",
        uploaded_at=datetime.utcnow(),
        hash_value=file_hash,
        hash_algorithm="SHA-256",
    )
    EVIDENCE_DB.append(evidence)
    return evidence
@router.post("/extension-preview")
def extension_preview(payload: ExtensionEmailRequest):
    """
    Receives only the email currently selected by the user
    through the TraceMail browser extension.

    This endpoint is for quick analysis.
    Full forensic header analysis is handled separately.
    """

    if not any([
        payload.subject.strip(),
        payload.sender.strip(),
        payload.sender_email.strip(),
        payload.body.strip()
    ]):
        raise HTTPException(
            status_code=400,
            detail="No email content was provided."
        )

    return {
        "success": True,
        "message": "TraceMail email received successfully.",
        "email": {
            "subject": payload.subject,
            "sender": payload.sender,
            "sender_email": payload.sender_email
        }
    }

@router.post("/paste-headers", response_model=Evidence)
async def paste_headers(payload: PasteHeadersRequest):
    """Accepts raw pasted email headers (no file upload needed), saves them
    as a .eml on disk for hashing/integrity purposes, then runs the same
    analysis pipeline as an uploaded .eml file."""
    if not payload.headers_text.strip():
        raise HTTPException(status_code=400, detail="Headers text cannot be empty")

    filename = payload.filename if payload.filename.endswith(".eml") else f"{payload.filename}.eml"

    evidence_id = str(uuid.uuid4())
    saved_filename = f"{evidence_id}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    contents = payload.headers_text.encode("utf-8")
    with open(file_path, "wb") as f:
        f.write(contents)

    file_hash = compute_sha256(contents)

    evidence = Evidence(
        id=evidence_id,
        filename=filename,
        source="pasted_headers",
        event_type="email",
        status="hashed",
        uploaded_at=datetime.utcnow(),
        hash_value=file_hash,
        hash_algorithm="SHA-256",
    )
    EVIDENCE_DB.append(evidence)

    _run_analysis(evidence, contents)
    return evidence


# NOTE: /search must come BEFORE /{evidence_id}/... routes so it doesn't get
# accidentally matched as an evidence_id.
@router.get("/search")
def search_evidence(q: str):
    """Semantic search across all analyzed evidence."""
    results = search_similar(q)
    matched_ids = results.get("ids", [[]])[0]
    matched = [e for e in EVIDENCE_DB if e.id in matched_ids]
    return matched


@router.get("", response_model=list[Evidence])
def list_evidence():
    """Returns all evidence records collected so far."""
    return EVIDENCE_DB


@router.get("/{evidence_id}/verify")
def verify_evidence(evidence_id: str):
    """Re-reads the file from disk, re-hashes it, and compares to the stored hash."""
    evidence = next((e for e in EVIDENCE_DB if e.id == evidence_id), None)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    saved_filename = f"{evidence.id}_{evidence.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file missing from disk")

    with open(file_path, "rb") as f:
        current_hash = compute_sha256(f.read())

    verified = current_hash == evidence.hash_value

    return {
        "evidence_id": evidence.id,
        "filename": evidence.filename,
        "original_hash": evidence.hash_value,
        "current_hash": current_hash,
        "verified": verified,
    }


@router.post("/{evidence_id}/analyze")
def analyze_evidence(evidence_id: str):
    """Reads the evidence file, runs AI analysis (+ email-specific parsing
    when applicable), embeds it, and stores the result."""
    evidence = next((e for e in EVIDENCE_DB if e.id == evidence_id), None)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    saved_filename = f"{evidence.id}_{evidence.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file missing from disk")

    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    return _run_analysis(evidence, raw_bytes)


@router.get("/{evidence_id}/report")
def get_report(evidence_id: str):
    """Generates and returns a PDF investigation report for one evidence item."""
    evidence = next((e for e in EVIDENCE_DB if e.id == evidence_id), None)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")

    pdf_buffer = generate_report_pdf(evidence)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{evidence.filename}.pdf"},
    )


@router.post("/{evidence_id}/recommend")
def recommend_evidence(evidence_id: str):
    """Generates AI recommendations for an already-analyzed evidence item."""
    evidence = next((e for e in EVIDENCE_DB if e.id == evidence_id), None)
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    if evidence.ai_analysis is None:
        raise HTTPException(status_code=400, detail="Evidence must be analyzed before generating recommendations")

    evidence.recommendations = generate_recommendations(evidence.ai_analysis)
    return evidence