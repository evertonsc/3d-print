"""
Database connection — SQLite only.

Data lives in `backend/3d_print.db` and persists across application
restarts. No external database engine is required.
"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve a stable path next to this file so CWD changes don't fragment the DB.
SQLITE_PATH = Path(__file__).resolve().parent / "3d_print.db"
DATABASE_URL = f"sqlite:///{SQLITE_PATH}"

# Allow FastAPI threadpool workers to reuse the same connection.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    future=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
