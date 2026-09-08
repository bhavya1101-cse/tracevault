import os
import uuid
import hashlib
from fastapi.responses import StreamingResponse
from app.reports.generator import generate_report_pdf
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Body
from pydantic import BaseModel
from app.models import Evidence, HeaderAnalysis, GeoHop, URLReputation
from app.ai.analyzer import analyze_log, generate_recommendations
from app.ai.embeddings import add_to_vector_store, search_similar
from app.email.reputation import check_urls_in_email

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

EVIDENCE_DB: list[Evidence] = []

# Absolute path anchored to this file's location, not the process's current
# working directory. A relative "uploads" resolved differently depending on
# whether uvicorn was launched from backend/ (Render) or backend/app/
# (local) - this file lives at backend/app/routes/evidence.py, so three
# dirname() calls up gets back to backend/.
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(_BACKEND_DIR, "uploads")

ALLOWED_EXTENSIONS = {".log", ".txt", ".csv", ".json", ".eml"}


class PasteHeadersRequest(BaseModel):
    headers_text: str
    filename: str = "pasted_headers.eml"


class CaseHeadersRequest(BaseModel):
    headers_text: str


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _get_owned_evidence(evidence_id: str, x_user_id: str) -> Evidence:
    """Looks up evidence by ID and confirms it belongs to the requesting user.
    404 either way (not found, or found-but-someone-else's) so we don't leak
    which evidence IDs exist to users who don't own them."""
    evidence = next(
        (e for e in EVIDENCE_DB if e.id == evidence_id and e.user_id == x_user_id),
        None,
    )
    if evidence is None:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return evidence


@router.post("/upload", response_model=Evidence)
async def upload_evidence(
    file: UploadFile = File(...),
    source: str = "manual_upload",
    x_user_id: str = Header(...),
):
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
        user_id=x_user_id,
    )
    EVIDENCE_DB.append(evidence)
    return evidence


@router.post("/paste-headers", response_model=Evidence)
async def paste_headers(payload: PasteHeadersRequest, x_user_id: str = Header(...)):
    """Accepts raw pasted email headers (no file upload needed), saves them
    as a .eml on disk for hashing/integrity, then runs the same analysis
    pipeline as an uploaded .eml file. This existed before the v2 per-user
    rewrite and was dropped by accident - EvidenceTable's "Paste Headers"
    mode still calls it, so without this the whole paste flow 404s."""
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
        user_id=x_user_id,
    )
    EVIDENCE_DB.append(evidence)

    _run_analysis(evidence)
    return evidence


@router.get("/search")
def search_evidence(q: str, x_user_id: str = Header(...)):
    results = search_similar(q)
    matched_ids = results.get("ids", [[]])[0]
    matched = [e for e in EVIDENCE_DB if e.id in matched_ids and e.user_id == x_user_id]
    return matched


@router.get("", response_model=list[Evidence])
def list_evidence(x_user_id: str = Header(...)):
    """Returns only THIS user's evidence."""
    return [e for e in EVIDENCE_DB if e.user_id == x_user_id]


@router.get("/{evidence_id}/verify")
def verify_evidence(evidence_id: str, x_user_id: str = Header(...)):
    evidence = _get_owned_evidence(evidence_id, x_user_id)

    saved_filename = f"{evidence.id}_{evidence.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file missing from disk")

    with open(file_path, "rb") as f:
        current_hash = compute_sha256(f.read())

    return {
        "evidence_id": evidence.id,
        "filename": evidence.filename,
        "original_hash": evidence.hash_value,
        "current_hash": current_hash,
        "verified": current_hash == evidence.hash_value,
    }


def _run_analysis(evidence: Evidence) -> Evidence:
    """Shared analysis logic used by the single-item, bulk, and paste-headers endpoints."""
    saved_filename = f"{evidence.id}_{evidence.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Original file missing from disk")

    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    header_analysis = None
    geo_trace = []
    url_reputations = []

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
        # Wrapped in GeoHop(...) - geolocate_ip() returns a plain dict, and
        # AIAnalysis.geo_trace is typed list[GeoHop]. Assigning raw dicts
        # doesn't get validated into GeoHop instances, so anything doing
        # attribute access later (reports/generator.py: h.city, h.country)
        # would crash with AttributeError.
        geo_trace = [GeoHop(**geolocate_ip(ip)) for ip in ips]

        url_reputations = [
            URLReputation(**r) for r in check_urls_in_email(parsed["body"])
        ]

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
    analysis.url_reputations = url_reputations

    evidence.ai_analysis = analysis
    evidence.status = "analyzed"

    add_to_vector_store(evidence.id, evidence.filename, log_content)
    return evidence


@router.post("/{evidence_id}/headers")
def add_headers_to_case(
    evidence_id: str,
    payload: CaseHeadersRequest,
    x_user_id: str = Header(...),
):
    """Attaches raw email headers to an existing case - mainly for cases
    created by the TraceMail extension, which can't see headers on the
    rendered Gmail page. This is what your roadmap's 'Full header
    investigation' button should call once built."""
    evidence = _get_owned_evidence(evidence_id, x_user_id)

    if not payload.headers_text.strip():
        raise HTTPException(status_code=400, detail="No email headers were provided.")

    if not evidence.filename.endswith(".eml"):
        evidence.filename = f"{evidence.filename}.eml"

    file_path = os.path.join(UPLOAD_DIR, f"{evidence.id}_{evidence.filename}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    contents = payload.headers_text.encode("utf-8")
    with open(file_path, "wb") as f:
        f.write(contents)
    evidence.hash_value = compute_sha256(contents)

    return _run_analysis(evidence)


@router.post("/{evidence_id}/analyze")
def analyze_evidence(evidence_id: str, x_user_id: str = Header(...)):
    evidence = _get_owned_evidence(evidence_id, x_user_id)
    return _run_analysis(evidence)


@router.post("/bulk-analyze")
def bulk_analyze_evidence(
    evidence_ids: list[str] = Body(...),
    x_user_id: str = Header(...),
):
    """Analyzes multiple evidence items in one call - for 'select all,
    investigate at once'. Each item is processed independently so one
    failure doesn't block the rest.
    NOTE: needed Body(...) here - a bare list[str] param makes FastAPI
    expect query params (?evidence_ids=a&evidence_ids=b), not the JSON
    array the frontend actually sends, which is why this was 422'ing."""
    results = []
    for evidence_id in evidence_ids:
        try:
            evidence = _get_owned_evidence(evidence_id, x_user_id)
            _run_analysis(evidence)
            results.append({"evidence_id": evidence_id, "status": "analyzed"})
        except HTTPException as e:
            results.append({"evidence_id": evidence_id, "status": "error", "detail": e.detail})
        except Exception as e:
            results.append({"evidence_id": evidence_id, "status": "error", "detail": str(e)})
    return {"results": results}


@router.get("/{evidence_id}/report")
def get_report(evidence_id: str, x_user_id: str = Header(...)):
    evidence = _get_owned_evidence(evidence_id, x_user_id)
    pdf_buffer = generate_report_pdf(evidence)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{evidence.filename}.pdf"},
    )


@router.post("/{evidence_id}/recommend")
def recommend_evidence(evidence_id: str, x_user_id: str = Header(...)):
    evidence = _get_owned_evidence(evidence_id, x_user_id)
    if evidence.ai_analysis is None:
        raise HTTPException(status_code=400, detail="Evidence must be analyzed before generating recommendations")
    evidence.recommendations = generate_recommendations(evidence.ai_analysis)
    return evidence