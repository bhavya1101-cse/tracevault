from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.models import Evidence


_cell_style = ParagraphStyle(
    "TableCell",
    fontName="Helvetica",
    fontSize=9,
    leading=11,
    textColor=colors.HexColor("#0d1117"),
    wordWrap="CJK",  # breaks long unbroken strings (URLs, SHA-256 hashes) instead
                      # of overflowing into the next cell - regular wordWrap only
                      # breaks on whitespace, which URLs/hashes don't have.
)
_header_cell_style = ParagraphStyle(
    "TableHeaderCell",
    parent=_cell_style,
    textColor=colors.white,
    fontName="Helvetica-Bold",
)


def generate_report_pdf(evidence: Evidence) -> BytesIO:
    """Builds a forensic investigation report PDF for one piece of evidence."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], textColor=colors.HexColor("#0d1117"))
    heading_style = ParagraphStyle("HeadingStyle", parent=styles["Heading2"], textColor=colors.HexColor("#1f6feb"))
    body_style = styles["BodyText"]

    elements = []

    elements.append(Paragraph("TraceVault - Investigation Report", title_style))
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

        if a.header_analysis:
            h = a.header_analysis
            elements.append(Paragraph("Header & Authentication Analysis", heading_style))
            elements.append(_build_table([
                ["SPF", h.spf],
                ["DKIM", h.dkim],
                ["DMARC", h.dmarc],
                ["From Address", h.from_address],
                ["Display Name", h.display_name],
                ["Reply-To", h.reply_to or "N/A"],
            ]))
            elements.append(Spacer(1, 12))

        if a.geo_trace:
            elements.append(Paragraph("GeoLocation & Relay Trace", heading_style))
            geo_rows = [["IP", "Location", "ISP", "Confidence"]] + [
                [
                    h.ip,
                    f"{h.city or 'Unknown'}, {h.country or 'Unknown'}",
                    h.isp or "Unknown",
                    h.confidence,
                ]
                for h in a.geo_trace
            ]
            elements.append(_build_table(geo_rows, header=True))
            elements.append(Spacer(1, 12))

        if a.url_reputations:
            elements.append(Paragraph("URL Reputation (VirusTotal)", heading_style))
            url_rows = [["URL", "Verdict", "Malicious", "Suspicious"]] + [
                [u.url, u.verdict, str(u.malicious), str(u.suspicious)]
                for u in a.url_reputations
            ]
            elements.append(_build_table(url_rows, header=True))
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
                elements.append(Paragraph(f"- {step}", body_style))
            elements.append(Paragraph("<b>Recovery:</b>", body_style))
            for step in r.recovery_steps:
                elements.append(Paragraph(f"- {step}", body_style))
            elements.append(Paragraph("<b>Future Prevention:</b>", body_style))
            for step in r.future_prevention:
                elements.append(Paragraph(f"- {step}", body_style))
        else:
            elements.append(Paragraph(_basic_recommendation(a.attack_type, a.severity), body_style))
    else:
        elements.append(Paragraph("This evidence has not yet been analyzed by AI.", body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def _build_table(data, header=False):
    # Column widths must match the actual column count. 2-column tables
    # (most of this report) keep the original label/value proportions;
    # wider tables split evenly across 500pt.
    num_cols = len(data[0]) if data else 1
    col_widths = [150, 350] if num_cols == 2 else [500 / num_cols] * num_cols

    # Every cell is a Paragraph (not a raw string) so long unbroken text -
    # URLs, SHA-256 hashes - wraps inside its cell instead of overflowing
    # into the next column. This is what was broken in your PDF.
    wrapped_rows = []
    for row_index, row in enumerate(data):
        is_header_row = header and row_index == 0
        cell_style = _header_cell_style if is_header_row else _cell_style
        wrapped_rows.append([Paragraph(str(cell), cell_style) for cell in row])

    table = Table(wrapped_rows, colWidths=col_widths)
    style = [
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#30363d")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    if header:
        style.append(("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#161b22")))
    table.setStyle(TableStyle(style))
    return table


def _basic_recommendation(attack_type: str, severity: str) -> str:
    return (
        f"Given the identified {attack_type} activity at {severity} severity, immediate containment "
        "of affected assets is recommended, followed by credential resets for any implicated accounts "
        "and a review of related access logs for lateral movement."
    )