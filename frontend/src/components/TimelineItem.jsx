import { theme, styles, severityColor } from "../theme";

function TimelineItem({ evidence, index }) {
  const a = evidence.ai_analysis;

  return (
    <div
      style={{
        ...styles.card,
        display: "flex",
        gap: "1rem",
        alignItems: "flex-start",
        marginBottom: "1rem",
        borderLeft: `4px solid ${a ? severityColor(a.severity) : theme.colors.border}`,
      }}
    >
      <div
        style={{
          minWidth: "2rem",
          height: "2rem",
          borderRadius: "50%",
          background: theme.colors.surfaceAlt,
          color: theme.colors.textMuted,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: theme.font.sizeSmall,
        }}
      >
        {index + 1}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <strong>{evidence.filename}</strong>
          <span style={styles.mutedText}>
            {new Date(evidence.uploaded_at).toLocaleString()}
          </span>
        </div>

        <div style={{ marginTop: "0.35rem" }}>
          <span style={styles.badge(theme.colors.textMuted)}>{evidence.status}</span>
          {a && (
            <span style={{ ...styles.badge(severityColor(a.severity)), marginLeft: "0.5rem" }}>
              {a.attack_type} — {a.severity}
            </span>
          )}
        </div>

        {a && (
          <p style={{ ...styles.mutedText, marginTop: "0.5rem", marginBottom: 0 }}>
            {a.threat_summary}
          </p>
        )}
      </div>
    </div>
  );
}

export default TimelineItem;