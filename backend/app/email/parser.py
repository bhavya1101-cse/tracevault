import re
import email
from email import policy

# checkdmarc audits a DOMAIN's published policy (DNS-level).
# It does NOT validate whether a specific received message passed/failed.
from checkdmarc import check_domains


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
        "body": msg.get_body(preferencelist=("plain",)).get_content() if msg.get_body() else "",
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
    separate from whether this message passed auth. A domain with a strict
    'p=reject' DMARC policy that still let a lookalike-domain email through
    tells its own story (as in the sample report: message came via a
    typosquat domain, not by beating the real domain's policy).
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
            "dmarc_policy": dmarc_policy,  # e.g. "reject", "quarantine", "none"
        }
    except Exception as e:
        return {"domain": None, "has_spf_record": None, "has_dmarc_record": None,
                "dmarc_policy": None, "error": str(e)}