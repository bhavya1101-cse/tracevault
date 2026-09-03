import email
from email import policy
from checkdmarc import check_domains  # pip install checkdmarc

def parse_eml(raw_bytes: bytes) -> dict:
    msg = email.message_from_bytes(raw_bytes, policy=policy.default)
    received_headers = msg.get_all("Received", [])
    return {
        "from_address": msg.get("From", ""),
        "display_name": msg.get("From", "").split("<")[0].strip(),
        "reply_to": msg.get("Reply-To", ""),
        "subject": msg.get("Subject", ""),
        "received_chain": received_headers,
        "auth_results": msg.get("Authentication-Results", ""),
        "body": msg.get_body(preferencelist=("plain",)).get_content() if msg.get_body() else "",
    }