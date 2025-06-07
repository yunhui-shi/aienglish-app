# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # <--- Added import for CORSMiddleware
import os
from pathlib import Path

from .db import engine, Base, get_db
from .models import user_model, sentence_model, question_model, user_answer_model, user_vocab_model, user_mistake_model
from .routers import auth_router, practice_router, vocab_router, mistakes_router, monitor_router
from .services import practice_service

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="英语长句理解训练系统 API",
    description="提供英语长句练习、生词本、错题记录等功能的 API 服务。",
    version="0.1.0",
)

# Initialize cache monitoring on startup
@app.on_event("startup")
async def startup_event():
    """Initialize cache pool and start cache monitoring on application startup."""
    print("[Application] Starting cache initialization...")
    practice_service._start_cache_monitor()
    # practice_service._initialize_cache_pool() # Removed: Cache pool is now initialized per user on first request
    print("[Application] Cache system initialized (monitor started, pool per-user)")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up cache monitoring on application shutdown."""
    print("[Application] Shutting down cache monitor...")
    practice_service._stop_cache_monitor()
    print("[Application] Cache monitor stopped")

# CORS Configuration
origins = [
    "http://localhost:3000",  # Next.js frontend development server
    "http://127.0.0.1:3000", # Also for Next.js
    "https://www.u2663302.nyat.app:60958"
    # "*", # Removed wildcard when allow_credentials=True, as it's not allowed by browsers
    # Add any other specific origins if needed (e.g., deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(auth_router)
app.include_router(practice_router)
app.include_router(vocab_router)
app.include_router(mistakes_router)
app.include_router(monitor_router)

# Load all saved queues on startup
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "欢迎使用英语长句理解训练系统 API!"}

# TODO: Add routers for different modules (auth, practice, vocab, mistakes, dictionary)