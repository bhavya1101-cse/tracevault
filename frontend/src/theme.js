// TraceVault shared design tokens.
// A lightweight, dependency-free "design system" — import these into every
// page instead of hardcoding colors/spacing, so the whole app stays visually
// consistent as more pages get added. No new npm packages required.

export const theme = {
  colors: {
    bg: "#0d1117",
    surface: "#161b22",
    surfaceAlt: "#1c2128",
    border: "#30363d",
    borderSubtle: "#21262d",
    primary: "#58a6ff",
    accent: "#39c5cf",
    textPrimary: "#c9d1d9",
    textMuted: "#8b949e",
    severity: {
      Low: "#3fb950",
      Medium: "#d29922",
      High: "#f85149",
      Critical: "#da3633",
    },
    confidence: {
      High: "#3fb950",
      Medium: "#d29922",
      Low: "#f85149",
    },
  },
  font: {
    family: "'Segoe UI', system-ui, -apple-system, sans-serif",
    sizeH1: "1.8rem",
    sizeH2: "1.15rem",
    sizeBody: "0.9rem",
    sizeSmall: "0.8rem",
  },
  radius: "10px",
};

export function severityColor(level) {
  return theme.colors.severity[level] || theme.colors.textMuted;
}

export function confidenceColor(level) {
  return theme.colors.confidence[level] || theme.colors.textMuted;
}

// Reusable style objects — spread these into your components' style props.
export const styles = {
  page: {
    background: theme.colors.bg,
    minHeight: "100vh",
    color: theme.colors.textPrimary,
    padding: "2rem",
    fontFamily: theme.font.family,
  },
  h1: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeH1,
    fontWeight: 800,
    marginBottom: "0.5rem",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeBody,
    marginBottom: "1.5rem",
  },
  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius,
    padding: "1.25rem",
  },
  cardLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSmall,
    marginBottom: "0.4rem",
  },
  select: {
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: theme.font.sizeBody,
  },
  th: {
    textAlign: "left",
    color: theme.colors.textMuted,
    borderBottom: `1px solid ${theme.colors.border}`,
    padding: "0.5rem",
  },
  td: {
    padding: "0.5rem",
    borderBottom: `1px solid ${theme.colors.borderSubtle}`,
  },
  badge: (color) => ({
    display: "inline-block",
    color,
    border: `1px solid ${color}`,
    background: `${color}14`,
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: theme.font.sizeSmall,
    fontWeight: 700,
  }),
};