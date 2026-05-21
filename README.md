# Content Management Hub

Standalone **frontend** and **backend** apps for separate deployment (e.g. `app.example.com` + `api.example.com`).

| App | Folder | Docs |
|-----|--------|------|
| React UI (Vite) | [`frontend/`](frontend/) | [frontend/README.md](frontend/README.md) |
| Express API | [`backend/`](backend/) | [backend/README.md](backend/README.md) |

## Quick start (local)

```powershell
cd backend
copy .env.example .env
npm install
npm run dev

# New terminal
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — API at http://localhost:8080.

See [LOCAL_RUNNING.md](LOCAL_RUNNING.md) for seeds, builds, and deployment notes.
