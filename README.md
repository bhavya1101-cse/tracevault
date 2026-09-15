# TraceVault + TraceMail
### AI-Powered Email Threat Detection, GeoLocation and Forensic Intelligence Platform
**SIH26106** · Theme: Blockchain & Cybersecurity · Team **HEADWATERS**

[![Live: TraceVault](https://img.shields.io/badge/Live-TraceVault-b96a48)](https://tracevault-seven.vercel.app/)
[![Backend: Render](https://img.shields.io/badge/Backend-Render-1f7a72)](https://tracevault-54hy.onrender.com/api/health)
[![YouTube](https://img.shields.io/badge/YouTube-Prototype%20Demo-red?logo=youtube)](https://youtu.be/xCil3B_eL1w)

---

## The problem, and why most tools miss half of it

Existing email security tools do one of two things: they **filter** (block/allow, no explanation) or they **analyze** — and analysis tools almost universally assume you already have a suspicious `.eml` file in hand before they're useful. Neither half answers the question that actually matters after a phishing attempt: *where did it come from, and what do we do with the evidence?*

**TraceVault + TraceMail is one connected pipeline covering both halves.** TraceMail (a Chrome extension) detects at the point of reading — inside Gmail, in real time. TraceVault (the web platform) turns any flagged email into a forensic case: AI-based content classification, SPF/DKIM/DMARC authentication, IP geolocation, threat-intel reputation checks, and a structured, hash-verified investigative report. One click moves a case from "flagged in the inbox" to "full forensic depth" — no re-uploading, no re-entering data, no second tool.

---

## Live

| | |
|---|---|
| **TraceVault (web)** | https://tracevault-seven.vercel.app/ |
| **Backend API** | https://tracevault-54hy.onrender.com — `/api/health`, `/docs` for Swagger |
| **TraceMail (extension)** | Load unpacked from `/extension` — see [Setup](#setup) |

> Backend is on Render's free tier and sleeps after ~15 minutes idle — the first request after that can take up to a minute to wake up. Not a bug, a hosting-tier tradeoff.

---

## How it works

```
 TraceMail extension ──┐
 (auto-detect in Gmail) │
                        ├──▶  FastAPI backend
 TraceVault upload ─────┘         │
 (.eml / paste headers)           ▼
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
      Header forensics      AI analysis         Geo intelligence
      (SPF/DKIM/DMARC)     (Gemini + MITRE)    (IP-API + proxy/hosting flags)
              └───────────────────┼───────────────────┘
                                  ▼
                          URL reputation (VirusTotal)
                                  ▼
                    Evidence store (SHA-256 hashed)
                                  ▼
                  Forensic report (PDF + JSON) ──▶ React dashboard
```

---

## Folder structure

```
tracevault/
├── backend/
│   ├── app/
│   │   ├── main.py                 FastAPI app, CORS, route registration
│   │   ├── models.py               Pydantic schemas (Evidence, AIAnalysis, GeoHop...)
│   │   ├── routes/
│   │   │   ├── evidence.py         upload / analyze / report / bulk-analyze / verify
│   │   │   └── extension_preview.py  ingestion endpoint used by TraceMail
│   │   ├── ai/
│   │   │   ├── analyzer.py         Gemini-based classification + MITRE ATT&CK mapping
│   │   │   └── embeddings.py       ChromaDB semantic search
│   │   ├── email/
│   │   │   ├── parser.py           raw .eml parsing (headers, body, auth results)
│   │   │   ├── geolocation.py      IP relay geolocation + proxy/hosting flags
│   │   │   └── reputation.py       VirusTotal URL reputation
│   │   └── reports/
│   │       └── generator.py        ReportLab PDF generation
│   ├── requirements.txt
│   └── render.yaml
├── frontend/
│   ├── src/
│   │   ├── App.js                  routing, header, live backend-status indicator
│   │   ├── theme.js                design tokens (single source of truth for styling)
│   │   ├── api_v2.js               fetch wrapper + anonymous per-browser user ID
│   │   ├── pages/                  Dashboard, GeoTrace, HeaderAuth, Timeline, History...
│   │   └── components/             EvidenceTable, StatCard, TimelineItem
│   └── package.json
└── extension/
    ├── manifest.json                Chrome Manifest V3
    ├── background.js                all network calls (CORS-safe, centralizes state)
    ├── content.js                   Gmail DOM detection, floating button, result card
    └── popup.html / popup.js / styles.css
```

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # fill in GEMINI_API_KEY, VIRUSTOTAL_API_KEY (optional)
uvicorn app.main:app --reload
```
Visit `http://127.0.0.1:8000/api/health` → `{"status":"ok"}`. Visit `/docs` for interactive Swagger testing of every endpoint.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env           # REACT_APP_API_URL, defaults to localhost:8000
npm start
```

### Extension (TraceMail)

1. `chrome://extensions` → enable **Developer mode**
2. **Load unpacked** → select the `extension/` folder
3. Open Gmail — a floating "Analyze with TraceMail" button appears; click it on any open email to run a full analysis

---

## Scope — what's built vs. what's roadmap

We'd rather state this plainly than have it discovered. Legend: ✅ built and demoable · 🔧 proposed with a concrete technical approach, not yet implemented · ⚠️ partially built.

| Capability | Status |
|---|---|
| NLP-based threat classification (Gemini) + MITRE ATT&CK mapping | ✅ |
| SPF/DKIM/DMARC header authentication | ✅ |
| IP geolocation, incl. proxy/VPN/hosting-provider flags | ✅ |
| VirusTotal URL reputation | ✅ |
| Real-time detection inside Gmail (TraceMail) | ✅ |
| Per-user data isolation (anonymous UUID, no login) | ✅ |
| PDF/JSON forensic reporting, incl. BSA 2023 §63 evidentiary structure | ✅ (illustrative certificate, not a legal certification) |
| Semantic case search (ChromaDB embeddings) | ✅ |
| Relay-hop trust classification (vouched / boundary / asserted) | ❌ not built — see [docs](#) for proposed approach |
| WHOIS / DNS / MX domain intelligence | ❌ not built |
| Graph-based campaign correlation (beyond a linear chain) | ⚠️ current Network Graph is a chronological chain, not multi-signal correlation |
| Blockchain evidence-hash anchoring | 🔧 proposed — Solidity contract + web3.py, public testnet |
| Persistent database | ❌ currently in-memory; resets on backend restart |
| Consent screen / per-domain exclusion list | 🔧 proposed |

---

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React, React Router, Recharts, React Flow |
| Backend | Python, FastAPI, Uvicorn |
| AI / NLP | Google Gemini (classification, MITRE mapping), ChromaDB (embeddings) |
| Forensics | `checkdmarc` (SPF/DKIM/DMARC), ip-api.com (geolocation), VirusTotal (reputation) |
| Reporting | ReportLab (PDF), native JSON via API |
| Extension | Chrome Manifest V3, vanilla JavaScript |
| Deployment | Vercel (frontend), Render (backend), GitHub |

---

## Team HEADWATERS

Built for Smart India Hackathon 2026, Problem Statement SIH26106.
