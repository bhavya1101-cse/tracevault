import re
import requests

IP_REGEX = r"\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?"

def extract_ips(received_headers: list[str]) -> list[str]:
    ips = []
    for h in received_headers:
        match = re.search(IP_REGEX, h)
        if match:
            ips.append(match.group(1))
    return ips

def geolocate_ip(ip: str) -> dict:
    try:
        r = requests.get(f"http://ip-api.com/json/{ip}", timeout=3)
        d = r.json()
        return {"ip": ip, "city": d.get("city"), "country": d.get("country"),
                "isp": d.get("isp"), "confidence": "Medium" if d.get("status") == "success" else "Low"}
    except Exception:
        return {"ip": ip, "city": "Unknown", "country": "Unknown", "isp": "Unknown", "confidence": "Low"}