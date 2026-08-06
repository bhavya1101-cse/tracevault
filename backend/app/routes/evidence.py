import os
import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models import Evidence

router = APIRouter(prefix="/api/evidence", tags=["evidence"])

# In-memory storage for now — replaced by a real DB in a later module
EVIDENCE_DB: list[Evidence] = []

UPLOAD_DIR = "uploads"
ALLOWED_EXTENSIONS = {".log", ".txt", ".csv", ".json"}


@router.post("/upload", response_model=Evidence)
async def upload_evidence(file: UploadFile = File(...), source: str = "manual_upload"):
    """Accepts a log file, saves it to disk, and records it as evidence."""

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

    evidence = Evidence(
        id=evidence_id,
        filename=file.filename,
        source=source,
        event_type="log_file",
        status="uploaded",
        uploaded_at=datetime.utcnow(),
    )
    EVIDENCE_DB.append(evidence)
    return evidence


@router.get("", response_model=list[Evidence])
def list_evidence():
    """Returns all evidence records collected so far."""
    return EVIDENCE_DB