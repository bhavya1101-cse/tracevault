from pydantic import BaseModel
from datetime import datetime

class Evidence(BaseModel):
    """Represents one uploaded piece of forensic evidence."""
    id: str
    filename: str
    source: str          # e.g. "syslog", "apache", "windows_event_log", "manual_upload"
    event_type: str       # e.g. "log_file" — will get more specific in later modules
    status: str           # "uploaded" -> later "hashed" -> "analyzed"
    uploaded_at: datetime
    hash_value: str | None = None
    hash_algorithm: str = "SHA-256"