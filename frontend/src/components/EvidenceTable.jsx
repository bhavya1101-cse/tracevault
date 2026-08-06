import { useEffect, useState } from "react";

function EvidenceTable() {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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

  return (
    <div style={{ padding: "2rem", color: "#c9d1d9", background: "#0d1117", minHeight: "100vh" }}>
      <h2 style={{ color: "#58a6ff" }}>Evidence Collection</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload} disabled={uploading || !file} style={{ marginLeft: "1rem" }}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #30363d" }}>
            <th style={{ textAlign: "left" }}>Filename</th>
            <th style={{ textAlign: "left" }}>Source</th>
            <th style={{ textAlign: "left" }}>Event Type</th>
            <th style={{ textAlign: "left" }}>Status</th>
            <th style={{ textAlign: "left" }}>Uploaded At</th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((e) => (
            <tr key={e.id} style={{ borderBottom: "1px solid #21262d" }}>
              <td>{e.filename}</td>
              <td>{e.source}</td>
              <td>{e.event_type}</td>
              <td>{e.status}</td>
              <td>{new Date(e.uploaded_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EvidenceTable;