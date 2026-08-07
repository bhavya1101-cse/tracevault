import { useEffect, useState } from "react";
import TimelineItem from "../components/TimelineItem";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function Timeline() {
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at)
        );
        setEvidence(sorted);
      })
      .catch(() => console.error("Could not load evidence"));
  }, []);

  return (
    <div style={{ padding: "2rem", background: "#0d1117", minHeight: "100vh", color: "#c9d1d9" }}>
      <h1 style={{ color: "#58a6ff", marginBottom: "1.5rem" }}>Attack Timeline Reconstruction</h1>
      {evidence.length === 0 ? (
        <p style={{ color: "#8b949e" }}>No evidence collected yet.</p>
      ) : (
        evidence.map((e, i) => <TimelineItem key={e.id} evidence={e} index={i} />)
      )}
    </div>
  );
}

export default Timeline;