import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StatCard from "../components/StatCard";
import { theme, styles } from "../theme";
import { apiFetch } from "../api_v2";

function Dashboard() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/api/evidence")
      .then((res) => res.json())
      .then((data) => {
        setEvidence(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error("Could not load evidence:", e.message);
        setError("Could not load your evidence. If the backend was idle, this can take up to a minute — try refreshing.");
        setLoading(false);
      });
  }, []);

  const totalIncidents = evidence.length;
  const activeAlerts = evidence.filter((e) => e.status !== "resolved").length;
  const riskLevel = totalIncidents > 5 ? "High" : totalIncidents > 0 ? "Medium" : "Low";
  const latestAttack = evidence.length > 0 ? evidence[evidence.length - 1].filename : "None";

  const chartData = evidence.map((e, i) => ({
    name: `#${i + 1}`,
    uploads: i + 1,
  }));

  const riskColor =
    riskLevel === "High" ? theme.colors.severity.High
    : riskLevel === "Medium" ? theme.colors.severity.Medium
    : theme.colors.severity.Low;

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>TraceVault — Email Threat Intelligence Dashboard</h1>

      {loading ? (
        <p style={styles.emptyState}>Loading evidence... (first load can take a minute if the server was idle)</p>
      ) : error ? (
        <p style={{ ...styles.emptyState, color: theme.colors.severity.High }}>{error}</p>
      ) : (
        <>
          <div style={styles.cardGrid}>
            <StatCard label="Emails Analyzed" value={totalIncidents} color={theme.colors.primary} />
            <StatCard label="Active Alerts" value={activeAlerts} color={theme.colors.accent} />
            <StatCard label="Risk Level" value={riskLevel} color={riskColor} />
            <StatCard label="Latest Threat" value={latestAttack} color={theme.colors.status.info} />
            <StatCard
              label="Investigation Status"
              value={totalIncidents > 0 ? "In Progress" : "Idle"}
              color={theme.colors.severity.Medium}
            />
          </div>

          <div style={styles.card}>
            <h3 style={styles.h2}>Threat Detections Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.colors.border} />
                <XAxis dataKey="name" stroke={theme.colors.textMuted} />
                <YAxis stroke={theme.colors.textMuted} />
                <Tooltip
                  contentStyle={{
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.sm,
                  }}
                />
                <Line type="monotone" dataKey="uploads" stroke={theme.colors.primary} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;