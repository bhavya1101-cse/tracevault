import { useEffect, useState } from "react";
import TimelineItem from "../components/TimelineItem";
import { styles } from "../theme";
import { apiFetch } from "../api_v2";

function Timeline() {
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at)
        );
        setEvidence(sorted);
      })
      .catch((e) => console.error("Could not load evidence:", e.message));
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Attack Timeline Reconstruction</h1>
      {evidence.length === 0 ? (
        <p style={styles.emptyState}>No evidence collected yet.</p>
      ) : (
        evidence.map((e, i) => <TimelineItem key={e.id} evidence={e} index={i} />)
      )}
    </div>
  );
}

export default Timeline;