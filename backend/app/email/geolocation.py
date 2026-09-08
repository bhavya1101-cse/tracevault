import re
import ipaddress
import requests

IP_REGEX = r"\[?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]?"

# In-process cache so re-analyzing the same evidence, or repeated hops
# within one email, don't burn ip-api.com's free-tier rate limit
# (45 requests/minute) on IPs already looked up this run.
_GEO_CACHE: dict[str, dict] = {}


def _is_public_ip(ip: str) -> bool:
    """Filters out private/reserved/loopback IPs (10.x, 192.168.x, 127.x,
    etc.) from internal mail-relay hops. These never resolve to a real
    location, so sending them to ip-api.com just wastes a rate-limited
    request that always comes back empty."""
    try:
        addr = ipaddress.ip_address(ip)
        return not (
            addr.is_private
            or addr.is_loopback
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
        )
    except ValueError:
        return False


def extract_ips(received_headers: list[str]) -> list[str]:
    """Extracts unique, public-only IPs from Received headers, in order of
    first appearance."""
    seen = set()
    ips = []
    for h in received_headers:
        match = re.search(IP_REGEX, h)
        if match:
            ip = match.group(1)
            if ip not in seen and _is_public_ip(ip):
                seen.add(ip)
                ips.append(ip)
    return ips


def geolocate_ip(ip: str) -> dict:
    if ip in _GEO_CACHE:
        return _GEO_CACHE[ip]

    try:
        r = requests.get(
            f"http://ip-api.com/json/{ip}",
            params={"fields": "status,city,country,isp"},
            timeout=3,
        )
        d = r.json()
        success = d.get("status") == "success"
        result = {
            "ip": ip,
            "city": d.get("city") if success else "Unknown",
            "country": d.get("country") if success else "Unknown",
            "isp": d.get("isp") if success else "Unknown",
            # Confidence reflects how much the registry actually returned -
            # city-level data present = Medium, country-only/failed = Low.
            "confidence": "Medium" if success and d.get("city") else "Low",
        }
    except Exception:
        result = {"ip": ip, "city": "Unknown", "country": "Unknown", "isp": "Unknown", "confidence": "Low"}

    _GEO_CACHE[ip] = result
    return result