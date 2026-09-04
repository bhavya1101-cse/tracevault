import { useEffect, useState, useMemo } from "react";
import { theme, styles } from "../theme";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function resultColor(result) {
  if (result === "Pass") return theme.colors.severity.Low;
  if (result === "Fail") return theme.colors.severity.High;
  return theme.colors.textMuted;
}

function HeaderAuth() {
  const [evidence, setEvidence] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((res) => res.json())
      .then((data) => {
        const withHeaders = data.filter((e) => e.ai_analysis?.header_analysis);
        setEvidence(withHeaders);
        if (withHeaders.length > 0) setSelectedId(withHeaders[withHeaders.length - 1].id);
      })
      .catch(() => console.error("Could not load evidence"));
  }, []);

  const selected = useMemo(
    () => evidence.find((e) => e.id === selectedId),
    [evidence, selectedId]
  );
  const h = selected?.ai_analysis?.header_analysis;

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Header &amp; Authentication Analysis</h1>
      <p style={styles.subtitle}>
        SPF, DKIM, and DMARC results for this specific message, plus sender identity signals.
      </p>

      {evidence.length === 0 ? (
        <p style={{ color: theme.colors.textMuted }}>
          No analyzed emails yet. Upload and analyze a .eml file first.
        </p>
      ) : (
        <>
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ ...styles.select, marginBottom: "1.5rem" }}
          >
            {evidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.filename}
              </option>
            ))}
          </select>

          <div style={{ ...styles.card, marginBottom: "1.5rem" }}>
            <h3 style={{ color: theme.colors.textMuted, marginTop: 0 }}>Authentication Results</h3>
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.td}>SPF</td>
                  <td style={{ ...styles.td, color: resultColor(h?.spf), fontWeight: "bold" }}>{h?.spf}</td>
                </tr>
                <tr>
                  <td style={styles.td}>DKIM</td>
                  <td style={{ ...styles.td, color: resultColor(h?.dkim), fontWeight: "bold" }}>{h?.dkim}</td>
                </tr>
                <tr>
                  <td style={styles.td}>DMARC</td>
                  <td style={{ ...styles.td, color: resultColor(h?.dmarc), fontWeight: "bold" }}>{h?.dmarc}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.card}>
            <h3 style={{ color: theme.colors.textMuted, marginTop: 0 }}>Sender Identity</h3>
            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.td}>Display Name</td>
                  <td style={styles.td}>{h?.display_name || "—"}</td>
                </tr>
                <tr>
                  <td style={styles.td}>From Address</td>
                  <td style={styles.td}>{h?.from_address || "—"}</td>
                </tr>
                <tr>
                  <td style={styles.td}>Reply-To</td>
                  <td style={styles.td}>{h?.reply_to || "(same as From)"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default HeaderAuth;