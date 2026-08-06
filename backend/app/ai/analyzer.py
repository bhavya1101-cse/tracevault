import json
from langchain_ollama import OllamaLLM
from app.models import AIAnalysis

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