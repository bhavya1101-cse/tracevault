// TraceVault design system - central theme tokens + shared inline styles.
// Light "clean forensic workspace" aesthetic: warm off-white surfaces,
// the terracotta brand accent, dark readable text.

export const theme = {
  colors: {
    bg: "#faf9f6",
    surface: "#ffffff",
    surfaceAlt: "#f4f2ed",
    surfaceHover: "#efece4",
    border: "#e3e0d7",
    borderStrong: "#cfcabd",

    primary: "#b96a48",
    primaryHover: "#a35a3a",
    primaryMuted: "rgba(185, 106, 72, 0.10)",
    accent: "#1f7a72",
    accentMuted: "rgba(31, 122, 114, 0.10)",

    textPrimary: "#211d19",
    textSecondary: "#4a453f",
    textMuted: "#7a746c",

    severity: {
      Critical: "#a5271c",
      High: "#c0522f",
      Medium: "#a9720f",
      Low: "#2e7d4f",
    },

    status: {
      info: "#1f7a72",
      success: "#2e7d4f",
      warning: "#a9720f",
      danger: "#a5271c",
    },
  },

  radius: { sm: "8px", md: "12px", lg: "18px", pill: "999px" },

  font: {
    family: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
    sizeSmall: "0.8rem",
    sizeBase: "0.95rem",
    sizeLarge: "1.15rem",
  },

  shadow: {
    card: "0 1px 3px rgba(33, 29, 25, 0.06), 0 1px 2px rgba(33, 29, 25, 0.04)",
    glow: "0 0 0 1px rgba(185,106,72,0.15)",
  },
};

function severityColor(sev) {
  return theme.colors.severity[sev] || theme.colors.textMuted;
}

function confidenceColor(conf) {
  switch ((conf || "").toLowerCase()) {
    case "high": return theme.colors.status.success;
    case "medium": return theme.colors.status.warning;
    default: return theme.colors.textMuted;
  }
}

export const styles = {
  appShell: {
    minHeight: "100vh",
    background: theme.colors.bg,
    color: theme.colors.textPrimary,
    fontFamily: theme.font.family,
    display: "flex",
    flexDirection: "column",
  },

  page: {
    flex: 1,
    maxWidth: "1180px",
    width: "100%",
    margin: "0 auto",
    padding: "2.5rem 2rem 4rem",
    boxSizing: "border-box",
  },

  h1: {
    fontSize: "1.9rem",
    fontWeight: 800,
    color: theme.colors.textPrimary,
    margin: "0 0 0.5rem",
    letterSpacing: "-0.01em",
  },
  h2: {
    fontSize: "1.15rem",
    fontWeight: 700,
    color: theme.colors.textPrimary,
    margin: "0 0 0.75rem",
  },
  subtitle: {
    fontSize: theme.font.sizeBase,
    color: theme.colors.textMuted,
    margin: "0 0 1.75rem",
    maxWidth: "640px",
    lineHeight: 1.6,
  },

  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: "1.25rem 1.5rem",
    boxShadow: theme.shadow.card,
  },
  cardLabel: {
    fontSize: theme.font.sizeSmall,
    fontWeight: 700,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.5rem",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "1.75rem",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: theme.font.sizeBase,
  },
  th: {
    textAlign: "left",
    fontSize: theme.font.sizeSmall,
    fontWeight: 700,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    padding: "0.65rem 0.75rem",
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: "0.75rem",
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    verticalAlign: "top",
  },

  select: {
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: "0.55rem 0.75rem",
    fontSize: theme.font.sizeBase,
  },

  badge: (color) => ({
    display: "inline-block",
    padding: "0.2rem 0.6rem",
    borderRadius: theme.radius.pill,
    fontSize: "0.72rem",
    fontWeight: 700,
    color,
    background: `${color}18`,
    border: `1px solid ${color}44`,
  }),

  mutedText: { color: theme.colors.textMuted, fontSize: theme.font.sizeSmall },
  emptyState: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeBase,
    padding: "2.5rem 0",
    textAlign: "center",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: "rgba(250, 249, 246, 0.92)",
    backdropFilter: "blur(8px)",
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  headerInner: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "0.9rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  logoWrap: { display: "flex", alignItems: "center", gap: "0.65rem" },
  logoMark: {
    width: "34px",
    height: "34px",
    borderRadius: theme.radius.sm,
    background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    boxShadow: theme.shadow.glow,
    flexShrink: 0,
  },
  logoText: {
    fontSize: "1.15rem",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    color: theme.colors.textPrimary,
  },
  logoSub: {
    fontSize: "0.68rem",
    color: theme.colors.textMuted,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginTop: "-2px",
  },

  nav: { display: "flex", gap: "0.25rem", flexWrap: "wrap" },
  navLink: (active) => ({
    padding: "0.5rem 0.85rem",
    borderRadius: theme.radius.sm,
    fontSize: "0.85rem",
    fontWeight: 600,
    textDecoration: "none",
    color: active ? theme.colors.textPrimary : theme.colors.textMuted,
    background: active ? theme.colors.surfaceAlt : "transparent",
    border: active ? `1px solid ${theme.colors.border}` : "1px solid transparent",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
  }),

  statusPill: (state) => {
    const map = {
      online: { color: theme.colors.status.success, bg: "rgba(46,125,79,0.08)", border: "rgba(46,125,79,0.25)" },
      offline: { color: theme.colors.status.warning, bg: "rgba(169,114,15,0.08)", border: "rgba(169,114,15,0.25)" },
      checking: { color: theme.colors.textMuted, bg: "rgba(122,116,108,0.08)", border: "rgba(122,116,108,0.25)" },
    };
    const c = map[state] || map.checking;
    return {
      display: "flex", alignItems: "center", gap: "0.4rem",
      fontSize: "0.72rem", fontWeight: 700, color: c.color,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: theme.radius.pill, padding: "0.3rem 0.7rem",
      whiteSpace: "nowrap",
    };
  },
  statusDot: (state) => {
    const map = {
      online: theme.colors.status.success,
      offline: theme.colors.status.warning,
      checking: theme.colors.textMuted,
    };
    const color = map[state] || map.checking;
    return { width: "6px", height: "6px", borderRadius: "50%", background: color };
  },

  footer: { borderTop: `1px solid ${theme.colors.border}`, marginTop: "3rem" },
  footerInner: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "2rem",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
  },
  footerText: { fontSize: "0.78rem", color: theme.colors.textMuted },
  footerLinks: { display: "flex", gap: "1.25rem", alignItems: "center" },
  footerLink: { fontSize: "0.78rem", color: theme.colors.textMuted, textDecoration: "none" },

  hero: {
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    background: `linear-gradient(135deg, ${theme.colors.primaryMuted}, ${theme.colors.accentMuted})`,
    padding: "2.25rem 2rem",
    marginBottom: "2rem",
  },
  heroKicker: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.colors.accent,
    background: theme.colors.accentMuted,
    border: "1px solid rgba(31,122,114,0.25)",
    borderRadius: theme.radius.pill,
    padding: "0.3rem 0.75rem",
    marginBottom: "1rem",
  },
};

export { severityColor, confidenceColor };