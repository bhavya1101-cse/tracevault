from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import evidence

app = FastAPI(title="Cyber Black Box API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://cyber-black-box.vercel.app/",  # replace with your actual Vercel URL once you have it
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(evidence.router)


@app.get("/")
def read_root():
    return {"status": "online", "service": "Cyber Black Box API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}