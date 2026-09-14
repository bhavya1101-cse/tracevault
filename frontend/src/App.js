import { useEffect, useState } from "react";
import { styles, theme } from "./theme";
import { API_URL } from "./api_v2";
import Dashboard from "./pages/Dashboard";
import EvidenceTable from "./components/EvidenceTable";
import Timeline from "./pages/Timeline";
import NetworkGraph from "./pages/NetworkGraph";
import CompromisedAssets from "./pages/CompromisedAssets";
import GeoTrace from "./pages/GeoTrace";
import HeaderAuth from "./pages/HeaderAuth";
import History from "./pages/History";

function useBackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/health`)
      .then((res) => {
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

const sectionStyle = {
  scrollMarginTop: "80px",
  borderTop: `1px solid ${theme.colors.border}`,
};

function App() {
  const backendStatus = useBackendStatus();
  const statusLabel = { online: "System Online", offline: "Waking Up...", checking: "Checking..." }[backendStatus];

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={styles.appShell}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoWrap}>
            <div style={styles.logoMark}>🛡</div>
            <div>
              <div style={styles.logoText}>TraceVault</div>
              <div style={styles.logoSub}>Email Threat Intelligence</div>
            </div>
          </div>

          <nav style={styles.nav}>
            <a href="#dashboard" onClick={(e) => scrollToSection(e, "dashboard")} style={styles.navLink(false)}>Dashboard</a>
            <a href="#evidence" onClick={(e) => scrollToSection(e, "evidence")} style={styles.navLink(false)}>Email Ingestion</a>
            <a href="#headers" onClick={(e) => scrollToSection(e, "headers")} style={styles.navLink(false)}>Header & Auth</a>
            <a href="#geo" onClick={(e) => scrollToSection(e, "geo")} style={styles.navLink(false)}>GeoLocation</a>
            <a href="#timeline" onClick={(e) => scrollToSection(e, "timeline")} style={styles.navLink(false)}>Timeline</a>
            <a href="#network" onClick={(e) => scrollToSection(e, "network")} style={styles.navLink(false)}>Network Graph</a>
            <a href="#assets" onClick={(e) => scrollToSection(e, "assets")} style={styles.navLink(false)}>Case Reports</a>
            <a href="#history" onClick={(e) => scrollToSection(e, "history")} style={styles.navLink(false)}>History</a>
          </nav>

          <div style={styles.statusPill(backendStatus)}>
            <span style={styles.statusDot(backendStatus)} />
            {statusLabel}
          </div>
        </div>
      </header>

      <section id="dashboard" style={{ scrollMarginTop: "80px" }}>
        <Dashboard />
      </section>

      <section id="evidence" style={sectionStyle}>
        <EvidenceTable />
      </section>

      <section id="headers" style={sectionStyle}>
        <HeaderAuth />
      </section>

      <section id="geo" style={sectionStyle}>
        <GeoTrace />
      </section>

      <section id="timeline" style={sectionStyle}>
        <Timeline />
      </section>

      <section id="network" style={sectionStyle}>
        <NetworkGraph />
      </section>

      <section id="assets" style={sectionStyle}>
        <CompromisedAssets />
      </section>

      <section id="history" style={sectionStyle}>
        <History />
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <div style={{ ...styles.logoText, fontSize: "0.95rem" }}>TraceVault</div>
            <div style={styles.footerText}>
              Built for Smart India Hackathon 2026 · Problem Statement SIH26106
            </div>
          </div>
          <div style={styles.footerLinks}>
            
              <a href="https://github.com/bhavya1101-cse/tracevault"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.footerLink}
            >
              GitHub
            </a>
            <span style={styles.footerText}>Team HEADWATERS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;