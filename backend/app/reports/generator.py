from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.models import Evidence


def generate_report_pdf(evidence: Evidence) -> BytesIO:
    """Builds a forensic investigation report PDF for one piece of evidence."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], textColor=colors.HexColor("#0d1117"))
    heading_style = ParagraphStyle("HeadingStyle", parent=styles["Heading2"], textColor=colors.HexColor("#1f6feb"))
    body_style = styles["BodyText"]

    elements = []

    elements.append(Paragraph("Cyber Black Box — Investigation Report", title_style))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Incident Summary", heading_style))
    summary_data = [
        ["Filename", evidence.filename],
        ["Source", evidence.source],
        ["Status", evidence.status],
        ["Uploaded At", str(evidence.uploaded_at)],
        ["Evidence ID", evidence.id],
    ]
    elements.append(_build_table(summary_data))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Evidence Integrity", heading_style))
    elements.append(_build_table([
        ["Hash Algorithm", evidence.hash_algorithm],
        ["SHA-256 Hash", evidence.hash_value or "Not hashed"],
    ]))
    elements.append(Spacer(1, 12))

    if evidence.ai_analysis:
        a = evidence.ai_analysis
        elements.append(Paragraph("AI Analysis Findings", heading_style))
        elements.append(_build_table([
            ["Attack Type", a.attack_type],
            ["Severity", a.severity],
            ["Confidence Score", f"{a.confidence_score:.2f}"],
        ]))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"<b>Threat Summary:</b> {a.threat_summary}", body_style))
        elements.append(Spacer(1, 12))

        elements.append(Paragraph("Root Cause Analysis", heading_style))
        elements.append(_build_table([
            ["Entry Point", a.entry_point],
            ["Attack Vector", a.attack_vector],
            ["MITRE Technique", a.mitre_technique or "N/A"],
        ]))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"<b>Explanation:</b> {a.root_cause_explanation}", body_style))
        elements.append(Spacer(1, 12))

        elements.append(Paragraph("Compromised Assets", heading_style))
        if a.compromised_assets:
            asset_rows = [["Type", "Value", "Severity"]] + [
                [ast.asset_type, ast.value, ast.severity] for ast in a.compromised_assets
            ]
            elements.append(_build_table(asset_rows, header=True))
        else:
            elements.append(Paragraph("No specific assets identified.", body_style))
        elements.append(Spacer(1, 12))

        elements.append(Paragraph("Recommendations", heading_style))
        if evidence.recommendations:
            r = evidence.recommendations
            elements.append(Paragraph("<b>Containment:</b>", body_style))
            for step in r.containment_steps:
                elements.append(Paragraph(f"• {step}", body_style))
            elements.append(Paragraph("<b>Recovery:</b>", body_style))
            for step in r.recovery_steps:
                elements.append(Paragraph(f"• {step}", body_style))
            elements.append(Paragraph("<b>Future Prevention:</b>", body_style))
            for step in r.future_prevention:
                elements.append(Paragraph(f"• {step}", body_style))
        else:
            elements.append(Paragraph(_basic_recommendation(a.attack_type, a.severity), body_style))


def _build_table(data, header=False):
    table = Table(data, colWidths=[150, 350])
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#30363d")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#161b22")))
        style.append(("TEXTCOLOR", (0, 0), (-1, 0), colors.white))
    table.setStyle(TableStyle(style))
    return table


def _basic_recommendation(attack_type: str, severity: str) -> str:
    """Placeholder rule-based recommendation - Module 11 will replace this with full AI-generated guidance."""
    base = f"Given the identified {attack_type} activity at {severity} severity, immediate containment " \
           "of affected assets is recommended, followed by credential resets for any implicated accounts " \
           "and a review of related access logs for lateral movement."
    return base