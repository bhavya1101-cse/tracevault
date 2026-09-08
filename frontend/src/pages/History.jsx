import { useEffect, useState } from "react";
import { theme, styles, severityColor } from "../theme";
import { apiFetch } from "../api_v2";

function History() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then((data) => {
        setEvidence(data.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)));
        setError(null);
      })
      .catch(() => setError("Could not load your history."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const downloadReport = async (id, filename) => {
    const res = await apiFetch(`/api/evidence/${id}/report`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report_${filename}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Case History</h1>
      <p style={styles.subtitle}>
        Every email you've uploaded and analyzed, private to this browser.
      </p>

      {loading && <p style={{ color: theme.colors.textMuted }}>Loading your history...</p>}
      {error && <p style={{ color: theme.colors.severity.High }}>{error}</p>}

      {!loading && !error && evidence.length === 0 && (
        <p style={{ color: theme.colors.textMuted }}>
          No cases yet. Upload a .eml file from Email Ingestion to get started.
        </p>
      )}

      {!loading && evidence.length > 0 && (
        <div style={styles.card}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Filename</th>
                <th style={styles.th}>Uploaded</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Attack Type</th>
                <th style={styles.th}>Severity</th>
                <th style={styles.th}>Report</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((e) => (
                <tr key={e.id}>
                  <td style={styles.td}>{e.filename}</td>
                  <td style={styles.td}>{new Date(e.uploaded_at).toLocaleString()}</td>
                  <td style={styles.td}>{e.status}</td>
                  <td style={styles.td}>{e.ai_analysis?.attack_type || "—"}</td>
                  <td style={styles.td}>
                    {e.ai_analysis?.severity ? (
                      <span style={styles.badge(severityColor(e.ai_analysis.severity))}>
                        {e.ai_analysis.severity}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={styles.td}>
                    {e.status === "analyzed" ? (
                      <button
                        onClick={() => downloadReport(e.id, e.filename)}
                        style={{
                          background: theme.colors.primary,
                          color: theme.colors.bg,
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.35rem 0.75rem",
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Download
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default History;