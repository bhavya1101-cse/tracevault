import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EvidenceTable from "./components/EvidenceTable";
import Timeline from "./pages/Timeline";
import NetworkGraph from "./pages/NetworkGraph";

function App() {
  return (
    <BrowserRouter>
      <nav style={{ background: "#161b22", padding: "1rem 2rem", display: "flex", gap: "1.5rem" }}>
        <Link to="/" style={{ color: "#58a6ff", textDecoration: "none" }}>Dashboard</Link>
        <Link to="/evidence" style={{ color: "#58a6ff", textDecoration: "none" }}>Evidence Collection</Link>
        <Link to="/timeline" style={{ color: "#58a6ff", textDecoration: "none" }}>Timeline</Link>
        <Link to="/network" style={{ color: "#58a6ff", textDecoration: "none" }}>Network Graph</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/evidence" element={<EvidenceTable />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/network" element={<NetworkGraph />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;