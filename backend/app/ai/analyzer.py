import json
from langchain_ollama import OllamaLLM
from app.models import AIAnalysis

llm = OllamaLLM(model="llama3.2:3b")

ANALYSIS_PROMPT = """You are a cybersecurity analyst. Analyze the following security log excerpt and respond ONLY with valid JSON, no other text, in exactly this shape:

{{
  "attack_type": "<short label, e.g. Brute Force, Phishing, SQL Injection, Unknown>",
  "severity": "<Low, Medium, High, or Critical>",
  "confidence_score": <number between 0 and 1>,
  "threat_summary": "<2-3 sentence plain-English summary of what happened and why it matters>"
}}

Log excerpt:
{log_content}
"""


def analyze_log(log_content: str) -> AIAnalysis:
    """Sends log content to the local LLM and parses a structured analysis."""
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
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        return AIAnalysis(
            attack_type="Unknown",
            severity="Low",
            confidence_score=0.0,
            threat_summary=f"AI response could not be parsed. Raw output: {raw_response[:200]}",
        )