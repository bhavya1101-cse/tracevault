# 🔐 TRACEVAULT

### AI-Powered Email Threat Detection, Geolocation & Forensic Intelligence Platform

TRACEVAULT is a cybersecurity platform designed to **detect, analyze, investigate, and correlate suspicious email threats**. It combines AI-based threat detection with email forensics, threat intelligence, IP geolocation, and evidence analysis to help users and security teams understand **what happened, why an email is risky, and what infrastructure may be associated with the threat**.

## 🚨 TraceMail + TRACEVAULT

TRACEVAULT works together with **TraceMail**, a Gmail-integrated security assistant.

```text
📧 Email Received
       ↓
🔍 TraceMail
       ↓
🤖 Threat Detection
       ↓
⚠️ Risk Score & Explanation
       ↓
🔎 Investigate in TRACEVAULT
       ↓
🕵️ Email Forensics
       ↓
🌐 Threat & Geo Intelligence
       ↓
📊 Attack Correlation
       ↓
📄 Forensic Report
```

### ✨ Key Features

* 🤖 **AI-Powered Threat Detection** — Identifies phishing, impersonation, suspicious content, and other email-based threats.
* 📩 **Email Header Forensics** — Examines available email headers and routing information.
* 👤 **Sender & Domain Analysis** — Detects suspicious sender identities and lookalike domains.
* 🔗 **URL & Link Analysis** — Extracts and evaluates potentially malicious or suspicious links.
* 🌐 **IP & Geolocation Intelligence** — Provides available geographic, network, ASN, and ISP information for relevant IP infrastructure.
* 🎯 **Risk Scoring** — Combines multiple indicators into an understandable threat score.
* 🧠 **AI-Powered Explanation** — Explains why an email was classified as suspicious.
* 🕸️ **Threat Correlation** — Connects related indicators such as senders, domains, URLs, and IP addresses.
* 📊 **Forensic Dashboard** — Presents investigation findings through an analyst-friendly interface.
* 📄 **Forensic Reporting** — Generates a structured summary of the investigation and evidence.

## 👥 Who Is It For?

| User                       | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| 👨‍🎓 Students / Employees | Quickly identify suspicious emails           |
| 👨‍💼 Organizations        | Strengthen email threat awareness            |
| 🛡️ SOC Analysts           | Investigate and correlate reported emails    |
| 🔎 Incident Responders     | Analyze evidence and reconstruct incidents   |
| 🏢 Security Teams          | Identify patterns across email-based attacks |

## 🏗️ Conceptual Architecture

```text
                    ┌──────────────┐
                    │    GMAIL     │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  TRACEMAIL   │
                    │ Gmail Add-on │
                    └──────┬───────┘
                           │
                    Email Evidence
                           │
                    ┌──────▼───────┐
                    │ THREAT ENGINE │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          Sender          URL          Content
          Analysis      Analysis       Analysis
             │             │             │
             └─────────────┼─────────────┘
                           ▼
                    ┌──────────────┐
                    │   RISK SCORE │
                    └──────┬───────┘
                           │
                  Investigate
                           │
                    ┌──────▼───────┐
                    │  TRACEVAULT  │
                    └──────┬───────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
       Forensics       Threat Intel    Geo Intelligence
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                  📊 Attack Correlation
                           │
                           ▼
                    📄 Forensic Report
```

## 🛠️ Technology Stack

* **Frontend:** React / HTML / CSS / JavaScript
* **Backend:** Python, FastAPI
* **AI/ML:** Python-based threat analysis and NLP
* **Database:** Firebase / Supabase
* **Email Integration:** Gmail / Google Workspace APIs
* **Threat Intelligence:** External intelligence APIs
* **Visualization:** Interactive dashboards and attack graphs
* **Version Control:** Git & GitHub

> **Note:** The exact technologies may vary as the prototype evolves.

## 🎯 SIH Problem Statement

**PS26106 — AI-Powered Email Threat Detection, GeoLocation and Forensic Intelligence Platform**

TRACEVAULT addresses the problem of detecting and investigating sophisticated email threats by combining **AI-based detection, email forensics, threat intelligence, and geolocation intelligence** into a unified platform.

## 🚀 Future Scope

* Automated mailbox-wide threat monitoring
* Advanced phishing and BEC detection
* Threat-intelligence feed integration
* Automated incident-response workflows
* Campaign-level threat correlation
* SIEM/SOC integration
* Blockchain-based evidence integrity
* Automated forensic report generation

## 🔒 Security & Privacy

TRACEVAULT is designed with a **security-first approach**. Email data and investigation evidence should be processed using minimum necessary permissions, secure communication, and appropriate access controls.

---

### 👩‍💻 Project

**TRACEVAULT**
*Turning suspicious emails into actionable forensic intelligence.*

**Built for Smart India Hackathon — PS26106**
