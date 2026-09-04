import { useEffect, useState } from "react";
import TimelineItem from "../components/TimelineItem";
import { styles } from "../theme";

function Timeline() {
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/evidence")
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