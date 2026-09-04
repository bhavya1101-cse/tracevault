// TraceVault shared design tokens.
// A lightweight, dependency-free "design system" — import these into every
// page instead of hardcoding colors/spacing, so the whole app stays visually
// consistent as more pages get added. No new npm packages required.

export const theme = {
  colors: {
    bg: "#f8f5f2",
    surface: "#ffffff",
    surfaceAlt: "#f3eee8",
    border: "#e6ddd3",
    borderSubtle: "#efe8df",

    primary: "#c17a5a",
    primaryHover: "#a8664a",
    primarySoft: "#f2e0d6",

    accent: "#8fb8a8",
    accentSoft: "#e6f0ec",

    textPrimary: "#4a3f38",
    textMuted: "#9c8d80",
    textOnPrimary: "#ffffff",

    severity: {
      Low: "#8bbf9f",
      Medium: "#e0ad63",
      High: "#e08a7d",
      Critical: "#d1685c",
    },
    confidence: {
      High: "#8bbf9f",
      Medium: "#e0ad63",
      Low: "#e08a7d",
    },
    status: {
      success: "#8bbf9f",
      warning: "#e0ad63",
      error: "#e08a7d",
      info: "#8ac4d0",
    },
  },
  font: {
    family: "'Segoe UI', system-ui, -apple-system, sans-serif",
    mono: "'Consolas', 'Courier New', monospace",
    sizeH1: "1.8rem",
    sizeH2: "1.15rem",
    sizeBody: "0.9rem",
    sizeSmall: "0.8rem",
    sizeXSmall: "0.7rem",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    pill: "999px",
  },
  shadow: {
    card: "0 1px 3px rgba(74, 63, 56, 0.08), 0 1px 2px rgba(74, 63, 56, 0.05)",
    hover: "0 4px 14px rgba(74, 63, 56, 0.12)",
  },
  spacing: (n) => `${n * 0.25}rem`,
};

export function severityColor(level) {
  return theme.colors.severity[level] || theme.colors.textMuted;
}

export function confidenceColor(level) {
  return theme.colors.confidence[level] || theme.colors.textMuted;
}

// Reusable style objects — spread these into your components' style props.
export const styles = {
  // Layout
  page: {
    background: theme.colors.bg,
    minHeight: "100vh",
    color: theme.colors.textPrimary,
    padding: "2rem",
    fontFamily: theme.font.family,
    boxSizing: "border-box",
  },
  nav: {
    background: theme.colors.surface,
    padding: "1rem 2rem",
    display: "flex",
    gap: "1.5rem",
    alignItems: "center",
    borderBottom: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadow.card,
  },
  navLink: {
    color: theme.colors.primary,
    fontWeight: 600,
    fontSize: theme.font.sizeBody,
    textDecoration: "none",
  },
  navLinkActive: {
    color: theme.colors.textOnPrimary,
    background: theme.colors.primary,
    padding: "0.35rem 0.85rem",
    borderRadius: theme.radius.pill,
    fontWeight: 600,
    fontSize: theme.font.sizeBody,
    textDecoration: "none",
  },

  // Text
  h1: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeH1,
    fontWeight: 800,
    marginBottom: "0.5rem",
  },
  h2: {
    color: theme.colors.textPrimary,
    fontSize: theme.font.sizeH2,
    fontWeight: 700,
    marginBottom: "0.75rem",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeBody,
    marginBottom: "1.5rem",
  },
  mutedText: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSmall,
  },
  monoText: {
    fontFamily: theme.font.mono,
    fontSize: theme.font.sizeSmall,
    color: theme.colors.textPrimary,
  },

  // Cards
  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: "1.25rem",
    boxShadow: theme.shadow.card,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  cardLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.font.sizeSmall,
    marginBottom: "0.4rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  cardValue: {
    color: theme.colors.textPrimary,
    fontSize: "1.4rem",
    fontWeight: 800,
  },

  // Buttons
  button: {
    fontFamily: "inherit",
    fontSize: theme.font.sizeBody,
    fontWeight: 600,
    background: theme.colors.primary,
    color: theme.colors.textOnPrimary,
    border: "none",
    borderRadius: theme.radius.sm,
    padding: "0.55rem 1.1rem",
    cursor: "pointer",
    transition: "background-color 0.15s ease, transform 0.05s ease",
  },
  buttonSecondary: {
    fontFamily: "inherit",
    fontSize: theme.font.sizeBody,
    fontWeight: 600,
    background: theme.colors.surface,
    color: theme.colors.primary,
    border: `1px solid ${theme.colors.primary}`,
    borderRadius: theme.radius.sm,
    padding: "0.55rem 1.1rem",
    cursor: "pointer",
  },
  buttonGhost: {
    fontFamily: "inherit",
    fontSize: theme.font.sizeBody,
    fontWeight: 600,
    background: "transparent",
    color: theme.colors.textMuted,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: "0.55rem 1.1rem",
    cursor: "pointer",
  },
  buttonDisabled: {
    background: theme.colors.borderSubtle,
    color: theme.colors.textMuted,
    cursor: "not-allowed",
  },

  // Form controls
  input: {
    fontFamily: "inherit",
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: "0.55rem 0.8rem",
    fontSize: theme.font.sizeBody,
  },
  textarea: {
    fontFamily: theme.font.mono,
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: "0.75rem",
    fontSize: theme.font.sizeSmall,
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
  },
  select: {
    background: theme.colors.surface,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: "0.5rem 0.75rem",
    fontSize: theme.font.sizeBody,
  },

  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: theme.font.sizeBody,
    background: theme.colors.surface,
  },
  th: {
    textAlign: "left",
    color: theme.colors.textMuted,
    borderBottom: `2px solid ${theme.colors.border}`,
    padding: "0.6rem 0.75rem",
    fontSize: theme.font.sizeSmall,
    textTransform: "uppercase",
    letterSpacing: "0.02em",
  },
  td: {
    padding: "0.6rem 0.75rem",
    borderBottom: `1px solid ${theme.colors.borderSubtle}`,
  },

  // Badges / pills
  badge: (color) => ({
    display: "inline-block",
    color,
    border: `1px solid ${color}`,
    background: `${color}1a`,
    borderRadius: theme.radius.pill,
    padding: "3px 10px",
    fontSize: theme.font.sizeSmall,
    fontWeight: 700,
  }),

  // States
  emptyState: {
    textAlign: "center",
    color: theme.colors.textMuted,
    padding: "3rem 1rem",
    fontSize: theme.font.sizeBody,
  },
  divider: {
    border: "none",
    borderTop: `1px solid ${theme.colors.border}`,
    margin: "1.5rem 0",
  },
};