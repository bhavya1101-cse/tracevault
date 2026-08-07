import { useEffect, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function EvidenceTable() {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  const severityColors = {
    Low: "#3fb950",
    Medium: "#d29922",
    High: "#f85149",
    Critical: "#da3633",
  };

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

  return (
    <div style={{ padding: "2rem", color: "#c9d1d9", background: "#0d1117", minHeight: "100vh" }}>
      <h2 style={{ color: "#58a6ff" }}>Evidence Collection</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: "1rem" }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Semantic search (e.g. brute force login)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "300px" }}
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

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #30363d" }}>
            <th style={{ textAlign: "left" }}>Filename</th>
            <th style={{ textAlign: "left" }}>Source</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "left" }}>SHA-256 Hash</th>
            <th style={{ textAlign: "left" }}>Integrity</th>
            <th style={{ textAlign: "left" }}>AI Analysis</th>
            <th style={{ textAlign: "left" }}>Compromised Assets</th>
            <th style={{ textAlign: "left" }}>Report</th>
          </tr>
        </thead>
        <tbody>
          {displayedEvidence.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #21262d" }}>
              <td>{e.filename}</td>
              <td>{e.source}</td>
              <td>{e.status}</td>
              <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{e.hash_value}</td>
              <td>
                <button onClick={() => handleVerify(e.id)}>Verify</button>
                {verifyResults[e.id] !== undefined && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      color: verifyResults[e.id] ? "#3fb950" : "#f85149",
                    }}
                  >
                    {verifyResults[e.id] ? "✔ Verified" : "✘ Tampered"}
                  </span>
                )}
              </td>
              <td>
                {e.ai_analysis ? (
                  <div>
                    <div>
                      <strong>{e.ai_analysis.attack_type}</strong> ({e.ai_analysis.severity})
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8b949e" }}>
                      {e.ai_analysis.threat_summary}
                    </div>
                    <div style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
                      <strong>Entry:</strong> {e.ai_analysis.entry_point}
                    </div>
                    <div style={{ fontSize: "0.75rem" }}>
                      <strong>Vector:</strong> {e.ai_analysis.attack_vector}
                      {e.ai_analysis.mitre_technique && (
                        <span style={{ color: "#39c5cf" }}> ({e.ai_analysis.mitre_technique})</span>
                      )}
                    </div>
                    <div style={{ marginTop: "0.3rem" }}>
                      {e.recommendations ? (
                        <div style={{ fontSize: "0.75rem", color: "#3fb950" }}>
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
              <td>
                {e.ai_analysis && e.ai_analysis.compromised_assets && e.ai_analysis.compromised_assets.length > 0 ? (
                  <div>
                    {e.ai_analysis.compromised_assets.map((a, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "0.75rem",
                          color: severityColors[a.severity] || "#8b949e",
                          marginBottom: "0.15rem",
                        }}
                      >
                        [{a.asset_type}] {a.value}
                      </div>
                    ))}
                  </div>
                ) : e.ai_analysis ? (
                  <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>None identified</span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>-</span>
                )}
              </td>
              <td>
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