import { theme, styles } from "../theme";

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${color || theme.colors.primary}` }}>
      <div style={styles.cardLabel}>{label}</div>
      <div
        style={{
          fontSize: "1.6rem",
          fontWeight: 800,
          color: theme.colors.textPrimary,
          lineHeight: 1.2,
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default StatCard;