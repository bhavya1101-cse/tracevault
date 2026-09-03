import { useEffect, useState, useCallback, useMemo } from "react";
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges } from "reactflow";
import "reactflow/dist/style.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const confidenceColor = (level) =>
  level === "High" ? "#3fb950" : level === "Medium" ? "#d29922" : "#f85149";

function hopNodeStyle(color) {
  return {
    background: "#161b22",
    color: "#c9d1d9",
    border: `2px solid ${color}`,
    borderRadius: "8px",
    padding: "10px",
    fontSize: "0.8rem",
    width: 200,
  };
}

function GeoTrace() {
  const [evidence, setEvidence] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((res) => res.json())
      .then((data) => {
        const withGeo = data.filter((e) => e.geo_trace && e.geo_trace.length > 0);
        setEvidence(withGeo);
        if (withGeo.length > 0) setSelectedId(withGeo[withGeo.length - 1].id);
      })
      .catch(() => console.error("Could not load evidence"));
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
    const hops = selected.geo_trace;
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
      style: { stroke: "#58a6ff" },
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
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#c9d1d9", padding: "2rem" }}>
      <h1 style={{ color: "#58a6ff" }}>GeoLocation Trace</h1>
      <p style={{ color: "#8b949e" }}>
        Relay path reconstructed from email header hops. Confidence reflects reliability of the
        IP-registry signal, not certainty of attacker identity or physical location.
      </p>

      {evidence.length === 0 ? (
        <p style={{ color: "#8b949e" }}>
          No analyzed emails with a geo trace yet. Upload and analyze a .eml file first.
        </p>
      ) : (
        <>
          <select
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              background: "#161b22",
              color: "#c9d1d9",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {evidence.map((e) => (
              <option key={e.id} value={e.id}>
                {e.filename}
              </option>
            ))}
          </select>

          <div style={{ height: "320px", background: "#161b22", borderRadius: "10px", marginBottom: "1.5rem" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background color="#30363d" />
              <Controls />
            </ReactFlow>
          </div>

          <div style={{ background: "#161b22", borderRadius: "10px", padding: "1.25rem" }}>
            <h3 style={{ color: "#8b949e", marginTop: 0 }}>Hop Details</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#8b949e", borderBottom: "1px solid #30363d" }}>
                  <th style={{ padding: "0.5rem" }}>Hop</th>
                  <th style={{ padding: "0.5rem" }}>IP Address</th>
                  <th style={{ padding: "0.5rem" }}>Location</th>
                  <th style={{ padding: "0.5rem" }}>ISP</th>
                  <th style={{ padding: "0.5rem" }}>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {selected?.geo_trace.map((h, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #21262d" }}>
                    <td style={{ padding: "0.5rem" }}>{i + 1}</td>
                    <td style={{ padding: "0.5rem" }}>{h.ip}</td>
                    <td style={{ padding: "0.5rem" }}>
                      {h.city || "Unknown"}, {h.country || "Unknown"}
                    </td>
                    <td style={{ padding: "0.5rem" }}>{h.isp || "Unknown"}</td>
                    <td style={{ padding: "0.5rem", color: confidenceColor(h.confidence), fontWeight: "bold" }}>
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