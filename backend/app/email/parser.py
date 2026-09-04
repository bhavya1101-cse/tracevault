import re
import email
from email import policy

# checkdmarc audits a DOMAIN's published policy (DNS-level).
# It does NOT validate whether a specific received message passed/failed.
from checkdmarc import check_domains


def _extract_body(msg) -> str:
    """
    Pulls plain-text body content out of a parsed email.Message, robustly.

    msg.get_body() relies on the message having clean, well-formed MIME
    structure (proper Content-Type, multipart boundaries, etc). Hand-crafted
    or simplified test .eml files often don't have that, and get_body()
    silently returns None in those cases rather than raising an error - so
    we fall back to reading the raw payload directly instead of crashing.
    """
    body_part = msg.get_body(preferencelist=("plain", "html"))
    if body_part is not None:
        try:
            return body_part.get_content()
        except Exception:
            pass

    # Fallback for simple/non-multipart or malformed messages.
    try:
        payload = msg.get_payload(decode=True)
        if payload:
            return payload.decode(errors="ignore")
    except Exception:
        pass

    # Last resort: whatever get_payload gives us as-is (e.g. already a string).
    fallback = msg.get_payload()
    return fallback if isinstance(fallback, str) else ""


def parse_eml(raw_bytes: bytes) -> dict:
    """Parses a raw .eml file into headers, auth results, and body text."""
    msg = email.message_from_bytes(raw_bytes, policy=policy.default)
    return {
        "from_address": msg.get("From", ""),
        "display_name": msg.get("From", "").split("<")[0].strip(),
        "reply_to": msg.get("Reply-To", ""),
        "subject": msg.get("Subject", ""),
        "received_chain": msg.get_all("Received", []),
        "auth_results_header": msg.get("Authentication-Results", ""),
        "body": _extract_body(msg),
    }


def parse_message_auth_results(auth_header: str) -> dict:
    """
    Parses the Authentication-Results header (added by the receiving mail
    server) to get PASS/FAIL for THIS specific message. This is the
    message-level signal.
    """
    def find_result(mechanism: str) -> str:
        match = re.search(rf"{mechanism}=(\w+)", auth_header, re.IGNORECASE)
        return match.group(1).capitalize() if match else "None"

    return {
        "spf": find_result("spf"),
        "dkim": find_result("dkim"),
        "dmarc": find_result("dmarc"),
    }


def audit_sender_domain_policy(from_address: str) -> dict:
    """
    Uses checkdmarc to check whether the SENDER'S DOMAIN publishes a valid
    SPF/DMARC policy at all. This is a DOMAIN-level reputation signal,
    separate from whether this message passed auth.
    """
    try:
        domain = from_address.split("@")[-1].strip(">").strip()
        results = check_domains([domain])
        r = results[0] if results else {}
        dmarc_record = r.get("dmarc", {}).get("record")
        spf_record = r.get("spf", {}).get("record")
        dmarc_policy = None
        if dmarc_record:
            match = re.search(r"p=(\w+)", dmarc_record)
            dmarc_policy = match.group(1) if match else None
        return {
            "domain": domain,
            "has_spf_record": bool(spf_record),
            "has_dmarc_record": bool(dmarc_record),
            "dmarc_policy": dmarc_policy,
        }
    except Exception as e:
        return {"domain": None, "has_spf_record": None, "has_dmarc_record": None,
                "dmarc_policy": None, "error": str(e)}