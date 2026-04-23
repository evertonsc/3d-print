"""
Database connection.

Defaults to a **local SQLite file** so that data persists across application
restarts without requiring Docker or Postgres. When running with the bundled
`docker-compose.yml`, override the URL with the `DATABASE_URL` env var, e.g.:

    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/3d_print

The SQLite file lives next to the backend code (`backend/3d_print.db`) so it
survives `uvicorn` reloads and re-launches.
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Resolve a stable path next to this file so CWD changes don't fragment the DB.
_DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent / "3d_print.db"
_DEFAULT_SQLITE_URL = f"sqlite:///{_DEFAULT_SQLITE_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE_URL)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    # Allow FastAPI threadpool workers to reuse the same connection.
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
