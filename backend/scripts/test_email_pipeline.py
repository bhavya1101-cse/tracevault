"""
End-to-end integration test for the TraceVault pipeline.

Generates 4 synthetic .eml files covering different confidence bands,
then runs each through the REAL running backend: upload -> analyze ->
recommend -> report. Use this on Day 6 to confirm the whole pipeline
works before the demo, and to produce ready-made sample cases you can
switch between live during the presentation.

Usage:
    1. Start the backend:  uvicorn app.main:app --reload
    2. In another terminal, from backend/:  python scripts/test_email_pipeline.py
"""
import os
import time
import requests

API_URL = os.environ.get("API_URL", "http://127.0.0.1:8000")
OUT_DIR = "test_reports"

SAMPLE_EMAILS = {
    "suspicious_invoice_payment.eml": """From: "Accounts Payable - Trident Logistics" <accounts@tr1dent-logistics-billing.com>
Reply-To: payments.verify@mail-secure-update.net
To: finance@yourcompany.com
Subject: URGENT: Invoice #4471 Payment Verification Required
Authentication-Results: mx.yourcompany.com; spf=fail smtp.mailfrom=tr1dent-logistics-billing.com; dkim=fail; dmarc=fail
Received: from mail-relay.local (10.42.6.11) by mx.yourcompany.com; Mon, 1 Sep 2026 09:14:22 +0000
Received: from unknown (185.220.101.47) by relay.vpn-exit.net; Mon, 1 Sep 2026 09:14:10 +0000
Received: from smtp.sender.net (41.203.114.62) by relay.vpn-exit.net; Mon, 1 Sep 2026 09:13:58 +0000

Dear Finance Team,

Your invoice #4471 payment is overdue. Please verify and complete payment
immediately via the secure portal below to avoid service suspension:

hxxps://tr1dent-logistics-billing[.]com/invoice/verify

Regards,
Accounts Payable Team
""",
    "quarterly_newsletter.eml": """From: "Company Newsletter" <newsletter@yourcompany.com>
To: all-staff@yourcompany.com
Subject: Q3 Company Newsletter
Authentication-Results: mx.yourcompany.com; spf=pass smtp.mailfrom=yourcompany.com; dkim=pass; dmarc=pass
Received: from mail-relay.local (10.42.6.11) by mx.yourcompany.com; Mon, 1 Sep 2026 08:00:00 +0000
Received: from smtp.yourcompany.com (203.0.113.10) by mail-relay.local; Mon, 1 Sep 2026 07:59:50 +0000

Hi team, here's what happened this quarter...

Best,
Comms Team
""",
    "password_reset_borderline.eml": """From: "IT Support" <support@yourcompany-portal.com>
To: employee@yourcompany.com
Subject: Password Reset Requested
Authentication-Results: mx.yourcompany.com; spf=pass smtp.mailfrom=yourcompany-portal.com; dkim=fail; dmarc=fail
Received: from mail-relay.local (10.42.6.11) by mx.yourcompany.com; Mon, 1 Sep 2026 11:02:15 +0000
Received: from smtp.provider.net (154.16.88.9) by mail-relay.local; Mon, 1 Sep 2026 11:02:01 +0000

A password reset was requested for your account. If this wasn't you,
click here to secure your account: hxxps://yourcompany-portal[.]com/reset

IT Support
""",
    "urgent_ceo_request.eml": """From: "Rajesh Kumar (CEO)" <rajesh.kumar.ceo1987@gmail.com>
Reply-To: rajesh.kumar.ceo1987@gmail.com
To: finance-manager@yourcompany.com
Subject: Confidential - Need this done today
Authentication-Results: mx.yourcompany.com; spf=pass smtp.mailfrom=gmail.com; dkim=pass; dmarc=none
Received: from mail-relay.local (10.42.6.11) by mx.yourcompany.com; Mon, 1 Sep 2026 14:20:03 +0000
Received: from mail-sor-f41.google.com (209.85.220.41) by mail-relay.local; Mon, 1 Sep 2026 14:19:55 +0000

I need you to process an urgent wire transfer today, keep this
confidential for now, will explain later. Reply for account details.

Rajesh
""",
}


def run():
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []

    for filename, content in SAMPLE_EMAILS.items():
        print(f"\n=== {filename} ===")

        # 1. Upload
        resp = requests.post(
            f"{API_URL}/api/evidence/upload",
            files={"file": (filename, content.encode(), "message/rfc822")},
            data={"source": "test_pipeline"},
        )
        resp.raise_for_status()
        evidence = resp.json()
        evidence_id = evidence["id"]
        print(f"  Uploaded -> id={evidence_id}, hash={evidence['hash_value'][:16]}...")

        # 2. Analyze
        resp = requests.post(f"{API_URL}/api/evidence/{evidence_id}/analyze")
        resp.raise_for_status()
        analyzed = resp.json()
        a = analyzed.get("ai_analysis", {})
        print(f"  Analyzed -> attack_type={a.get('attack_type')}, "
              f"severity={a.get('severity')}, confidence={a.get('confidence_score')}")

        # 3. Recommend
        resp = requests.post(f"{API_URL}/api/evidence/{evidence_id}/recommend")
        resp.raise_for_status()
        print("  Recommendations generated.")

        # 4. Report
        resp = requests.get(f"{API_URL}/api/evidence/{evidence_id}/report")
        resp.raise_for_status()
        report_path = os.path.join(OUT_DIR, f"{filename}.pdf")
        with open(report_path, "wb") as f:
            f.write(resp.content)
        print(f"  Report saved -> {report_path}")

        results.append({
            "filename": filename,
            "attack_type": a.get("attack_type"),
            "severity": a.get("severity"),
            "confidence": a.get("confidence_score"),
        })
        time.sleep(1)  # be polite to the free geolocation API

    print("\n=== SUMMARY ===")
    for r in results:
        print(f"  {r['filename']:35s} {r['attack_type'] or 'N/A':25s} "
              f"{r['severity'] or 'N/A':10s} conf={r['confidence']}")


if __name__ == "__main__":
    run()