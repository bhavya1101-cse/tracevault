import { useEffect, useState } from "react";
import { styles, severityColor } from "../theme";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function CompromisedAssets() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((res) => res.json())
      .then((data) => {
        const allAssets = data.flatMap((e) =>
          (e.ai_analysis?.compromised_assets || []).map((a) => ({
            ...a,
            fromFile: e.filename,
          }))
        );
        setAssets(allAssets);
      })
      .catch(() => console.error("Could not load evidence"));
  }, []);

  const grouped = assets.reduce((acc, a) => {
    acc[a.asset_type] = acc[a.asset_type] || [];
    acc[a.asset_type].push(a);
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Compromised Assets</h1>

      {assets.length === 0 ? (
        <p style={styles.emptyState}>No compromised assets identified yet — analyze some evidence first.</p>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} style={{ marginBottom: "1.5rem" }}>
            <h3 style={styles.h2}>{type}s</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {items.map((a, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.card,
                    borderColor: severityColor(a.severity),
                    padding: "0.75rem 1rem",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{a.value}</div>
                  <div style={{ fontSize: styles.mutedText.fontSize, color: severityColor(a.severity) }}>
                    {a.severity} — from {a.fromFile}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default CompromisedAssets;