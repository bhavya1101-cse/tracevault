import { useEffect, useState, useCallback } from "react";
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges } from "reactflow";
import "reactflow/dist/style.css";
import { theme, styles, severityColor } from "../theme";
import { apiFetch } from "../api_v2";

function nodeStyle(color) {
  return {
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `2px solid ${color}`,
    borderRadius: theme.radius.sm,
    padding: "10px",
    fontFamily: theme.font.family,
    fontSize: theme.font.sizeSmall,
  };
}

const baseNodes = [
  { id: "attacker", position: { x: 0, y: 0 }, data: { label: "Attacker" }, style: nodeStyle(theme.colors.severity.High) },
  { id: "laptop", position: { x: 250, y: 0 }, data: { label: "Employee Laptop" }, style: nodeStyle(theme.colors.severity.Medium) },
  { id: "fileserver", position: { x: 500, y: 0 }, data: { label: "File Server" }, style: nodeStyle(theme.colors.severity.Medium) },
  { id: "database", position: { x: 750, y: 0 }, data: { label: "Database" }, style: nodeStyle(theme.colors.severity.High) },
  { id: "dc", position: { x: 1000, y: 0 }, data: { label: "Domain Controller" }, style: nodeStyle(theme.colors.severity.Critical) },
];

const baseEdges = [
  { id: "e1", source: "attacker", target: "laptop", animated: true, style: { stroke: theme.colors.primary } },
  { id: "e2", source: "laptop", target: "fileserver", animated: true, style: { stroke: theme.colors.primary } },
  { id: "e3", source: "fileserver", target: "database", animated: true, style: { stroke: theme.colors.primary } },
  { id: "e4", source: "database", target: "dc", animated: true, style: { stroke: theme.colors.primary } },
];

function NetworkGraph() {
  const [nodes, setNodes] = useState(baseNodes);
  const [edges, setEdges] = useState(baseEdges);
  const [evidenceCount, setEvidenceCount] = useState(0);

  useEffect(() => {
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then((data) => {
        setEvidenceCount(data.length);
        const analyzed = data.filter((e) => e.ai_analysis);
        if (analyzed.length > 0) {
          const dynamicNodes = [
            { id: "attacker", position: { x: 0, y: 0 }, data: { label: "Attacker" }, style: nodeStyle(theme.colors.severity.High) },
            ...analyzed.map((e, i) => ({
              id: e.id,
              position: { x: (i + 1) * 250, y: 0 },
              data: { label: `${e.ai_analysis.entry_point} (${e.filename})` },
              style: nodeStyle(severityColor(e.ai_analysis.severity)),
            })),
          ];
          const dynamicEdges = analyzed.map((e, i) => ({
            id: `edge-${i}`,
            source: i === 0 ? "attacker" : analyzed[i - 1].id,
            target: e.id,
            animated: true,
            style: { stroke: theme.colors.primary },
          }));
          setNodes(dynamicNodes);
          setEdges(dynamicEdges);
        }
      })
      .catch((e) => console.error("Could not load evidence:", e.message));
  }, []);

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
      <h1 style={styles.h1}>Attack Path — Network Graph</h1>
      <p style={styles.subtitle}>
        Attack path based on {evidenceCount} pieces of evidence collected. Drag nodes to rearrange.
      </p>
      <div style={{ height: "500px", background: theme.colors.surface, borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}` }}>
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
    </div>
  );
}

export default NetworkGraph;