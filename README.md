# 3D Print Management

Spreadsheet-driven 3D-print management app (Angular + FastAPI).

## Quick start (local, persistent SQLite)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload     # data is persisted in backend/3d_print.db

# Frontend (in another terminal)
cd frontend
npm install
npm start                      # http://localhost:4200
```

Every printer, filament, spool, setting and print job you register is
saved to `backend/3d_print.db` and will still be there the next time
you launch the app.

## Optional: Postgres via Docker

```bash
docker compose up -d
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/3d_print \
  uvicorn main:app --reload
```

See `CHANGES.md` for the full list of changes and the v2 fixes.
