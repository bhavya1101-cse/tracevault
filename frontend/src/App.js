import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { styles } from "./theme";
import Dashboard from "./pages/Dashboard";
import EvidenceTable from "./components/EvidenceTable";
import Timeline from "./pages/Timeline";
import NetworkGraph from "./pages/NetworkGraph";
import CompromisedAssets from "./pages/CompromisedAssets";
import GeoTrace from "./pages/GeoTrace";
import HeaderAuth from "./pages/HeaderAuth";
import History from "./pages/History";

function App() {
  return (
    <BrowserRouter>
      <nav style={styles.nav}>
        <Link to="/" style={styles.navLink}>Dashboard</Link>
        <Link to="/evidence" style={styles.navLink}>Email Ingestion</Link>
        <Link to="/headers" style={styles.navLink}>Header & Auth Analysis</Link>
        <Link to="/geo" style={styles.navLink}>GeoLocation Trace</Link>
        <Link to="/timeline" style={styles.navLink}>Timeline</Link>
        <Link to="/network" style={styles.navLink}>Network Graph</Link>
        <Link to="/assets" style={styles.navLink}>Case Reports</Link>
        <Link to="/history" style={styles.navLink}>History</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/evidence" element={<EvidenceTable />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/network" element={<NetworkGraph />} />
        <Route path="/assets" element={<CompromisedAssets />} />
        <Route path="/geo" element={<GeoTrace />} />
        <Route path="/headers" element={<HeaderAuth />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;