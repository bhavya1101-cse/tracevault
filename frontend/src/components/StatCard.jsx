function StatCard({ label, value, color }) {
  return (
    <div
      style={{
        background: "#E1DCE0",
        border: `1px solid ${color}33`,
        borderRadius: "10px",
        padding: "1.25rem",
        flex: 1,
        minWidth: "180px",
      }}
    >
      <div style={{ color: "#131314", fontSize: "0.85rem", marginBottom: "0.4rem" }}>{label}</div>
      <div style={{ color: color, fontSize: "1.8rem", fontWeight: "bold" }}>{value}</div>
    </div>
  );
}

export default StatCard;