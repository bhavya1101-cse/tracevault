import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const severityColors = {
  Low: "#3fb950",
  Medium: "#d29922",
  High: "#f85149",
  Critical: "#da3633",
};

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
    <div style={{ padding: "2rem", background: "#0d1117", minHeight: "100vh", color: "#c9d1d9" }}>
      <h1 style={{ color: "#58a6ff", marginBottom: "1.5rem" }}>Compromised Assets</h1>

      {assets.length === 0 ? (
        <p style={{ color: "#8b949e" }}>No compromised assets identified yet — analyze some evidence first.</p>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ color: "#8b949e" }}>{type}s</h3>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {items.map((a, i) => (
                <div
                  key={i}
                  style={{
                    background: "#161b22",
                    border: `1px solid ${severityColors[a.severity] || "#8b949e"}`,
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{a.value}</div>
                  <div style={{ fontSize: "0.75rem", color: severityColors[a.severity] || "#8b949e" }}>
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