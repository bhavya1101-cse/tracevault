import { useEffect, useState } from "react";
import { theme, styles, severityColor } from "../theme";
import { apiFetch } from "../api_v2";

function EvidenceTable() {
  const [evidence, setEvidence] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [verifyResults, setVerifyResults] = useState({});
  const [analyzing, setAnalyzing] = useState({});
  const [downloading, setDownloading] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);

  const [inputMode, setInputMode] = useState("file"); // "file" | "paste"
  const [headersText, setHeadersText] = useState("");
  const [pasting, setPasting] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAnalyzing, setBulkAnalyzing] = useState(false);

  const fetchEvidence = () => {
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then(setEvidence)
      .catch((e) => console.error("Could not load evidence:", e.message));
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
      await apiFetch("/api/evidence/upload", { method: "POST", body: formData });
      fetchEvidence();
      setFile(null);
    } catch (e) {
      alert(`Upload failed: ${e.message}`);
    }
    setUploading(false);
  };

  const handlePasteAnalyze = async () => {
    if (!headersText.trim()) return;
    setPasting(true);
    try {
      await apiFetch("/api/evidence/paste-headers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers_text: headersText,
          filename: "pasted_headers.eml",
        }),
      });
      fetchEvidence();
      setHeadersText("");
    } catch (e) {
      alert(`Analysis failed: ${e.message}`);
    }
    setPasting(false);
  };

  const handleVerify = async (id) => {
    try {
      const res = await apiFetch(`/api/evidence/${id}/verify`);
      const data = await res.json();
      setVerifyResults((prev) => ({ ...prev, [id]: data.verified }));
    } catch (e) {
      alert(`Verify failed: ${e.message}`);
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzing((prev) => ({ ...prev, [id]: true }));
    try {
      await apiFetch(`/api/evidence/${id}/analyze`, { method: "POST" });
      fetchEvidence();
    } catch (e) {
      alert(`Analysis failed: ${e.message}`);
    }
    setAnalyzing((prev) => ({ ...prev, [id]: false }));
  };

  const handleRecommend = async (id) => {
    try {
      await apiFetch(`/api/evidence/${id}/recommend`, { method: "POST" });
      fetchEvidence();
    } catch (e) {
      alert(`Recommendation failed: ${e.message}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    try {
      const res = await apiFetch(`/api/evidence/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(await res.json());
    } catch (e) {
      alert(`Search failed: ${e.message}`);
    }
  };

  const handleClearSearch = () => {
    setSearchResults(null);
    setSearchQuery("");
  };

  const handleDownloadReport = async (id, filename) => {
    setDownloading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/evidence/${id}/report`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${filename}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Report download failed: ${e.message}`);
    }
    setDownloading((prev) => ({ ...prev, [id]: false }));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allDisplayedSelected =
    displayedEvidenceIds().length > 0 &&
    displayedEvidenceIds().every((id) => selectedIds.has(id));

  function displayedEvidenceIds() {
    return (searchResults ?? evidence).map((e) => e.id);
  }

  const toggleSelectAll = () => {
    const ids = displayedEvidenceIds();
    setSelectedIds((prev) => {
      const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(ids);
    });
  };

  const handleBulkAnalyze = async () => {
    if (selectedIds.size === 0) return;
    setBulkAnalyzing(true);
    try {
      const res = await apiFetch("/api/evidence/bulk-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.from(selectedIds)),
      });
      const data = await res.json();
      const failed = data.results.filter((r) => r.status === "error");
      if (failed.length > 0) {
        alert(`${failed.length} of ${data.results.length} failed. Check console for details.`);
        console.error("Bulk analyze failures:", failed);
      }
      setSelectedIds(new Set());
      fetchEvidence();
    } catch (e) {
      alert(`Bulk investigate failed: ${e.message}`);
    }
    setBulkAnalyzing(false);
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

      <div style={{ marginBottom: "0.75rem" }}>
        <button
          onClick={handleBulkAnalyze}
          disabled={selectedIds.size === 0 || bulkAnalyzing}
          style={{
            background: theme.colors.primary,
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem 1rem",
            cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
            opacity: selectedIds.size === 0 ? 0.5 : 1,
          }}
        >
          {bulkAnalyzing
            ? "Investigating..."
            : `Investigate Selected (${selectedIds.size})`}
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              <input type="checkbox" checked={allDisplayedSelected} onChange={toggleSelectAll} />
            </th>
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
              <td style={styles.td}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(e.id)}
                  onChange={() => toggleSelect(e.id)}
                />
              </td>
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
                {e.status === "analyzed" ? (
                  <button onClick={() => handleDownloadReport(e.id, e.filename)} disabled={downloading[e.id]}>
                    {downloading[e.id] ? "Downloading..." : "Download Report"}
                  </button>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: theme.colors.textMuted }}>—</span>
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