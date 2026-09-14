from io import BytesIO
from xml.sax.saxutils import escape as _esc
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    ListFlowable, ListItem, KeepTogether,
)
from app.models import Evidence

_cell_style = ParagraphStyle(
    "TableCell", fontName="Helvetica", fontSize=9, leading=11,
    textColor=colors.HexColor("#0d1117"), wordWrap="CJK",
)
_header_cell_style = ParagraphStyle(
    "TableHeaderCell", parent=_cell_style, textColor=colors.white,
    fontName="Helvetica-Bold",
)

_SEVERITY_COLORS = {
    "critical": colors.HexColor("#b23b2e"),
    "high": colors.HexColor("#d1685c"),
    "medium": colors.HexColor("#e0ad63"),
    "low": colors.HexColor("#4a9b6e"),
}


def _severity_color(severity: str):
    return _SEVERITY_COLORS.get((severity or "").lower(), colors.HexColor("#6b6b6b"))


def _domain_from_email(addr: str) -> str | None:
    if not addr or "@" not in addr:
        return None
    return addr.rsplit("@", 1)[-1].strip(">").strip()


def _collect_iocs(a) -> list[tuple[str, str]]:
    """Aggregates every indicator scattered across header_analysis, geo_trace,
    url_reputations, and compromised_assets into one flat, de-duplicated
    table - the single view an analyst wants first."""
    iocs = []
    seen = set()

    def add(ioc_type, value):
        if not value:
            return
        key = (ioc_type, str(value))
        if key in seen:
            return
        seen.add(key)
        iocs.append(key)

    if a.header_analysis:
        add("Sender Domain", _domain_from_email(a.header_analysis.from_address))
        add("Sender Address", a.header_analysis.from_address)
        if a.header_analysis.reply_to:
            add("Reply-To Address", a.header_analysis.reply_to)

    for hop in a.geo_trace:
        add("IP Address", hop.ip)

    for u in a.url_reputations:
        add("URL", u.url)

    for asset in a.compromised_assets:
        add(asset.asset_type, asset.value)

    return iocs


SCOPE_NOTE = (
    "This report reflects data available at analysis time. Geolocation identifies "
    "probable sending infrastructure only - it does not establish the physical "
    "location or identity of the operator; the host may be rented, compromised, or "
    "a legitimate mailbox that is itself a victim. Confidence scores reflect model "
    "certainty based on available signals, not a guarantee of ground truth. Where "
    "authentication, header, or reputation data was unavailable, the corresponding "
    "section is omitted rather than assumed to be clean."
)


