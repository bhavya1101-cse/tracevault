import { useEffect, useState } from "react";

const severityColors = {
  Low: "#3fb950",
  Medium: "#d29922",
  High: "#f85149",
  Critical: "#da3633",
};

function TimelineItem({ evidence, index }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 150);
    return () => clearTimeout(timer);
  }, [index]);

  const severity = evidence.ai_analysis?.severity || "Low";
  const color = severityColors[severity] || "#8b949e";

  return (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1.5rem",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: color }} />
        <div style={{ width: "2px", flex: 1, background: "#30363d", marginTop: "4px" }} />
      </div>
      <div style={{ background: "#161b22", border: `1px solid ${color}33`, borderRadius: "8px", padding: "1rem", flex: 1 }}>
        <div style={{ color: "#8b949e", fontSize: "0.8rem" }}>
          {new Date(evidence.uploaded_at).toLocaleString()}
        </div>
        <div style={{ color: "#c9d1d9", fontWeight: "bold", marginTop: "0.25rem" }}>
          {evidence.ai_analysis?.attack_type || "Unanalyzed"} — {evidence.filename}
        </div>
        <div style={{ color, fontSize: "0.85rem", marginTop: "0.25rem" }}>Severity: {severity}</div>
        {evidence.ai_analysis?.threat_summary && (
          <div style={{ color: "#8b949e", fontSize: "0.8rem", marginTop: "0.5rem" }}>
            {evidence.ai_analysis.threat_summary}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineItem;