from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cyber Black Box API")

# This is the permission slip we're giving to React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """Health check endpoint - confirms the API is alive."""
    return {"status": "online", "service": "Cyber Black Box API"}

@app.get("/api/health")
def health_check():
    """Used later by the frontend/monitoring to verify backend is reachable."""
    return {"status": "ok"}