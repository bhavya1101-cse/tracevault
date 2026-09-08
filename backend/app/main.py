from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import evidence
from app.routes import extension_preview

app = FastAPI(title="TraceVault")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://tracevault.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evidence.router)
app.include_router(extension_preview.router)


@app.get("/")
def read_root():
    return {"status": "online", "service": "TraceVault API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}