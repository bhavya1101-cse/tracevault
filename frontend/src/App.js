import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
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
      <nav style={{ background: "#161b22", padding: "1rem 2rem", display: "flex", gap: "1.5rem" }}>
        <Link to="/" style={{ color: "#58a6ff" }}>Dashboard</Link>
        <Link to="/evidence" style={{ color: "#58a6ff" }}>Email Ingestion</Link>
        <Link to="/headers" style={{ color: "#58a6ff" }}>Header & Auth Analysis</Link>
        <Link to="/geo" style={{ color: "#58a6ff" }}>GeoLocation Trace</Link>
        <Link to="/assets" style={{ color: "#58a6ff" }}>Case Reports</Link>
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