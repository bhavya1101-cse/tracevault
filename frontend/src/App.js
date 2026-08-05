import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(`Backend says: ${data.status}`))
      .catch(() => setStatus("Backend not reachable"));
  }, []);

  return (
    <div style={{ background: "#0d1117", color: "#58a6ff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontSize: "1.5rem" }}>
      Cyber Black Box — {status}
    </div>
  );
}

export default App;