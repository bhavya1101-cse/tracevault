import json
from langchain_ollama import OllamaLLM
from app.models import AIAnalysis
from app.models import Recommendations

RECOMMENDATION_PROMPT = """You are a cybersecurity incident responder. Based on this incident analysis, respond ONLY with valid JSON in exactly this shape:

{{
  "containment_steps": ["<short actionable step>", "..."],
  "recovery_steps": ["<short actionable step>", "..."],
  "future_prevention": ["<short actionable step>", "..."]
}}

Provide 2-4 items per list. Be specific to this incident, not generic.

Incident details:
Attack Type: {attack_type}
Severity: {severity}
Entry Point: {entry_point}
Attack Vector: {attack_vector}
Root Cause: {root_cause_explanation}
"""


def generate_recommendations(analysis: "AIAnalysis") -> Recommendations:
    """Generates containment/recovery/prevention guidance for a given analysis."""
    prompt = RECOMMENDATION_PROMPT.format(
        attack_type=analysis.attack_type,
        severity=analysis.severity,
        entry_point=analysis.entry_point,
        attack_vector=analysis.attack_vector,
        root_cause_explanation=analysis.root_cause_explanation,
    )
    raw_response = llm.invoke(prompt)

    try:
        cleaned = raw_response.strip().strip("```").strip("json").strip()
        data = json.loads(cleaned)
        return Recommendations(
            containment_steps=data.get("containment_steps", []),
            recovery_steps=data.get("recovery_steps", []),
            future_prevention=data.get("future_prevention", []),
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        return Recommendations(
            containment_steps=["Isolate affected systems pending manual review."],
            recovery_steps=["Manual investigation required - AI recommendation generation failed."],
            future_prevention=["Review incident manually to determine prevention steps."],
        )

llm = OllamaLLM(model="llama3.2:3b")

ANALYSIS_PROMPT = """You are a cybersecurity analyst. Analyze the following security log excerpt and respond ONLY with valid JSON, no other text, in exactly this shape:

{{
  "attack_type": "<short label, e.g. Brute Force, Phishing, SQL Injection, Unknown>",
  "severity": "<Low, Medium, High, or Critical>",
  "confidence_score": <number between 0 and 1>,
  "threat_summary": "<2-3 sentence plain-English summary of what happened and why it matters>",
  "entry_point": "<how the attacker likely first gained access, e.g. 'Compromised user credentials', 'Unpatched web application'>",
  "attack_vector": "<the method/channel used, e.g. 'Phishing email', 'Brute force login', 'SQL injection'>",
  "mitre_technique": "<a MITRE ATT&CK technique ID if clearly applicable, e.g. 'T1110', otherwise null>",
  "root_cause_explanation": "<2-3 sentences explaining WHY this happened - the underlying weakness that allowed it>"
}}

Log excerpt:
{log_content}
"""


def analyze_log(log_content: str) -> AIAnalysis:
    prompt = ANALYSIS_PROMPT.format(log_content=log_content[:3000])
    raw_response = llm.invoke(prompt)

    try:
        cleaned = raw_response.strip().strip("```").strip("json").strip()
        data = json.loads(cleaned)
        return AIAnalysis(
            attack_type=data.get("attack_type", "Unknown"),
            severity=data.get("severity", "Low"),
            confidence_score=float(data.get("confidence_score", 0.0)),
            threat_summary=data.get("threat_summary", "No summary available."),
            entry_point=data.get("entry_point", "Unknown"),
            attack_vector=data.get("attack_vector", "Unknown"),
            mitre_technique=data.get("mitre_technique"),
            root_cause_explanation=data.get("root_cause_explanation", "No root cause identified."),
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        return AIAnalysis(
            attack_type="Unknown",
            severity="Low",
            confidence_score=0.0,
            threat_summary=f"AI response could not be parsed. Raw output: {raw_response[:200]}",
            entry_point="Unknown",
            attack_vector="Unknown",
            mitre_technique=None,
            root_cause_explanation="Analysis failed to parse.",
        )