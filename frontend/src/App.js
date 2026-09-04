import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { theme, styles } from "./theme";
import Dashboard from "./pages/Dashboard";
import EvidenceTable from "./components/EvidenceTable";
import Timeline from "./pages/Timeline";
import NetworkGraph from "./pages/NetworkGraph";
import CompromisedAssets from "./pages/CompromisedAssets";
import GeoTrace from "./pages/GeoTrace";
import HeaderAuth from "./pages/HeaderAuth";

function App() {
  return (
    <BrowserRouter>
      <nav style={styles.nav}>
        <Link to="/" style={styles.navLink}>Dashboard</Link>
        <Link to="/evidence" style={styles.navLink}>Email Ingestion</Link>
        <Link to="/headers" style={styles.navLink}>Header & Auth Analysis</Link>
        <Link to="/geo" style={styles.navLink}>GeoLocation Trace</Link>
        <Link to="/assets" style={styles.navLink}>Case Reports</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/evidence" element={<EvidenceTable />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/network" element={<NetworkGraph />} />
        <Route path="/assets" element={<CompromisedAssets />} />
        <Route path="/geo" element={<GeoTrace />} />
        <Route path="/headers" element={<HeaderAuth />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;