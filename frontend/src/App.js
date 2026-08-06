import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EvidenceTable from "./components/EvidenceTable";

function App() {
  return (
    <BrowserRouter>
      <nav style={{ background: "#161b22", padding: "1rem 2rem", display: "flex", gap: "1.5rem" }}>
        <Link to="/" style={{ color: "#58a6ff", textDecoration: "none" }}>Dashboard</Link>
        <Link to="/evidence" style={{ color: "#58a6ff", textDecoration: "none" }}>Evidence Collection</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/evidence" element={<EvidenceTable />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;