def generate_report_pdf(evidence: Evidence) -> BytesIO:
    """Builds a forensic investigation report PDF for one piece of evidence."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("TitleStyle", parent=styles["Title"], textColor=colors.HexColor("#0d1117"))
    heading_style = ParagraphStyle("HeadingStyle", parent=styles["Heading2"], textColor=colors.HexColor("#1f6feb"))
    body_style = styles["BodyText"]
    scope_style = ParagraphStyle(
        "ScopeStyle", parent=styles["BodyText"], fontSize=8.5,
        textColor=colors.HexColor("#555555"), leading=11,
    )

    elements = []

    elements.append(Paragraph("TraceVault - Investigation Report", title_style))
    elements.append(Spacer(1, 10))

    if evidence.ai_analysis:
        a = evidence.ai_analysis
        elements.append(_build_exec_summary(a))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"<i>{_esc(SCOPE_NOTE)}</i>", scope_style))
        elements.append(Spacer(1, 16))

    elements.append(Paragraph("Incident Summary", heading_style))
    summary_data = [
        ["Filename", _esc(evidence.filename)],
        ["Source", _esc(evidence.source)],
        ["Status", _esc(evidence.status)],
        ["Uploaded At", _esc(str(evidence.uploaded_at))],
        ["Evidence ID", _esc(evidence.id)],
    ]
    elements.append(_build_table(summary_data))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Evidence Integrity", heading_style))
    elements.append(_build_table([
        ["Hash Algorithm", _esc(evidence.hash_algorithm)],
        ["SHA-256 Hash", _esc(evidence.hash_value or "Not hashed")],
    ]))
    elements.append(Paragraph(
        "<i>This hash was computed over the raw uploaded bytes at ingestion time. "
        "Recomputing it against the original file and comparing (via the /verify "
        "endpoint) confirms the file has not been altered since acquisition.</i>",
        scope_style,
    ))
    elements.append(Spacer(1, 12))

    if evidence.ai_analysis:
        a = evidence.ai_analysis

        iocs = _collect_iocs(a)
        if iocs:
            elements.append(Paragraph("Indicators of Compromise (Summary)", heading_style))
            ioc_rows = [["Type", "Value"]] + [[t, v] for t, v in iocs]
            elements.append(_build_table(ioc_rows, header=True))
            elements.append(Spacer(1, 12))

        elements.append(Paragraph("AI Analysis Findings", heading_style))
        elements.append(_build_table([
            ["Attack Type", _esc(a.attack_type)],
            ["Severity", _esc(a.severity)],
            ["Confidence Score", f"{a.confidence_score:.2f}"],
        ]))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"<b>Threat Summary:</b> {_esc(a.threat_summary)}", body_style))
        elements.append(Spacer(1, 12))

        elements.append(Paragraph("Root Cause Analysis", heading_style))
        elements.append(_build_table([
            ["Entry Point", _esc(a.entry_point)],
            ["Attack Vector", _esc(a.attack_vector)],
            ["MITRE Technique", _esc(a.mitre_technique or "N/A")],
        ]))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(f"<b>Explanation:</b> {_esc(a.root_cause_explanation)}", body_style))
        elements.append(Spacer(1, 12))

        if a.header_analysis:
            h = a.header_analysis
            elements.append(Paragraph("Header & Authentication Analysis", heading_style))
            elements.append(_build_table([
                ["SPF", _esc(h.spf)],
                ["DKIM", _esc(h.dkim)],
                ["DMARC", _esc(h.dmarc)],
                ["From Address", _esc(h.from_address)],
                ["Display Name", _esc(h.display_name)],
                ["Reply-To", _esc(h.reply_to or "N/A")],
            ]))
            elements.append(Spacer(1, 12))

        if a.geo_trace:
            elements.append(Paragraph("GeoLocation & Relay Trace", heading_style))
            geo_rows = [["IP", "Location", "ISP", "Confidence", "Proxy/Hosting"]] + [
                [
                    _esc(hop.ip),
                    _esc(f"{hop.city or 'Unknown'}, {hop.country or 'Unknown'}"),
                    _esc(hop.isp or "Unknown"),
                    _esc(hop.confidence),
                    _esc(
                        "Yes" if (hop.proxy or hop.hosting) else
                        "No" if hop.proxy is not None else "N/A"
                    ),
                ]
                for hop in a.geo_trace
            ]
            elements.append(_build_table(geo_rows, header=True))
            elements.append(Spacer(1, 12))

        if a.url_reputations:
            elements.append(Paragraph("URL Reputation (VirusTotal)", heading_style))
            url_rows = [["URL", "Verdict", "Malicious", "Suspicious"]] + [
                [_esc(u.url), _esc(u.verdict), str(u.malicious), str(u.suspicious)]
                for u in a.url_reputations
            ]
            elements.append(_build_table(url_rows, header=True))
            elements.append(Spacer(1, 12))

        elements.append(Paragraph("Compromised Assets", heading_style))
        if a.compromised_assets:
            asset_rows = [["Type", "Value", "Severity"]] + [
                [_esc(ast.asset_type), _esc(ast.value), _esc(ast.severity)] for ast in a.compromised_assets
            ]
            elements.append(_build_table(asset_rows, header=True))
        else:
            elements.append(Paragraph("No specific assets identified.", body_style))
        elements.append(Spacer(1, 12))

        elements.append(Paragraph("Recommendations", heading_style))
        if evidence.recommendations:
            r = evidence.recommendations
            elements.append(_build_recommendation_block("Containment", r.containment_steps, body_style))
            elements.append(_build_recommendation_block("Recovery", r.recovery_steps, body_style))
            elements.append(_build_recommendation_block("Future Prevention", r.future_prevention, body_style))
        else:
            elements.append(Paragraph(_esc(_basic_recommendation(a.attack_type, a.severity)), body_style))
        elements.append(Spacer(1, 16))

        elements.append(Paragraph("Certificate of Production (Illustrative)", heading_style))
        elements.append(Paragraph(
            "<i>Modeled on the certificate structure required under Section 63 of the Bharatiya "
            "Sakshya Adhiniyam 2023 (successor to Section 65B of the Indian Evidence Act 1872) for "
            "electronic records. Admissibility is a judicial determination - this is a prototype "
            "template illustrating the particulars such a certificate records, not a legal opinion.</i>",
            scope_style,
        ))
        elements.append(Spacer(1, 6))
        elements.append(_build_table([
            ["Electronic Record", f"Email identified as Evidence ID {_esc(evidence.id)}"],
            ["Original File Hash", _esc(evidence.hash_value or "Not hashed")],
            ["Manner of Production", "Produced by the TraceVault email forensic platform, operating "
                                       "automatically over the electronic record during regular use."],
            ["Device / Service", "TraceVault analysis service (AI classification, header forensics, "
                                   "IP geolocation, URL reputation)."],
            ["Proper Operation", "The system was operating normally throughout analysis; integrity is "
                                   "evidenced by the SHA-256 hash above."],
            ["Officer Signature", "________________________  (name, designation, date)"],
        ]))
    else:
        elements.append(Paragraph("This evidence has not yet been analyzed by AI.", body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer


def _build_exec_summary(a):
    color = _severity_color(a.severity)
    style = ParagraphStyle(
        "ExecBanner", fontName="Helvetica", fontSize=10,
        textColor=colors.white, leading=14,
    )
    cell = Paragraph(
        f"<b>{_esc((a.severity or '').upper())} RISK &mdash; {_esc(a.attack_type)}</b> "
        f"(confidence {a.confidence_score:.0%})<br/>{_esc(a.threat_summary)}",
        style,
    )
    table = Table([[cell]], colWidths=[500])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return table


def _build_recommendation_block(title, steps, body_style):
    label_style = ParagraphStyle("RecLabel", parent=body_style, fontName="Helvetica-Bold", spaceBefore=6)
    items = [ListItem(Paragraph(_esc(step), body_style), bulletColor=colors.HexColor("#1f6feb")) for step in steps]
    block = [Paragraph(f"{title}:", label_style)]
    if items:
        block.append(ListFlowable(items, bulletType="bullet", start="•", leftIndent=16))
    else:
        block.append(Paragraph("None specified.", body_style))
    return KeepTogether(block)


def _build_table(data, header=False):
    num_cols = len(data[0]) if data else 1
    col_widths = [150, 350] if num_cols == 2 else [500 / num_cols] * num_cols

    wrapped_rows = []
    for row_index, row in enumerate(data):
        is_header_row = header and row_index == 0
        cell_style = _header_cell_style if is_header_row else _cell_style
        wrapped_rows.append([
            cell if isinstance(cell, Paragraph) else Paragraph(str(cell), cell_style)
            for cell in row
        ])

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