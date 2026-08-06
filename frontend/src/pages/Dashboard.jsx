import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "../components/StatCard";

function Dashboard() {
  const [evidence, setEvidence] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/evidence")
      .then((res) => res.json())
      .then(setEvidence)
      .catch(() => console.error("Could not load evidence"));
  }, []);

  const totalIncidents = evidence.length;
  const activeAlerts = evidence.filter((e) => e.status !== "resolved").length;
  const riskLevel = totalIncidents > 5 ? "High" : totalIncidents > 0 ? "Medium" : "Low";
  const latestAttack = evidence.length > 0 ? evidence[evidence.length - 1].filename : "None";

  const chartData = evidence.map((e, i) => ({
    name: `#${i + 1}`,
    uploads: i + 1,
  }));

  const riskColor = riskLevel === "High" ? "#f85149" : riskLevel === "Medium" ? "#d29922" : "#3fb950";

  return (
    <div style={{ padding: "2rem", background: "#0d1117", minHeight: "100vh", color: "#c9d1d9" }}>
      <h1 style={{ color: "#58a6ff", marginBottom: "1.5rem" }}>Cyber Black Box — SOC Dashboard</h1>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
        <StatCard label="Total Incidents" value={totalIncidents} color="#58a6ff" />
        <StatCard label="Active Alerts" value={activeAlerts} color="#a371f7" />
        <StatCard label="Risk Level" value={riskLevel} color={riskColor} />
        <StatCard label="Latest Attack" value={latestAttack} color="#39c5cf" />
        <StatCard label="Investigation Status" value={totalIncidents > 0 ? "In Progress" : "Idle"} color="#d29922" />
      </div>

      <div style={{ background: "#161b22", borderRadius: "10px", padding: "1.5rem" }}>
        <h3 style={{ color: "#8b949e", marginTop: 0 }}>Evidence Collected Over Time</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="name" stroke="#8b949e" />
            <YAxis stroke="#8b949e" />
            <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d" }} />
            <Line type="monotone" dataKey="uploads" stroke="#58a6ff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default Dashboard;