import { useEffect, useState } from "react";
import { theme, styles, severityColor } from "../theme";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function EvidenceTable() {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  const [inputMode, setInputMode] = useState("file"); // "file" | "paste"
  const [headersText, setHeadersText] = useState("");
  const [pasting, setPasting] = useState(false);

  const fetchEvidence = () => {
    fetch(`${API_URL}/api/evidence`)
      .then((res) => res.json())
      .then(setEvidence)
      .catch(() => console.error("Could not load evidence"));
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source", "manual_upload");

    try {
      const res = await fetch(`${API_URL}/api/evidence/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.detail}`);
      } else {
        fetchEvidence();
        setFile(null);
      }
    } catch (e) {
      alert("Upload failed: backend unreachable");
    }
    setUploading(false);
  };

  const handlePasteAnalyze = async () => {
    if (!headersText.trim()) return;
    setPasting(true);
    try {
      const res = await fetch(`${API_URL}/api/evidence/paste-headers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers_text: headersText,
          filename: "pasted_headers.eml",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Analysis failed: ${err.detail}`);
      } else {
        fetchEvidence();
        setHeadersText("");
      }
    } catch (e) {
      alert("Analysis failed: backend unreachable");
    }
    setPasting(false);
  };

  const handleVerify = async (id) => {
    const res = await fetch(`${API_URL}/api/evidence/${id}/verify`);
    const data = await res.json();
    setVerifyResults((prev) => ({ ...prev, [id]: data.verified }));
  };

  const handleAnalyze = async (id) => {
    setAnalyzing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_URL}/api/evidence/${id}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        fetchEvidence();
      } else {
        alert("Analysis failed");
      }
    } catch (e) {
      alert("Analysis failed: backend unreachable");
    }
    setAnalyzing((prev) => ({ ...prev, [id]: false }));
  };

  const handleRecommend = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/evidence/${id}/recommend`, {
        method: "POST",
      });
      if (res.ok) {
        fetchEvidence();
      } else {
        const err = await res.json();
        alert(`Recommendation failed: ${err.detail}`);
      }
    } catch (e) {
      alert("Recommendation failed: backend unreachable");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/api/evidence/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      alert("Search failed: backend unreachable");
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery("");
  };

  const displayedEvidence = searchResults ?? evidence;

  const toggleBtnStyle = (active) => ({
    background: active ? theme.colors.primary : theme.colors.surfaceAlt,
    color: active ? "#ffffff" : theme.colors.textPrimary,
    border: `1px solid ${active ? theme.colors.primary : theme.colors.border}`,
    borderRadius: "6px",
    padding: "0.4rem 1rem",
    marginRight: "0.5rem",
    cursor: "pointer",
  });

  return (
    <div style={styles.page}>
      <h2 style={styles.h1}>Evidence Collection</h2>

      <div style={{ marginBottom: "1rem" }}>
        <button style={toggleBtnStyle(inputMode === "file")} onClick={() => setInputMode("file")}>
          Upload File
        </button>
        <button style={toggleBtnStyle(inputMode === "paste")} onClick={() => setInputMode("paste")}>
          Paste Headers
        </button>
      </div>

      {inputMode === "file" ? (
        <div style={{ ...styles.card, marginBottom: "1.5rem", maxWidth: "500px" }}>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: "1rem" }}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      ) : (
        <div style={{ ...styles.card, marginBottom: "1.5rem", maxWidth: "600px" }}>
          <div style={styles.cardLabel}>Paste raw email headers below</div>
          <textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            placeholder="Paste the email header here..."
            rows={10}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: theme.colors.surface,
              color: theme.colors.textPrimary,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: "6px",
              padding: "0.75rem",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <button
            onClick={handlePasteAnalyze}
            disabled={pasting || !headersText.trim()}
            style={{ marginTop: "0.75rem" }}
          >
            {pasting ? "Analyzing..." : "Analyze Headers"}
          </button>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Semantic search (e.g. brute force login)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...styles.select, width: "300px" }}
        />
        <button onClick={handleSearch} style={{ marginLeft: "0.5rem" }}>
          Search
        </button>
        {searchResults && (
          <button onClick={handleClearSearch} style={{ marginLeft: "0.5rem" }}>
            Clear
          </button>
        )}
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Filename</th>
            <th style={styles.th}>Source</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>SHA-256 Hash</th>
            <th style={styles.th}>Integrity</th>
            <th style={styles.th}>AI Analysis</th>
            <th style={styles.th}>Compromised Assets</th>
            <th style={styles.th}>Report</th>
          </tr>
        </thead>
        <tbody>
          {displayedEvidence.map((e) => (
            <tr key={e.id}>
              <td style={styles.td}>{e.filename}</td>
              <td style={styles.td}>{e.source}</td>
              <td style={styles.td}>{e.status}</td>
              <td style={{ ...styles.td, fontFamily: "monospace", wordBreak: "break-all" }}>
                {e.hash_value}
              </td>
              <td style={styles.td}>
                <button onClick={() => handleVerify(e.id)}>Verify</button>
                {verifyResults[e.id] !== undefined && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: verifyResults[e.id] ? theme.colors.severity.Low : theme.colors.severity.High,
                    }}
                  >
                    {verifyResults[e.id] ? "✔ Verified" : "✘ Tampered"}
                  </span>
                )}
              </td>
              <td style={styles.td}>
                {e.ai_analysis ? (
                  <div>
                    <div>
                      <strong>{e.ai_analysis.attack_type}</strong> ({e.ai_analysis.severity})
                    </div>
                    <div style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>
                      {e.ai_analysis.threat_summary}
                    </div>
                    <div style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
                      <strong>Entry:</strong> {e.ai_analysis.entry_point}
                    </div>
                    <div style={{ fontSize: "0.75rem" }}>
                      <strong>Vector:</strong> {e.ai_analysis.attack_vector}
                      {e.ai_analysis.mitre_technique && (
                        <span style={{ color: theme.colors.accent }}> ({e.ai_analysis.mitre_technique})</span>
                      )}
                    </div>
                    <div style={{ marginTop: "0.3rem" }}>
                      {e.recommendations ? (
                        <div style={{ fontSize: "0.75rem", color: theme.colors.severity.Low }}>
                          ✔ Recommendations generated ({e.recommendations.containment_steps.length} containment steps)
                        </div>
                      ) : (
                        <button onClick={() => handleRecommend(e.id)}>Generate Recommendations</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button onClick={() => handleAnalyze(e.id)} disabled={analyzing[e.id]}>
                    {analyzing[e.id] ? "Analyzing..." : "Analyze"}
                  </button>
                )}
              </td>
              <td style={styles.td}>
                {e.ai_analysis && e.ai_analysis.compromised_assets && e.ai_analysis.compromised_assets.length > 0 ? (
                  <div>
                    {e.ai_analysis.compromised_assets.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.75rem",
                          color: severityColor(a.severity),
                          marginBottom: "0.15rem",
                        }}
                      >
                        [{a.asset_type}] {a.value}
                      </div>
                    ))}
                  </div>
                ) : e.ai_analysis ? (
                  <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>None identified</span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>-</span>
                )}
              </td>
              <td style={styles.td}>
                <a href={API_URL + "/api/evidence/" + e.id + "/report"} target="_blank" rel="noopener noreferrer">
                  <button>Download Report</button>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EvidenceTable;