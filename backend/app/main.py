from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import highlight, notes, peek, checkpoint
from app.db.database import init_db
from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"--- STARTING STUDYHELPER BACKEND ---")
    print(f"LOADED KEY IN SETTINGS: '{settings.OPENROUTER_API_KEY[:20]}...'")
    print(f"MOCK MODE IS: {settings.USE_MOCK}")
    await init_db()   # creates tables on startup (idempotent)
    yield


app = FastAPI(
    title="StudyHelper API",
    description="Flow-state reading system for competitive exam students.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(highlight.router)
app.include_router(notes.router)
app.include_router(peek.router)
app.include_router(checkpoint.router)


@app.get("/")
async def root():
    return {
        "app": "studyhelper",
        "version": "0.2.0",
        "mock_mode": settings.USE_MOCK,
        "docs": "/docs",
    }
