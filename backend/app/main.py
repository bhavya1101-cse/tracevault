from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from app.routes import evidence

app = FastAPI(title="TraceVault")

from fastapi.middleware.cors import CORSMiddleware
import re

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://tracevault.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evidence.router)


@app.get("/")
def read_root():
    return {"status": "online", "service": "TraceVault API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}