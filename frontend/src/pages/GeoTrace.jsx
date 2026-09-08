import { useEffect, useState, useCallback, useMemo } from "react";
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges } from "reactflow";
import "reactflow/dist/style.css";
import { theme, styles, confidenceColor } from "../theme";
import { apiFetch } from "../api_v2";

function hopNodeStyle(color) {
  return {
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `2px solid ${color}`,
    borderRadius: theme.radius.sm,
    padding: "10px",
    fontSize: theme.font.sizeSmall,
    width: 200,
  };
}

function GeoTrace() {
  const [evidence, setEvidence] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then((data) => {
        const withGeo = data.filter(
          (e) => e.ai_analysis?.geo_trace && e.ai_analysis.geo_trace.length > 0
        );
        setEvidence(withGeo);
        if (withGeo.length > 0) setSelectedId(withGeo[withGeo.length - 1].id);
      })
      .catch((e) => console.error("Could not load evidence:", e.message));
  }, []);

  const selected = useMemo(
    () => evidence.find((e) => e.id === selectedId),
    [evidence, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const hops = selected.ai_analysis.geo_trace;
    const dynamicNodes = hops.map((h, i) => ({
      id: `hop-${i}`,
      position: { x: i * 260, y: 0 },
      data: {
        label: `Hop ${i + 1} — ${h.ip}\n${h.city || "Unknown"}, ${h.country || "Unknown"}\n${h.confidence} confidence`,
      },
      style: hopNodeStyle(confidenceColor(h.confidence)),
    }));
    const dynamicEdges = hops.slice(1).map((_, i) => ({
      id: `geo-edge-${i}`,
      source: `hop-${i}`,
      target: `hop-${i + 1}`,
      animated: true,
      style: { stroke: theme.colors.primary },
    }));
    setNodes(dynamicNodes);
    setEdges(dynamicEdges);
  }, [selected]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>GeoLocation Trace</h1>
      <p style={styles.subtitle}>
        Relay path reconstructed from email header hops. Confidence reflects reliability of the
        IP-registry signal, not certainty of attacker identity or physical location.
      </p>

      {evidence.length === 0 ? (
        <p style={styles.emptyState}>
          No analyzed emails with a geo trace yet. Upload and analyze a .eml file first.
        </p>
      ) : (
        <>
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ ...styles.select, marginBottom: "1.5rem" }}
          >
            {evidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.filename}
              </option>
            ))}
          </select>

          <div
            style={{
              height: "320px",
              background: theme.colors.surface,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`,
              marginBottom: "1.5rem",
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background color={theme.colors.border} />
              <Controls />
            </ReactFlow>
          </div>

          <div style={styles.card}>
            <h3 style={{ ...styles.h2, marginTop: 0 }}>Hop Details</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Hop</th>
                  <th style={styles.th}>IP Address</th>
                  <th style={styles.th}>Location</th>
                  <th style={styles.th}>ISP</th>
                  <th style={styles.th}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {selected?.ai_analysis.geo_trace.map((h, i) => (
                  <tr key={i}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}>{h.ip}</td>
                    <td style={styles.td}>
                      {h.city || "Unknown"}, {h.country || "Unknown"}
                    </td>
                    <td style={styles.td}>{h.isp || "Unknown"}</td>
                    <td style={{ ...styles.td, color: confidenceColor(h.confidence), fontWeight: "bold" }}>
                      {h.confidence}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default GeoTrace;