import { useEffect, useState } from "react";

function EvidenceTable() {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({});
  const [analyzing, setAnalyzing] = useState({});

  const fetchEvidence = () => {
    fetch("http://127.0.0.1:8000/api/evidence")
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
      const res = await fetch("http://127.0.0.1:8000/api/evidence/upload", {
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
    const res = await fetch(`http://127.0.0.1:8000/api/evidence/${id}/verify`);
    const data = await res.json();
    setVerifyResults((prev) => ({ ...prev, [id]: data.verified }));
  };

  const handleAnalyze = async (id) => {
    setAnalyzing((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/evidence/${id}/analyze`, {
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

  return (
    <div style={{ padding: "2rem", color: "#c9d1d9", background: "#0d1117", minHeight: "100vh" }}>
      <h2 style={{ color: "#58a6ff" }}>Evidence Collection</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: "1rem" }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
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
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
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
                  </div>
                ) : (
                  <button onClick={() => handleAnalyze(e.id)} disabled={analyzing[e.id]}>
                    {analyzing[e.id] ? "Analyzing..." : "Analyze"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EvidenceTable;