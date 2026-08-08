import json
import os
import google.generativeai as genai
from app.models import AIAnalysis, CompromisedAsset
from app.models import AIAnalysis, CompromisedAsset, Recommendations
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

ANALYSIS_PROMPT = """You are a cybersecurity analyst. Analyze the following security log excerpt and respond ONLY with valid JSON, no other text, in exactly this shape:

{{
  "attack_type": "<short label, e.g. Brute Force, Phishing, SQL Injection, Unknown>",
  "severity": "<Low, Medium, High, or Critical>",
  "confidence_score": <number between 0 and 1>,
  "threat_summary": "<2-3 sentence plain-English summary of what happened and why it matters>",
  "entry_point": "<how the attacker likely first gained access>",
  "attack_vector": "<the method/channel used>",
  "mitre_technique": "<a MITRE ATT&CK technique ID if clearly applicable, e.g. 'T1110', otherwise null>",
  "root_cause_explanation": "<2-3 sentences explaining WHY this happened>",
  "compromised_assets": [
    {{"asset_type": "<Server, User, Endpoint, IP Address, or Email>", "value": "<specific identifier from the log>", "severity": "<Low, Medium, High, or Critical>"}}
  ]
}}

If no specific assets are clearly identifiable, return an empty array. Do not invent identifiers not present in the log.

Log excerpt:
{log_content}
"""


def analyze_log(log_content: str) -> AIAnalysis:
    prompt = ANALYSIS_PROMPT.format(log_content=log_content[:3000])

    try:
        response = model.generate_content(prompt)
        raw_response = response.text
        cleaned = raw_response.strip().strip("```").strip("json").strip()
        data = json.loads(cleaned)

        assets = [
            CompromisedAsset(
                asset_type=a.get("asset_type", "Unknown"),
                value=a.get("value", "Unknown"),
                severity=a.get("severity", "Low"),
            )
            for a in data.get("compromised_assets", [])
        ]

        return AIAnalysis(
            attack_type=data.get("attack_type", "Unknown"),
            severity=data.get("severity", "Low"),
            confidence_score=float(data.get("confidence_score", 0.0)),
            threat_summary=data.get("threat_summary", "No summary available."),
            entry_point=data.get("entry_point", "Unknown"),
            attack_vector=data.get("attack_vector", "Unknown"),
            mitre_technique=data.get("mitre_technique"),
            root_cause_explanation=data.get("root_cause_explanation", "No root cause identified."),
            compromised_assets=assets,
        )
    except Exception as e:
        return AIAnalysis(
            attack_type="Unknown",
            severity="Low",
            confidence_score=0.0,
            threat_summary=f"AI response could not be parsed or generated. Error: {str(e)[:200]}",
            entry_point="Unknown",
            attack_vector="Unknown",
            mitre_technique=None,
            root_cause_explanation="Analysis failed to parse.",
            compromised_assets=[],
        )

def generate_recommendations(analysis: AIAnalysis) -> Recommendations:
    """Generates containment/recovery/prevention guidance for a given analysis."""
    prompt = RECOMMENDATION_PROMPT.format(
        attack_type=analysis.attack_type,
        severity=analysis.severity,
        entry_point=analysis.entry_point,
        attack_vector=analysis.attack_vector,
        root_cause_explanation=analysis.root_cause_explanation,
    )

    try:
        response = model.generate_content(prompt)
        raw_response = response.text
        cleaned = raw_response.strip().strip("```").strip("json").strip()
        data = json.loads(cleaned)
        return Recommendations(
            containment_steps=data.get("containment_steps", []),
            recovery_steps=data.get("recovery_steps", []),
            future_prevention=data.get("future_prevention", []),
        )
    except Exception:
        return Recommendations(
            containment_steps=["Isolate affected systems pending manual review."],
            recovery_steps=["Manual investigation required - AI recommendation generation failed."],
            future_prevention=["Review incident manually to determine prevention steps."],
        )