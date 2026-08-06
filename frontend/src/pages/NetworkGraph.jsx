import { useEffect, useState, useCallback } from "react";
import ReactFlow, { Background, Controls, applyNodeChanges, applyEdgeChanges } from "reactflow";
import "reactflow/dist/style.css";

const baseNodes = [
  { id: "attacker", position: { x: 0, y: 0 }, data: { label: "Attacker" }, style: nodeStyle("#f85149") },
  { id: "laptop", position: { x: 250, y: 0 }, data: { label: "Employee Laptop" }, style: nodeStyle("#d29922") },
  { id: "fileserver", position: { x: 500, y: 0 }, data: { label: "File Server" }, style: nodeStyle("#d29922") },
  { id: "database", position: { x: 750, y: 0 }, data: { label: "Database" }, style: nodeStyle("#f85149") },
  { id: "dc", position: { x: 1000, y: 0 }, data: { label: "Domain Controller" }, style: nodeStyle("#da3633") },
];

const baseEdges = [
  { id: "e1", source: "attacker", target: "laptop", animated: true, style: { stroke: "#58a6ff" } },
  { id: "e2", source: "laptop", target: "fileserver", animated: true, style: { stroke: "#58a6ff" } },
  { id: "e3", source: "fileserver", target: "database", animated: true, style: { stroke: "#58a6ff" } },
  { id: "e4", source: "database", target: "dc", animated: true, style: { stroke: "#58a6ff" } },
];

function nodeStyle(color) {
  return {
    background: "#161b22",
    color: "#c9d1d9",
    border: `2px solid ${color}`,
    borderRadius: "8px",
    padding: "10px",
  };
}

function NetworkGraph() {
  const [nodes, setNodes] = useState(baseNodes);
  const [edges, setEdges] = useState(baseEdges);
  const [evidenceCount, setEvidenceCount] = useState(0);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/evidence")
      .then((res) => res.json())
      .then((data) => setEvidenceCount(data.length))
      .catch(() => console.error("Could not load evidence"));
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
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#c9d1d9", padding: "2rem" }}>
      <h1 style={{ color: "#58a6ff" }}>Attack Path — Network Graph</h1>
      <p style={{ color: "#8b949e" }}>
        Representative attack path based on {evidenceCount} pieces of evidence collected. Drag nodes to
        rearrange; this will connect to real extracted asset data in Module 8 (Root Cause Analysis).
      </p>
      <div style={{ height: "500px", background: "#161b22", borderRadius: "10px" }}>
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
    </div>
  );
}

export default NetworkGraph;